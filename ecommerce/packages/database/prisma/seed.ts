/**
 * Carrega no banco o catálogo extraído do site original (data/legacy-catalog.json).
 * Idempotente: pode rodar várias vezes (upsert por slug/código).
 * Não cria clientes, pedidos nem pagamentos: esses dados nunca são inventados.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSnapshotSchema, slugify } from "@lojas-tropical/shared";
import { createPrismaClient, type ShippingClass } from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = catalogSnapshotSchema.parse(JSON.parse(readFileSync(join(here, "../data/legacy-catalog.json"), "utf8")));
const prisma = createPrismaClient();

// Classe logística inicial por departamento (revisar com a operação de entrega)
const SHIPPING_BY_CATEGORY: Record<string, ShippingClass> = {
  "Guarda-roupas": "FURNITURE_ASSEMBLY",
  Móveis: "FURNITURE_ASSEMBLY",
  Eletrodomésticos: "BULKY",
  Estofados: "OVERSIZED",
  Colchões: "OVERSIZED",
  Eletroportáteis: "SMALL",
  Ventilação: "STANDARD",
  "Áudio e Vídeo": "STANDARD",
  Bicicletas: "STANDARD",
};

const ROLES = [
  { key: "ADMIN", name: "Administrador geral" },
  { key: "MANAGER", name: "Gerente" },
  { key: "ORDER_OPERATOR", name: "Operador de pedidos" },
  { key: "STOCK_OPERATOR", name: "Operador de estoque" },
  { key: "CUSTOMER", name: "Cliente" },
] as const;

async function main() {
  for (const r of ROLES) await prisma.role.upsert({ where: { key: r.key }, update: { name: r.name }, create: r });

  const categoryIds = new Map<string, string>();
  for (const [position, c] of snapshot.categories.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, position },
      create: { slug: c.slug, name: c.name, position },
    });
    categoryIds.set(c.name, cat.id);
    for (const [subPos, g] of c.subgroups.entries()) {
      const slug = `${c.slug}-${slugify(g.name)}`;
      await prisma.category.upsert({
        where: { slug },
        update: { name: g.name, matchPattern: g.pattern, parentId: cat.id, position: subPos },
        create: { slug, name: g.name, matchPattern: g.pattern, parentId: cat.id, position: subPos },
      });
    }
  }

  const brandIds = new Map<string, string>();
  for (const [position, b] of snapshot.brands.entries()) {
    const data = { name: b.name, logoUrl: b.logo ? `/img/${b.logo}` : null, featured: b.featured, position };
    const brand = await prisma.brand.upsert({ where: { slug: b.slug }, update: data, create: { slug: b.slug, ...data } });
    brandIds.set(b.name, brand.id);
  }

  for (const b of snapshot.branches) {
    // Retirada e entrega começam DESLIGADAS: cada filial é habilitada no painel depois de confirmada.
    const data = { name: b.name, street: b.street, district: b.district, city: b.city, state: b.state, zipCode: b.zipCode };
    await prisma.branch.upsert({ where: { slug: b.slug }, update: data, create: { slug: b.slug, ...data } });
  }

  const capturedAt = new Date();
  for (const [productPosition, p] of snapshot.products.entries()) {
    await prisma.$transaction(async (tx) => {
      const data = {
        name: p.name,
        erpCode: p.erpCode,
        brandId: brandIds.get(p.brand)!,
        categoryId: categoryIds.get(p.category)!,
        model: p.specs["Modelo"] ?? null,
        shortDescription: p.shortDescription,
        description: p.description,
        highlights: p.highlights,
        specs: p.specs,
        coverFit: p.coverFit,
        shippingClass: SHIPPING_BY_CATEGORY[p.category] ?? "STANDARD",
        status: "PUBLISHED" as const,
        position: productPosition,
        publishedAt: capturedAt,
      };
      const product = await tx.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });

      const colors = p.colors.length ? p.colors.map((c) => c.name) : [null];
      const variantIds: string[] = [];
      for (const [position, colorName] of colors.entries()) {
        const sku = `${p.erpCode ?? p.slug}${colorName ? `-${slugify(colorName)}` : ""}`;
        const v = {
          productId: product.id,
          erpCode: p.erpCode,
          colorName,
          colorHex: colorName ? (snapshot.colorHex[colorName] ?? null) : null,
          position,
          isDefault: position === 0,
          imageUrl: colorName ? `/img/${p.colors[position]!.image}` : null,
          priceCents: p.cashPriceCents,
          legacyInstallmentCents: p.manualInstallmentCents,
          priceSource: p.cashPriceCents === null ? null : ("ERP" as const),
          priceUpdatedAt: p.cashPriceCents === null ? null : capturedAt,
        };
        const variant = await tx.productVariant.upsert({ where: { sku }, update: v, create: { sku, ...v } });
        variantIds.push(variant.id);
      }

      await tx.productImage.deleteMany({ where: { productId: product.id } });
      await tx.productImage.createMany({
        data: p.images.map((file, position) => {
          const colorIndex = p.colors.findIndex((c) => c.image === file);
          return {
            productId: product.id,
            variantId: colorIndex >= 0 ? variantIds[colorIndex] : null,
            url: `/img/${file}`,
            alt: `${p.name}, foto ${position + 1}`,
            position,
          };
        }),
      });

      // Retrato do site original: substitui o anterior para o seed poder rodar várias vezes
      await tx.inventorySnapshot.deleteMany({ where: { productId: product.id, source: "legacy-estoque.js" } });
      if (p.stockQuantity !== null) {
        await tx.inventorySnapshot.create({
          data: { productId: product.id, quantity: p.stockQuantity, source: "legacy-estoque.js", capturedAt },
        });
      }
      if (p.erpCode) {
        await tx.erpMapping.upsert({
          where: { erpSystem_entityType_entityId: { erpSystem: "solidus", entityType: "PRODUCT", entityId: product.id } },
          update: { erpCode: p.erpCode },
          create: { erpSystem: "solidus", entityType: "PRODUCT", entityId: product.id, erpCode: p.erpCode },
        });
      }
    });
  }

  const counts = {
    produtos: await prisma.product.count(),
    variacoes: await prisma.productVariant.count(),
    imagens: await prisma.productImage.count(),
    departamentos: await prisma.category.count({ where: { parentId: null } }),
    subgrupos: await prisma.category.count({ where: { NOT: { parentId: null } } }),
    marcas: await prisma.brand.count(),
    filiais: await prisma.branch.count(),
  };
  console.log("Seed concluído:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
