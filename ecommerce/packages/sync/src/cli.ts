/**
 * Sincroniza estoque (por loja) e preços do Sólidus com o banco. Só LÊ do Sólidus.
 *
 *   DATABASE_URL=...?schema=loja SOLIDUS_TOKEN_MATRIZ=... pnpm --filter @lojas-tropical/sync sync:stock
 *
 * Tokens: SOLIDUS_TOKEN_<LOJA> (um por filial, ver BRANCH_TOKENS). Nenhum token é impresso.
 * Preços: tabela lida com o token da Matriz (o mesmo que o site atual usa).
 */
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { createPrismaClient } from "@lojas-tropical/database";
import { SolidusReadOnlyAdapter } from "@lojas-tropical/erp-adapter";
import { BRANCH_TOKENS } from "./plan";
import { syncStock, type BranchReader } from "./stock-sync";

const baseUrl = process.env.SOLIDUS_API_BASE_URL ?? "https://smart.sgisistemas.com.br/api_produto/tropical/consultas/";
const adapter = (token: string, branchCode?: string) =>
  new SolidusReadOnlyAdapter({ baseUrl, token, branchCode, userAgent: "LojasTropicalEcommerce/1.0", timeoutMs: 60_000 });

const readers: BranchReader[] = [];
const missing: string[] = [];
for (const b of BRANCH_TOKENS) {
  const token = process.env[`SOLIDUS_TOKEN_${b.code}`]?.trim();
  if (token) readers.push({ slug: b.slug, code: b.code, adapter: adapter(token, b.code) });
  else missing.push(b.code);
}
if (!readers.length) {
  console.error("Nenhum segredo SOLIDUS_TOKEN_<LOJA> configurado");
  process.exit(1);
}
const priceToken = (process.env.SOLIDUS_TOKEN_MATRIZ ?? process.env.SOLIDUS_TOKEN)?.trim();

const prisma = createPrismaClient();
try {
  const r = await syncStock(prisma, {
    branches: readers,
    prices: priceToken ? adapter(priceToken) : null,
    triggeredBy: process.env.GITHUB_EVENT_NAME ?? "manual",
    log: (l) => console.log(l),
  });
  const brl = new Intl.NumberFormat("pt-BR");
  const lines = [
    `## Estoque do Sólidus → banco (${r.status})`,
    "",
    "| Loja | Produtos lidos | Falhas | Unidades |",
    "|---|---|---|---|",
    ...r.branches.map((b) => `| ${b.code} | ${b.read} de ${r.products} | ${b.error ?? b.failed} | ${brl.format(b.units)} |`),
    ...missing.map((code) => `| ${code} | segredo SOLIDUS_TOKEN_${code} não cadastrado | | |`),
    "",
    `- Saldos gravados nesta execução (só os que mudaram): ${r.snapshotsWritten}`,
    r.usedPrevious ? `- Produtos que usaram o último saldo de uma loja que não respondeu: ${r.usedPrevious}` : "",
    r.unknown ? `- Produtos sem leitura de nenhuma loja (ficaram como estavam): ${r.unknown}` : "",
    r.prices
      ? `- Preços: ${r.prices.checked} conferidos, ${r.prices.changed} mudaram, ${r.prices.withoutPrice} sem preço válido no ERP, ${r.prices.failed} falhas`
      : "- Preços: não conferidos (falta o token da Matriz)",
  ].filter((l) => l !== "");
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (r.status === "FAILED") process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
