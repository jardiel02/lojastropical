// Compara o catálogo lido do banco com o retrato JSON (deve ser idêntico depois do seed)
import "dotenv/config";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { catalogSnapshotSchema } from "@lojas-tropical/shared";
import { createPrismaClient, loadCatalogFromDatabase } from "../src/index";
const json = catalogSnapshotSchema.parse(JSON.parse(readFileSync(new URL("../data/legacy-catalog.json", import.meta.url), "utf8")));
const prisma = createPrismaClient();
const db = await loadCatalogFromDatabase(prisma, json.company);
await prisma.$disconnect();
let diffs = 0;
for (const key of ["categories", "brands", "branches", "products"] as const) {
  const same = isDeepStrictEqual(db[key], json[key]);
  if (!same) {
    diffs++;
    const a = db[key] as unknown[], b = json[key] as unknown[];
    const i = b.findIndex((x, n) => !isDeepStrictEqual(x, a[n]));
    console.log(`DIFERENTE: ${key} (banco ${a.length}, json ${b.length}) primeiro índice ${i}`, JSON.stringify(a[i])?.slice(0, 400), "\n vs", JSON.stringify(b[i])?.slice(0, 400));
  }
}
const hexOk = Object.entries(db.colorHex).every(([k, v]) => json.colorHex[k] === v);
console.log(diffs ? `${diffs} diferenças` : "Catálogo do banco igual ao JSON", "| cores:", hexOk ? "ok" : "diferentes");
process.exitCode = diffs || !hexOk ? 1 : 0;
