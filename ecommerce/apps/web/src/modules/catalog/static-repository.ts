import "server-only";
import { catalogSnapshotSchema, type CatalogSnapshot } from "@lojas-tropical/shared";
import raw from "@lojas-tropical/database/legacy-catalog.json";
import type { CatalogRepository } from "./repository";
import { searchProducts } from "./search";

let cached: CatalogSnapshot | null = null;
function snapshot(): CatalogSnapshot {
  // Valida uma vez por processo: um JSON quebrado falha cedo, no build
  cached ??= catalogSnapshotSchema.parse(raw);
  return cached;
}

export const staticCatalogRepository: CatalogRepository = {
  async listProducts() {
    return snapshot().products;
  },
  async getProduct(slug) {
    return snapshot().products.find((p) => p.slug === slug) ?? null;
  },
  async searchProducts(query) {
    const s = snapshot();
    const category = query.categorySlug ? s.categories.find((c) => c.slug === query.categorySlug) : undefined;
    const sub = query.subgroup ? category?.subgroups.find((g) => g.name === query.subgroup) : undefined;
    return searchProducts(s.products, query, sub?.pattern);
  },
  async listCategories() {
    return snapshot().categories;
  },
  async getCategory(slug) {
    return snapshot().categories.find((c) => c.slug === slug) ?? null;
  },
  async listBrands() {
    return snapshot().brands;
  },
  async getBrand(slug) {
    return snapshot().brands.find((b) => b.slug === slug) ?? null;
  },
  async listBranches() {
    return snapshot().branches;
  },
  async getCompany() {
    return snapshot().company;
  },
  async getColorHex() {
    return snapshot().colorHex;
  },
  async getStockUpdatedAt() {
    return snapshot().stockUpdatedAt;
  },
};
