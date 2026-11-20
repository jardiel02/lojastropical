import type { Product } from "@lojas-tropical/shared";
import { colorCss } from "./product-view";

/** Recorte do produto que vai para o navegador nos cartões (menos dados no HTML). */
export type CardProduct = Pick<
  Product,
  "slug" | "name" | "brand" | "category" | "coverFit" | "cashPriceCents" | "manualInstallmentCents" | "stockQuantity"
> & {
  cover: string;
  colors: { name: string; image: string; css: string }[];
};

export function toCardProduct(p: Product, hex: Record<string, string>): CardProduct {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    coverFit: p.coverFit,
    cashPriceCents: p.cashPriceCents,
    manualInstallmentCents: p.manualInstallmentCents,
    stockQuantity: p.stockQuantity,
    cover: p.images[0]!,
    colors: p.colors.map((c) => ({ ...c, css: colorCss(c.name, hex) })),
  };
}
