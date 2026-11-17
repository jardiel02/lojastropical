import { describe, expect, it } from "vitest";
import type { Product } from "@lojas-tropical/shared";
import { cartReducer } from "@/components/cart/cart-store";
import { priceLabel, quoteCart, whatsappOrderText } from "./pricing";
import { cartQuoteRequestSchema } from "./schema";

const product = (o: Partial<Product>): Product => ({
  slug: "comoda-texas",
  erpCode: "9967",
  name: "Cômoda Moval Texas",
  brand: "Moval",
  category: "Móveis",
  shortDescription: "",
  description: null,
  highlights: [],
  specs: {},
  images: ["comoda-texas.jpg", "comoda-texas-decor.jpg"],
  coverFit: "contain",
  colors: [
    { name: "Freijó e Off White", image: "comoda-texas.jpg" },
    { name: "Branco", image: "comoda-texas-branco.jpg" },
  ],
  cashPriceCents: 109900,
  manualInstallmentCents: null,
  stockQuantity: 3,
  ...o,
});

describe("carrinho calculado no servidor", () => {
  const catalog = new Map([
    ["comoda-texas", product({})],
    ["moval-aruba", product({ slug: "moval-aruba", name: "Guarda-Roupa Moval Aruba", colors: [], cashPriceCents: null, manualInstallmentCents: 12990 })],
  ]);
  const find = (s: string) => catalog.get(s);

  it("usa o preço do catálogo, nunca o do navegador", () => {
    const q = quoteCart([{ slug: "comoda-texas", color: "Branco", qty: 2 }], find, 20);
    expect(q.lines[0]).toMatchObject({ unitCashCents: 109900, lineTotalCents: 219800, image: "comoda-texas-branco.jpg" });
    expect(q.subtotalCents).toBe(219800);
  });

  it("junta linhas repetidas e limita a quantidade", () => {
    const q = quoteCart(
      [
        { slug: "comoda-texas", color: "Branco", qty: 15 },
        { slug: "comoda-texas", color: "Branco", qty: 15 },
      ],
      find,
      20,
    );
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.qty).toBe(20);
  });

  it("remove produto inexistente ou cor inválida", () => {
    const q = quoteCart(
      [
        { slug: "nao-existe", color: null, qty: 1 },
        { slug: "comoda-texas", color: "Roxo", qty: 1 },
      ],
      find,
      20,
    );
    expect(q.lines).toHaveLength(0);
    expect(q.removed.map((r) => r.reason)).toEqual(["not-found", "invalid-color"]);
  });

  it("item sem preço à vista não entra no subtotal e é sinalizado", () => {
    const q = quoteCart(
      [
        { slug: "moval-aruba", color: null, qty: 1 },
        { slug: "comoda-texas", color: null, qty: 1 },
      ],
      find,
      20,
    );
    expect(q.subtotalCents).toBe(109900);
    expect(q.itemsWithoutPrice).toBe(1);
    expect(q.lines[0]!.priceLabel).toMatch(/^12x de R\$\s129,90$/);
  });

  it("monta a mensagem do WhatsApp como no site original", () => {
    const q = quoteCart([{ slug: "comoda-texas", color: "Branco", qty: 1 }], find, 20);
    expect(whatsappOrderText(q)).toMatch(/^Olá! Quero fazer este pedido pelo site:\n• 1x Cômoda Moval Texas \(cor Branco\): R\$\s1\.099,00 à vista\n\nMinha cidade: $/);
  });

  it("rótulos de preço", () => {
    expect(priceLabel({ cashPriceCents: null, manualInstallmentCents: null })).toBe("preço a consultar");
  });

  it("valida a entrada: quantidade, formato e tamanho", () => {
    expect(cartQuoteRequestSchema.safeParse({ items: [{ slug: "a", color: null, qty: 0 }] }).success).toBe(false);
    expect(cartQuoteRequestSchema.safeParse({ items: [{ slug: "a", color: null, qty: 21 }] }).success).toBe(false);
    expect(cartQuoteRequestSchema.safeParse({ items: [{ slug: "../etc", color: null, qty: 1 }] }).success).toBe(false);
    expect(cartQuoteRequestSchema.safeParse({ items: [{ slug: "a", color: null, qty: 1, priceCents: 1 }] }).success).toBe(true);
  });
});

describe("estado do carrinho no navegador", () => {
  it("adiciona, soma, altera e remove", () => {
    let s = cartReducer([], { type: "add", line: { slug: "a", color: null, qty: 1 } });
    s = cartReducer(s, { type: "add", line: { slug: "a", color: null, qty: 2 } });
    s = cartReducer(s, { type: "add", line: { slug: "a", color: "Branco", qty: 1 } });
    expect(s).toEqual([
      { slug: "a", color: null, qty: 3 },
      { slug: "a", color: "Branco", qty: 1 },
    ]);
    s = cartReducer(s, { type: "setQty", slug: "a", color: null, qty: 99 });
    expect(s[0]!.qty).toBe(20);
    s = cartReducer(s, { type: "setQty", slug: "a", color: null, qty: 0 });
    expect(s).toEqual([{ slug: "a", color: "Branco", qty: 1 }]);
    expect(cartReducer(s, { type: "clear" })).toEqual([]);
  });
});
