// Extrai os dados do site original (index.html, estoque.js e legal.js na raiz do repositório)
// para um JSON validado que alimenta a nova vitrine e o seed do banco.
// Não altera nenhum arquivo do site original.
//
// Uso: pnpm legacy:extract
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const outFile = join(here, "../data/legacy-catalog.json");

const html = readFileSync(join(repoRoot, "index.html"), "utf8");
const estoqueJs = readFileSync(join(repoRoot, "estoque.js"), "utf8");
const legalJs = readFileSync(join(repoRoot, "legal.js"), "utf8");

function slice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Trecho não encontrado: ${startMarker} … ${endMarker}`);
  return source.slice(start, end);
}

// 1) Dados do catálogo: do início do bloco de dados até a junção com o estoque
const dataBlock = slice(html, "const WHATSAPP =", "const EST =");
// 2) Definições usadas pelo menu e pelas cores
const subgroups = slice(html, "const SUBGRUPOS =", "const subsDe");
const colorHex = slice(html, "const COR_HEX =", "function corCss");
const brands = slice(html, "const MARCAS =", "function escolherMarca");
const empresa = slice(legalJs, "const EMPRESA =", "// ===== 2)");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${estoqueJs}\n${dataBlock}\n${subgroups}\n${colorHex}\n${brands}\n${empresa}\n` +
    "globalThis.__out = { ESTOQUE, WHATSAPP, WHATSAPP_TEXTO, LOJAS, CATEGORIAS, PRODUTOS, FICHAS, SUBGRUPOS, COR_HEX, MARCAS, LOGO_MARCA, EMPRESA };",
  sandbox,
);
const L = sandbox.__out;

const slugify = (t) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toCents = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null);
const stock = L.ESTOQUE?.produtos ?? {};
const hasStock = Object.keys(stock).length > 0;

const products = L.PRODUTOS.map((p) => {
  const ficha = L.FICHAS[p.cod || p.id] ?? {};
  const { Código: _codigo, ...ownSpecs } = p.detalhes ?? {};
  const specs = Object.fromEntries(Object.entries(ficha.detalhes ?? ownSpecs).map(([k, v]) => [k, String(v)]));
  const erp = p.cod ? stock[p.cod] : undefined;
  const manualCash = toCents(p.avista);
  const manualInstallment = toCents(p.parcela);
  // Mesma regra do site original: preço digitado vale; sem preço digitado, usa o do relatório/ERP.
  const cashPriceCents = manualCash ?? (!manualInstallment && erp ? toCents(erp.preco) : null);
  return {
    slug: p.id,
    erpCode: p.cod ?? null,
    name: p.nome,
    brand: p.marca,
    category: p.cat,
    shortDescription: p.desc ?? "",
    description: ficha.texto ?? p.texto ?? null,
    highlights: ficha.destaques ?? p.destaques ?? [],
    specs,
    images: p.imgs,
    coverFit: p.capa ? "cover" : "contain",
    colors: (p.cores ?? []).map(([name, image]) => ({ name, image })),
    cashPriceCents,
    manualInstallmentCents: manualInstallment,
    // Fora do relatório de estoque = esgotado (regra do site original)
    stockQuantity: p.cod && hasStock ? (erp ? erp.qtd : 0) : null,
  };
});

const usedCategories = new Set(products.map((p) => p.category));
const snapshot = {
  generatedAt: new Date().toISOString(),
  stockUpdatedAt: L.ESTOQUE?.atualizado ?? null,
  source: "legacy-site",
  categories: L.CATEGORIAS.filter((c) => usedCategories.has(c)).map((name) => ({
    slug: slugify(name),
    name,
    subgroups: (L.SUBGRUPOS[name] ?? []).map(([n, pattern]) => ({ name: n, pattern })),
  })),
  brands: [...new Set([...L.MARCAS, ...products.map((p) => p.brand)])].map((name) => ({
    slug: slugify(name),
    name,
    logo: L.LOGO_MARCA[name] ?? null,
    featured: L.MARCAS.includes(name),
  })),
  colorHex: L.COR_HEX,
  branches: L.LOJAS.map(([name, street, district, city, zipCode]) => ({
    slug: slugify(name),
    name,
    street,
    district,
    city,
    state: "MA",
    zipCode,
  })),
  products,
  company: {
    tradeName: L.EMPRESA.nomeFantasia,
    legalName: L.EMPRESA.razaoSocial,
    cnpj: L.EMPRESA.cnpj,
    stateRegistration: L.EMPRESA.inscricaoEstadual,
    address: L.EMPRESA.endereco,
    phoneDisplay: L.WHATSAPP_TEXTO,
    whatsapp: L.WHATSAPP,
    serviceHours: L.EMPRESA.atendimento,
  },
};

const dupes = products.map((p) => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dupes.length) throw new Error(`Slugs repetidos: ${dupes.join(", ")}`);

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `OK: ${products.length} produtos, ${snapshot.categories.length} departamentos, ${snapshot.brands.length} marcas, ${snapshot.branches.length} lojas (estoque de ${snapshot.stockUpdatedAt ?? "—"})`,
);
