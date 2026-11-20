// Aplica um arquivo .sql no banco de DATABASE_URL (o mesmo leitor de endereço usado pelo Prisma).
//   pnpm --filter @lojas-tropical/database exec tsx scripts/apply-sql.ts ../../supabase/clientes.sql
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) throw new Error("Informe o arquivo .sql");
const url = new URL(process.env.DATABASE_URL ?? "");
url.searchParams.delete("schema"); // parâmetro do Prisma, não do PostgreSQL
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query(readFileSync(resolve(process.cwd(), file), "utf8"));
  console.log(`Aplicado: ${file}`);
} finally {
  await client.end();
}
