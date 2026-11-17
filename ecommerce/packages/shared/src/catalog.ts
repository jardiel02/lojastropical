import { z } from "zod";

/**
 * Formato do catálogo usado pela vitrine. Hoje ele é gerado a partir do site original
 * (index.html + estoque.js) pelo script `legacy:extract`; na etapa 5 passa a vir do PostgreSQL.
 * Valores monetários sempre em centavos inteiros.
 */
export const colorVariantSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
});

export const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  erpCode: z.string().regex(/^\d+$/).nullable(),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  shortDescription: z.string(),
  description: z.string().nullable(),
  highlights: z.array(z.string()),
  specs: z.record(z.string(), z.string()),
  images: z.array(z.string().min(1)).min(1),
  coverFit: z.enum(["contain", "cover"]),
  colors: z.array(colorVariantSchema),
  /** Preço à vista em centavos (do ERP ou digitado no site original). */
  cashPriceCents: z.number().int().nonnegative().nullable(),
  /** Valor da parcela em 12x digitado manualmente no site original (centavos). */
  manualInstallmentCents: z.number().int().nonnegative().nullable(),
  /** Quantidade disponível no último retrato de estoque. null = sem informação. */
  stockQuantity: z.number().int().nullable(),
});

export const branchSchema = z.object({
  slug: z.string(),
  name: z.string(),
  street: z.string(),
  district: z.string(),
  city: z.string(),
  state: z.literal("MA"),
  zipCode: z.string(),
});

export const subgroupSchema = z.object({ name: z.string(), pattern: z.string() });

export const catalogSnapshotSchema = z.object({
  generatedAt: z.string(),
  stockUpdatedAt: z.string().nullable(),
  source: z.enum(["legacy-site", "database"]),
  categories: z.array(z.object({ slug: z.string(), name: z.string(), subgroups: z.array(subgroupSchema) })),
  brands: z.array(z.object({ slug: z.string(), name: z.string(), logo: z.string().nullable(), featured: z.boolean() })),
  colorHex: z.record(z.string(), z.string()),
  branches: z.array(branchSchema),
  products: z.array(productSchema),
  company: z.object({
    tradeName: z.string(),
    legalName: z.string(),
    cnpj: z.string(),
    stateRegistration: z.string(),
    address: z.string(),
    phoneDisplay: z.string(),
    whatsapp: z.string(),
    serviceHours: z.string(),
  }),
});

export type ColorVariant = z.infer<typeof colorVariantSchema>;
export type Product = z.infer<typeof productSchema>;
export type Branch = z.infer<typeof branchSchema>;
export type CatalogSnapshot = z.infer<typeof catalogSnapshotSchema>;
export type Category = CatalogSnapshot["categories"][number];
export type Brand = CatalogSnapshot["brands"][number];

export function isOutOfStock(p: Pick<Product, "stockQuantity">): boolean {
  return p.stockQuantity !== null && p.stockQuantity <= 0;
}
