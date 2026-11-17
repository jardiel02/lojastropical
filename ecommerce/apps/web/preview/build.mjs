/**
 * Gera a prévia navegável da loja em preview/out/: uma página (index.html, com CSS e JS
 * embutidos) e as fotos otimizadas em WebP. Não precisa de servidor nem de banco.
 *
 *   pnpm --filter @lojas-tropical/web preview:build
 */
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import sharp from "sharp";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const legacyImg = resolve(web, "../../../img");
const out = join(here, "out");
const cache = join(here, ".cache");
process.chdir(web); // as políticas são lidas a partir da raiz do app

const shim = (file) => join(here, "shims", file);
const ALIASES = {
  "server-only": shim("empty.ts"),
  "next/link": shim("next-link.tsx"),
  "next/image": shim("next-image.tsx"),
  "next/navigation": shim("next-navigation.ts"),
  "@/modules/legal": shim("legal.ts"),
  "@/modules/instagram": shim("instagram.ts"),
  "@/components/layout/legacy-hash-redirect": shim("legacy-hash-redirect.tsx"),
  "@lojas-tropical/database": shim("database.ts"),
};
const aliasPlugin = (names) => ({
  name: "previa-aliases",
  setup(b) {
    const filter = new RegExp(`^(${names.map((n) => n.replace(/[/.@-]/g, "\\$&")).join("|")})$`);
    b.onResolve({ filter }, (args) => ({ path: ALIASES[args.path] }));
  },
});

// 1. Dados de servidor: políticas (do site original) e feed do Instagram
await mkdir(cache, { recursive: true });
await build({
  entryPoints: [join(here, "snapshot.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(cache, "snapshot.mjs"),
  plugins: [aliasPlugin(["server-only"])],
  logLevel: "warning",
});
const { collect } = await import(`${pathToFileURL(join(cache, "snapshot.mjs")).href}?t=${Date.now()}`);
const data = { builtAt: new Date().toISOString(), ...(await collect()) };

// 2. Fotos: as que o catálogo e o código usam, em WebP
await mkdir(join(out, "img"), { recursive: true });
await mkdir(join(out, "ig"), { recursive: true });
const catalogJson = JSON.parse(await readFile(join(web, "../../packages/database/data/legacy-catalog.json"), "utf8"));
const images = new Set();
for (const p of catalogJson.products) {
  p.images.forEach((i) => images.add(i));
  p.colors.forEach((c) => c.image && images.add(c.image));
}
catalogJson.brands.forEach((b) => b.logo && images.add(b.logo));
for (const html of Object.values(data.legal).map((l) => l.html)) for (const m of html.matchAll(/src="\/img\/([^"]+)"/g)) images.add(m[1]);

// 3. Código: as mesmas páginas de src/app, no navegador
const bundle = await build({
  entryPoints: [join(here, "entry.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: ["chrome111", "safari16.4", "firefox115"],
  minify: true,
  jsx: "automatic",
  legalComments: "none",
  tsconfig: join(web, "tsconfig.json"),
  plugins: [aliasPlugin(Object.keys(ALIASES))],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_SITE_URL": JSON.stringify("https://jardiel02.github.io/lojastropical"),
    "process.env.NEXT_PUBLIC_ALLOW_INDEXING": '"false"',
    "window.location.search": "globalThis.__previewSearch",
  },
  banner: { js: "var process=globalThis.process||{env:{}};" },
  logLevel: "warning",
});
let js = bundle.outputFiles[0].text;
for (const m of js.matchAll(/["'`]\/img\/([A-Za-z0-9._-]+)["'`]/g)) images.add(m[1]);

const MAX_WIDTH = (file) => (file.startsWith("banner") ? 1920 : /logo|icone/.test(file) ? 600 : 1000);
const webpName = (file) => (/\.svg$/i.test(file) ? file : file.replace(/\.[a-z0-9]+$/i, "") + ".webp");
const queue = [...images];
let converted = 0;
const missing = [];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const src = join(legacyImg, file);
      const dest = join(out, "img", webpName(file));
      if (!existsSync(src)) {
        missing.push(file);
        continue;
      }
      if (existsSync(dest) && (await stat(dest)).mtimeMs >= (await stat(src)).mtimeMs) continue;
      await mkdir(dirname(dest), { recursive: true });
      if (/\.svg$/i.test(file)) await writeFile(dest, await readFile(src));
      else await sharp(src).rotate().resize({ width: MAX_WIDTH(file), withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
      converted++;
    }
  }),
);
if (missing.length) console.warn(`Fotos não encontradas em img/: ${missing.join(", ")}`);

// Instagram: as fotos vêm de outro site, que a prévia não pode carregar; ficam copiadas aqui
if (data.instagram) {
  try {
    const save = async (url, name) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(out, "ig", name));
      return `ig/${name}`;
    };
    await rm(join(out, "ig"), { recursive: true, force: true });
    await mkdir(join(out, "ig"), { recursive: true });
    const posts = [];
    for (const [i, p] of data.instagram.posts.entries()) posts.push({ ...p, image: await save(p.image, `post-${i + 1}.webp`) });
    const picture = data.instagram.picture ? await save(data.instagram.picture, "perfil.webp").catch(() => null) : null;
    data.instagram = { ...data.instagram, posts, picture };
  } catch (e) {
    console.warn(`Instagram fora da prévia: ${e.message}`);
    data.instagram = null;
  }
}

// 4. CSS do Tailwind com as mesmas classes do site
const cssFile = join(web, "src/app/globals.css");
const css = (await postcss([tailwind({ base: web, optimize: { minify: true } })]).process(await readFile(cssFile, "utf8"), { from: cssFile })).css;

// 5. Página única
const safe = (s) => s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
js = `var __PREVIEW_DATA__=${safe(JSON.stringify(data))};\n${safe(js)}`;
const built = new Date(data.builtAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const html = `<title>Prévia Lojas Tropical</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap">
<style>${css}</style>
<style>
:root { --font-poppins: "Poppins"; --font-inter: "Inter"; }
body { margin: 0; font-size: 16px; }
.previa { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 10px; padding: 8px 16px; background: var(--fg); color: var(--bg); font: 600 13px/1.4 var(--font-sans); text-align: center; }
.previa b { color: var(--sun); }
.previa-carregando { display: grid; place-items: center; min-height: 60vh; color: var(--muted); font-family: var(--font-sans); }
</style>
<div class="previa" role="note"><b>Prévia da nova loja</b><span>Gerada em ${built}. O site no ar continua o mesmo. Compras seguem pelo WhatsApp.</span></div>
<div id="app"><p class="previa-carregando">Carregando a prévia…</p></div>
<script>${js}</script>
`;
await writeFile(join(out, "index.html"), html);
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`Prévia em ${out}: index.html ${kb(Buffer.byteLength(html))}, ${images.size} fotos (${converted} convertidas agora)`);
