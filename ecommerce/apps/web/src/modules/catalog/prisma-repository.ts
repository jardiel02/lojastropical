import "server-only";
import type { CatalogSnapshot } from "@lojas-tropical/shared";
import { getPrisma, loadCatalogFromDatabase } from "@lojas-tropical/database";
import { createSnapshotRepository } from "./snapshot-repository";
import { staticSnapshot } from "./static-repository";

const TTL_MS = 60_000;
let cache: { at: number; data: CatalogSnapshot } | null = null;
let inflight: Promise<CatalogSnapshot> | null = null;

/**
 * Catálogo do PostgreSQL, lido inteiro e guardado por 1 minuto por processo.
 * Se o banco falhar, usa a última leitura boa; sem nenhuma, o erro aparece (nunca mostra
 * preços de outra fonte em silêncio).
 */
async function databaseSnapshot(): Promise<CatalogSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  inflight ??= loadCatalogFromDatabase(getPrisma(), staticSnapshot().company)
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .catch((error: unknown) => {
      if (cache) {
        console.error("Catálogo: falha ao ler o banco, usando a última leitura", error);
        return cache.data;
      }
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const prismaCatalogRepository = createSnapshotRepository(databaseSnapshot);
