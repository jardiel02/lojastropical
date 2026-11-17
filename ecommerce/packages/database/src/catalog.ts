import { catalogSnapshotSchema, type CatalogSnapshot } from "@lojas-tropical/shared";
import type { PrismaClient } from "./generated/prisma/client";

const fromImg = (url: string) => url.replace(/^\/img\//, "");

/**
 * Lê o catálogo publicado do PostgreSQL no mesmo formato usado pela vitrine.
 * Só entram produtos PUBLISHED e não excluídos. Os dados da empresa não ficam no banco
 * (vêm da configuração do site), por isso são recebidos de fora.
 */
export async function loadCatalogFromDatabase(prisma: PrismaClient, company: CatalogSnapshot["company"]): Promise<CatalogSnapshot> {
  const [categories, brands, branches, products, lastStock, lastSync] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { position: "asc" },
      include: { children: { where: { isActive: true }, orderBy: { position: "asc" } } },
    }),
    prisma.brand.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        brand: true,
        category: true,
        variants: { where: { isActive: true }, orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" } },
        // Último total das lojas (sem filial). O saldo de cada loja fica em branchId.
        inventorySnapshots: { where: { branchId: null }, orderBy: { capturedAt: "desc" }, take: 1 },
      },
    }),
    prisma.inventorySnapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true } }),
    // A sincronização só grava saldos que mudaram; a hora da última conferência vem dela
    prisma.syncJob.findFirst({
      where: { type: "STOCK", status: { in: ["SUCCEEDED", "PARTIAL"] } },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
  ]);

  const colorHex: Record<string, string> = {};
  for (const p of products) for (const v of p.variants) if (v.colorName && v.colorHex) colorHex[v.colorName] = v.colorHex;

  return catalogSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    stockUpdatedAt: (lastSync?.finishedAt ?? lastStock?.capturedAt)?.toISOString() ?? null,
    source: "database",
    company,
    colorHex,
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      subgroups: c.children.filter((g) => g.matchPattern).map((g) => ({ name: g.name, pattern: g.matchPattern! })),
    })),
    brands: brands.map((b) => ({ slug: b.slug, name: b.name, logo: b.logoUrl ? fromImg(b.logoUrl) : null, featured: b.featured })),
    branches: branches.map((b) => ({
      slug: b.slug,
      name: b.name,
      street: b.street,
      district: b.district,
      city: b.city,
      state: b.state,
      zipCode: b.zipCode,
    })),
    products: products.map((p) => {
      const main = p.variants.find((v) => v.isDefault) ?? p.variants[0];
      return {
        slug: p.slug,
        erpCode: p.erpCode,
        name: p.name,
        brand: p.brand.name,
        category: p.category.name,
        shortDescription: p.shortDescription,
        description: p.description,
        highlights: p.highlights,
        specs: p.specs,
        images: p.images.map((i) => fromImg(i.url)),
        coverFit: p.coverFit,
        colors: p.variants
          .filter((v) => v.colorName)
          .map((v) => ({
            name: v.colorName!,
            image: fromImg(v.imageUrl ?? p.images.find((i) => i.variantId === v.id)?.url ?? p.images[0]?.url ?? ""),
          })),
        cashPriceCents: main?.priceCents ?? null,
        manualInstallmentCents: main?.legacyInstallmentCents ?? null,
        stockQuantity: p.inventorySnapshots[0]?.quantity ?? null,
      };
    }),
  });
}
