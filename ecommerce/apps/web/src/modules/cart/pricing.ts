import { addCents, cents, formatBRL, isOutOfStock, multiplyCents, type Cents, type Product } from "@lojas-tropical/shared";
import { imagesForColor } from "@/lib/product-view";
import type { CartLineInput } from "./schema";

export type QuotedLine = {
  slug: string;
  name: string;
  color: string | null;
  image: string;
  qty: number;
  unitCashCents: Cents | null;
  manualInstallmentCents: Cents | null;
  lineTotalCents: Cents | null;
  outOfStock: boolean;
  /** Texto de preço igual ao do site original, usado também na mensagem do WhatsApp. */
  priceLabel: string;
};
export type CartQuote = {
  lines: QuotedLine[];
  /** Soma dos itens que têm preço à vista. */
  subtotalCents: Cents;
  /** Itens sem preço à vista (preço a consultar). Bloqueiam checkout online. */
  itemsWithoutPrice: number;
  removed: { slug: string; reason: "not-found" | "invalid-color" }[];
};

export function priceLabel(p: Pick<Product, "cashPriceCents" | "manualInstallmentCents">): string {
  const cash = p.cashPriceCents === null ? null : cents(p.cashPriceCents);
  const inst = p.manualInstallmentCents === null ? null : cents(p.manualInstallmentCents);
  if (inst !== null) return `12x de ${formatBRL(inst)}${cash !== null ? ` ou ${formatBRL(cash)} à vista` : ""}`;
  if (cash !== null) return `${formatBRL(cash)} à vista`;
  return "preço a consultar";
}

/**
 * Recalcula o carrinho no servidor a partir do catálogo oficial.
 * Linhas repetidas (mesmo produto e cor) são somadas; quantidades limitadas.
 */
export function quoteCart(items: CartLineInput[], findProduct: (slug: string) => Product | undefined, maxQty: number): CartQuote {
  const merged = new Map<string, CartLineInput>();
  for (const item of items) {
    const key = `${item.slug}::${item.color ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { ...item, qty: Math.min(maxQty, (prev?.qty ?? 0) + item.qty) });
  }

  const lines: QuotedLine[] = [];
  const removed: CartQuote["removed"] = [];
  for (const item of merged.values()) {
    const p = findProduct(item.slug);
    if (!p) {
      removed.push({ slug: item.slug, reason: "not-found" });
      continue;
    }
    const colorIndex = item.color === null ? -1 : p.colors.findIndex((c) => c.name === item.color);
    if (item.color !== null && colorIndex < 0) {
      removed.push({ slug: item.slug, reason: "invalid-color" });
      continue;
    }
    const unit = p.cashPriceCents === null ? null : cents(p.cashPriceCents);
    lines.push({
      slug: p.slug,
      name: p.name,
      color: item.color,
      image: imagesForColor(p, colorIndex >= 0 ? colorIndex : null)[0] ?? p.images[0]!,
      qty: item.qty,
      unitCashCents: unit,
      manualInstallmentCents: p.manualInstallmentCents === null ? null : cents(p.manualInstallmentCents),
      lineTotalCents: unit === null ? null : multiplyCents(unit, item.qty),
      outOfStock: isOutOfStock(p),
      priceLabel: priceLabel(p),
    });
  }
  return {
    lines,
    subtotalCents: addCents(...lines.flatMap((l) => (l.lineTotalCents === null ? [] : [l.lineTotalCents]))),
    itemsWithoutPrice: lines.filter((l) => l.unitCashCents === null).length,
    removed,
  };
}

export function whatsappOrderText(quote: CartQuote): string {
  const rows = quote.lines.map((l) => `• ${l.qty}x ${l.name}${l.color ? ` (cor ${l.color})` : ""}: ${l.priceLabel}`);
  return `Olá! Quero fazer este pedido pelo site:\n${rows.join("\n")}\n\nMinha cidade: `;
}
