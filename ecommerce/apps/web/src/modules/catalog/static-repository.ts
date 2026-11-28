import "server-only";
import { catalogSnapshotSchema, type CatalogSnapshot } from "@lojas-tropical/shared";
import raw from "@lojas-tropical/database/legacy-catalog.json";
import { createSnapshotRepository } from "./snapshot-repository";

let cached: CatalogSnapshot | null = null;
/** Retrato do site original (JSON). Valida uma vez por processo: um JSON quebrado falha cedo, no build. */
export function staticSnapshot(): CatalogSnapshot {
  cached ??= catalogSnapshotSchema.parse(raw);
  return cached;
}

export const staticCatalogRepository = createSnapshotRepository(async () => staticSnapshot());
