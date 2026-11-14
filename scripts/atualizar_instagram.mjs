// Busca os últimos posts do Instagram da loja (via Behold) e gera instagram.js.
// Roda 1x por dia no GitHub Actions; assim o site não gasta as visualizações do plano grátis do Behold.
// Uso local: node scripts/atualizar_instagram.mjs [pasta-de-saida]
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FEED = "https://feeds.behold.so/NozZDJuPxZmzuThXTKHs";
const SAIDA = join(process.argv[2] || ".", "instagram.js");
const MAX_POSTS = 6;

const r = await fetch(FEED, { headers: { "User-Agent": "LojasTropicalSite/1.0" } });
if (!r.ok) throw new Error(`Behold respondeu ${r.status}`);
const feed = await r.json();

const legenda = t => (t || "").replace(/\s+/g, " ").trim().slice(0, 140);
const posts = (feed.posts || []).slice(0, MAX_POSTS).map(p => {
  const img = (p.sizes && (p.sizes.medium || p.sizes.small || p.sizes.large)) || {};
  return {
    link: p.permalink,
    tipo: p.mediaType,                       // IMAGE, VIDEO ou CAROUSEL_ALBUM
    img: img.mediaUrl || p.mediaUrl,
    legenda: legenda(p.prunedCaption || p.caption),
  };
}).filter(p => p.link && p.img);

if (!posts.length) throw new Error("Feed sem posts; mantendo o arquivo anterior");

const dados = {
  usuario: feed.username || "lojastropicaloficial",
  foto: feed.profilePictureUrl || "",
  seguidores: feed.followersCount || null,
  posts,
};
const js = "// Gerado automaticamente do Instagram (Behold). Nao edite a mao.\n" +
  "const INSTAGRAM = " + JSON.stringify(dados) + ";\n";

const anterior = existsSync(SAIDA) ? readFileSync(SAIDA, "utf8") : "";
if (anterior === js) { console.log("Sem mudancas"); process.exit(0); }
writeFileSync(SAIDA, js);
console.log(`instagram.js atualizado: ${posts.length} posts`);
