import type { Branch, Brand, CatalogSnapshot, Category, Product } from "@lojas-tropical/shared";
import type { ParsedProductQuery } from "./query";
import type { ProductPage } from "./search";

/**
 * Contrato de acesso ao catálogo. A vitrine só conversa com esta interface.
 * Implementações: StaticCatalogRepository (retrato do site original, hoje) e
 * PrismaCatalogRepository (PostgreSQL, etapa 5).
 */
export interface CatalogRepository {
  listProducts(): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  searchProducts(query: ParsedProductQuery): Promise<ProductPage>;
  listCategories(): Promise<Category[]>;
  getCategory(slug: string): Promise<Category | null>;
  listBrands(): Promise<Brand[]>;
  getBrand(slug: string): Promise<Brand | null>;
  listBranches(): Promise<Branch[]>;
  getCompany(): Promise<CatalogSnapshot["company"]>;
  getColorHex(): Promise<Record<string, string>>;
  getStockUpdatedAt(): Promise<string | null>;
}
