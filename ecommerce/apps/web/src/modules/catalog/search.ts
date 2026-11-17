import { isOutOfStock, normalizeSearchText, slugify, type Product } from "@lojas-tropical/shared";
import type { ParsedProductQuery } from "./query";

export type BrandFacet = { slug: string; name: string; count: number };
export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: { brands: BrandFacet[]; minPriceCents: number | null; maxPriceCents: number | null };
};

/** Preço usado para ordenar e filtrar: o preço à vista. Produtos sem preço ficam fora de filtros de preço. */
export const referencePrice = (p: Product): number | null => p.cashPriceCents;

function haystack(p: Product): { name: string; rest: string } {
  return {
    name: normalizeSearchText(p.name),
    rest: normalizeSearchText(
      [p.brand, p.category, p.erpCode ?? "", p.specs["Modelo"] ?? "", p.shortDescription, p.description ?? "", p.highlights.join(" ")].join(" "),
    ),
  };
}

/** Relevância: todos os termos precisam aparecer; termo no nome vale mais que na descrição. 0 = não combina. */
export function relevance(p: Product, text: string): number {
  const terms = normalizeSearchText(text).split(" ").filter(Boolean);
  if (!terms.length) return 1;
  const h = haystack(p);
  let score = 0;
  for (const term of terms) {
    const stem = term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term; // "geladeiras" -> "geladeira"
    if (h.name.includes(stem)) score += h.name.split(" ").includes(stem) ? 3 : 2;
    else if (h.rest.includes(stem)) score += 1;
    else return 0;
  }
  return score;
}

export function matchesSubgroup(p: Product, pattern: string): boolean {
  try {
    return new RegExp(pattern, "i").test(p.name);
  } catch {
    return false;
  }
}

/**
 * Busca em memória sobre o retrato do catálogo. Mesma assinatura que a versão
 * PostgreSQL terá na etapa 5 (full-text search), para a interface não mudar.
 */
export function searchProducts(
  all: Product[],
  q: ParsedProductQuery,
  subgroupPattern?: string,
): ProductPage {
  const scored: { p: Product; score: number; index: number }[] = [];
  all.forEach((p, index) => {
    if (q.categorySlug && slugify(p.category) !== q.categorySlug) return;
    if (q.erpCodes && !(p.erpCode && q.erpCodes.includes(p.erpCode))) return;
    if (subgroupPattern && !matchesSubgroup(p, subgroupPattern)) return;
    const score = q.text ? relevance(p, q.text) : 1;
    if (!score) return;
    scored.push({ p, score, index });
  });

  // Facetas calculadas antes dos filtros de marca/preço/estoque, para o cliente poder trocar de filtro
  const brandCount = new Map<string, BrandFacet>();
  let min: number | null = null;
  let max: number | null = null;
  for (const { p } of scored) {
    const slug = slugify(p.brand);
    const f = brandCount.get(slug) ?? { slug, name: p.brand, count: 0 };
    f.count++;
    brandCount.set(slug, f);
    const price = referencePrice(p);
    if (price !== null) {
      min = min === null ? price : Math.min(min, price);
      max = max === null ? price : Math.max(max, price);
    }
  }

  const filtered = scored.filter(({ p }) => {
    if (q.brandSlugs.length && !q.brandSlugs.includes(slugify(p.brand))) return false;
    if (q.inStockOnly && (p.stockQuantity === null || p.stockQuantity <= 0)) return false;
    const price = referencePrice(p);
    if (q.minPriceCents !== undefined && (price === null || price < q.minPriceCents)) return false;
    if (q.maxPriceCents !== undefined && (price === null || price > q.maxPriceCents)) return false;
    return true;
  });

  const byPrice = (dir: 1 | -1) => (a: Product, b: Product) => {
    const pa = referencePrice(a);
    const pb = referencePrice(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (pa - pb) * dir;
  };

  filtered.sort((a, b) => {
    // Esgotados sempre no fim (regra do site original)
    const stock = Number(isOutOfStock(a.p)) - Number(isOutOfStock(b.p));
    if (stock) return stock;
    switch (q.sort) {
      case "price-asc":
        return byPrice(1)(a.p, b.p) || a.index - b.index;
      case "price-desc":
        return byPrice(-1)(a.p, b.p) || a.index - b.index;
      case "name":
        return a.p.name.localeCompare(b.p.name, "pt-BR");
      default:
        return b.score - a.score || a.index - b.index;
    }
  });

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / q.pageSize));
  const page = Math.min(q.page, pageCount);
  const items = filtered.slice((page - 1) * q.pageSize, page * q.pageSize).map(({ p }) => p);
  return {
    items,
    total,
    page,
    pageSize: q.pageSize,
    pageCount,
    facets: {
      brands: [...brandCount.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")),
      minPriceCents: min,
      maxPriceCents: max,
    },
  };
}
