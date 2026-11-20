import type { CatalogSnapshot } from "@lojas-tropical/shared";
import type { CatalogRepository } from "./repository";
import { searchProducts } from "./search";

/** Repositório sobre um retrato completo do catálogo (112 produtos cabem com folga na memória). */
export function createSnapshotRepository(snapshot: () => Promise<CatalogSnapshot>): CatalogRepository {
  return {
    async listProducts() {
      return (await snapshot()).products;
    },
    async getProduct(slug) {
      return (await snapshot()).products.find((p) => p.slug === slug) ?? null;
    },
    async searchProducts(query) {
      const s = await snapshot();
      const category = query.categorySlug ? s.categories.find((c) => c.slug === query.categorySlug) : undefined;
      const sub = query.subgroup ? category?.subgroups.find((g) => g.name === query.subgroup) : undefined;
      return searchProducts(s.products, query, sub?.pattern);
    },
    async listCategories() {
      return (await snapshot()).categories;
    },
    async getCategory(slug) {
      return (await snapshot()).categories.find((c) => c.slug === slug) ?? null;
    },
    async listBrands() {
      return (await snapshot()).brands;
    },
    async getBrand(slug) {
      return (await snapshot()).brands.find((b) => b.slug === slug) ?? null;
    },
    async listBranches() {
      return (await snapshot()).branches;
    },
    async getCompany() {
      return (await snapshot()).company;
    },
    async getColorHex() {
      return (await snapshot()).colorHex;
    },
    async getStockUpdatedAt() {
      return (await snapshot()).stockUpdatedAt;
    },
  };
}
