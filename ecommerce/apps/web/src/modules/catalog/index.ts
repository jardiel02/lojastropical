import { staticCatalogRepository } from "./static-repository";
import type { CatalogRepository } from "./repository";

/** Ponto único de troca da fonte de dados (estático hoje, PostgreSQL na etapa 5). */
export const catalog: CatalogRepository = staticCatalogRepository;

export * from "./query";
export type { ProductPage, BrandFacet } from "./search";
