// Copia as fotos do site original (pasta img/ na raiz do repositório) para public/img.
// Enquanto as imagens não migram para o armazenamento definitivo (Cloudinary ou S3),
// o site original continua sendo a fonte das fotos, sem duplicar arquivos no Git.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../../../img");
const target = resolve(here, "../public/img");

if (!existsSync(source)) {
  console.warn(`[sync-images] Pasta de fotos do site original não encontrada em ${source}`);
  process.exit(0);
}
mkdirSync(target, { recursive: true });
let copied = 0;
for (const name of readdirSync(source)) {
  const from = join(source, name);
  const to = join(target, name);
  const s = statSync(from);
  if (!s.isFile()) continue;
  if (existsSync(to) && statSync(to).size === s.size) continue;
  cpSync(from, to);
  copied++;
}
console.log(`[sync-images] ${copied} foto(s) copiada(s) para public/img`);
