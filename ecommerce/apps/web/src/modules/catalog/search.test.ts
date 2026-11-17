import { describe, expect, it } from "vitest";
import raw from "@lojas-tropical/database/legacy-catalog.json";
import { catalogSnapshotSchema, type Product } from "@lojas-tropical/shared";
import { parseSearchParams, productQuerySchema } from "./query";
import { relevance, searchProducts } from "./search";

const catalog = catalogSnapshotSchema.parse(raw);
const base: Product = {
  slug: "x",
  erpCode: "1",
  name: "Produto",
  brand: "Marca",
  category: "Móveis",
  shortDescription: "",
  description: null,
  highlights: [],
  specs: {},
  images: ["a.jpg"],
  coverFit: "contain",
  colors: [],
  cashPriceCents: 10000,
  manualInstallmentCents: null,
  stockQuantity: 5,
};
const make = (o: Partial<Product>): Product => ({ ...base, ...o });
const q = (o: Parameters<typeof productQuerySchema.parse>[0] = {}) => productQuerySchema.parse(o);

describe("catálogo extraído do site original", () => {
  it("é válido e tem os produtos do site", () => {
    expect(catalog.products.length).toBeGreaterThan(100);
    expect(new Set(catalog.products.map((p) => p.slug)).size).toBe(catalog.products.length);
    expect(catalog.branches.map((b) => b.city)).toContain("Codó");
  });
});

describe("busca de produtos", () => {
  const items = [
    make({ slug: "a", name: "Geladeira Consul CRA30 261 Litros", brand: "Consul", category: "Eletrodomésticos", cashPriceCents: 249900 }),
    make({ slug: "b", name: "Fogão Mueller 5 Bocas", brand: "Mueller", category: "Eletrodomésticos", cashPriceCents: 199900 }),
    make({ slug: "c", name: "Guarda-Roupa Moval Alasca", brand: "Moval", category: "Guarda-roupas", cashPriceCents: null, stockQuantity: 0 }),
    make({ slug: "d", name: "Cômoda Moval Texas", brand: "Moval", category: "Móveis", cashPriceCents: 109900, shortDescription: "Cômoda com gavetas" }),
  ];

  it("ignora acentos, maiúsculas e plural simples", () => {
    expect(searchProducts(items, q({ text: "COMODA" })).items.map((p) => p.slug)).toEqual(["d"]);
    expect(searchProducts(items, q({ text: "geladeiras" })).items.map((p) => p.slug)).toEqual(["a"]);
  });

  it("exige todos os termos e procura também marca, código e descrição", () => {
    expect(searchProducts(items, q({ text: "moval gavetas" })).items.map((p) => p.slug)).toEqual(["d"]);
    expect(searchProducts(items, q({ text: "mueller geladeira" })).total).toBe(0);
    expect(relevance(items[0]!, "consul")).toBeGreaterThan(relevance(items[3]!, "gavetas"));
  });

  it("filtra por departamento, marca, preço e estoque", () => {
    expect(searchProducts(items, q({ categorySlug: "eletrodomesticos" })).total).toBe(2);
    expect(searchProducts(items, q({ brandSlugs: ["moval"] })).total).toBe(2);
    expect(searchProducts(items, q({ minPriceCents: 150000, maxPriceCents: 220000 })).items.map((p) => p.slug)).toEqual(["b"]);
    expect(searchProducts(items, q({ inStockOnly: true })).items.map((p) => p.slug)).not.toContain("c");
  });

  it("ordena por preço com esgotados e sem preço no fim", () => {
    expect(searchProducts(items, q({ sort: "price-asc" })).items.map((p) => p.slug)).toEqual(["d", "b", "a", "c"]);
    expect(searchProducts(items, q({ sort: "price-desc" })).items.map((p) => p.slug)).toEqual(["a", "b", "d", "c"]);
  });

  it("calcula facetas de marca antes do filtro de marca", () => {
    const r = searchProducts(items, q({ brandSlugs: ["consul"] }));
    expect(r.total).toBe(1);
    expect(r.facets.brands.map((b) => b.slug)).toEqual(expect.arrayContaining(["consul", "mueller", "moval"]));
  });

  it("pagina os resultados", () => {
    const r = searchProducts(catalog.products, q({ pageSize: 10, page: 2 }));
    expect(r.items).toHaveLength(10);
    expect(r.page).toBe(2);
    expect(r.pageCount).toBe(Math.ceil(catalog.products.length / 10));
  });

  it("filtra por subgrupo usando a regra do menu", () => {
    const r = searchProducts(catalog.products, q({ categorySlug: "guarda-roupas" }), "casal");
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((p) => /casal/i.test(p.name))).toBe(true);
  });
});

describe("parâmetros da URL", () => {
  it("converte e valida a query string", () => {
    const parsed = parseSearchParams({ q: "  fogão ", marca: ["mueller", "consul"], min: "100", max: "2.000", estoque: "1", ordem: "price-asc", pagina: "2" });
    expect(parsed).toMatchObject({ text: "fogão", brandSlugs: ["mueller", "consul"], minPriceCents: 10000, inStockOnly: true, sort: "price-asc", page: 2 });
  });

  it("descarta parâmetros inválidos sem quebrar", () => {
    const parsed = parseSearchParams({ q: "tv", ordem: "hack'); drop table", marca: "<script>" });
    expect(parsed.text).toBe("tv");
    expect(parsed.sort).toBe("relevance");
    expect(parsed.brandSlugs).toEqual([]);
  });
});
