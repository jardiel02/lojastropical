import type { CatalogRepository } from "./repository";
import { prismaCatalogRepository } from "./prisma-repository";
import { staticCatalogRepository } from "./static-repository";

/**
 * Ponto único de troca da fonte de dados. CATALOG_SOURCE=database lê o PostgreSQL;
 * sem ela, a vitrine usa o retrato JSON do site original.
 */
export const catalogSource = process.env.CATALOG_SOURCE === "database" ? "database" : "static";
export const catalog: CatalogRepository = catalogSource === "database" ? prismaCatalogRepository : staticCatalogRepository;

export * from "./query";
export type { ProductPage, BrandFacet } from "./search";
