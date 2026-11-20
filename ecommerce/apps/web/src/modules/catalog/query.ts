import { z } from "zod";

export const SORT_OPTIONS = {
  relevance: "Mais relevantes",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  name: "Nome (A–Z)",
} as const;
export type SortOption = keyof typeof SORT_OPTIONS;

export const PAGE_SIZE = 24;

/** Parâmetros de busca vindos da URL; tudo validado no servidor. */
export const productQuerySchema = z.object({
  text: z.string().trim().max(80).optional(),
  categorySlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  subgroup: z.string().max(60).optional(),
  brandSlugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(40).default([]),
  erpCodes: z.array(z.string().regex(/^\d+$/)).max(200).optional(),
  minPriceCents: z.number().int().nonnegative().optional(),
  maxPriceCents: z.number().int().nonnegative().optional(),
  inStockOnly: z.boolean().default(false),
  sort: z.enum(Object.keys(SORT_OPTIONS) as [SortOption, ...SortOption[]]).default("relevance"),
  page: z.number().int().min(1).max(500).default(1),
  pageSize: z.number().int().min(1).max(96).default(PAGE_SIZE),
});
export type ProductQuery = z.input<typeof productQuerySchema>;
export type ParsedProductQuery = z.output<typeof productQuerySchema>;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : v.split(","));
const reaisToCents = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

/** Converte a query string (?q=&marca=&min=&max=&estoque=1&ordem=&pagina=) em uma consulta validada. */
export function parseSearchParams(params: SearchParams, base: Partial<ProductQuery> = {}): ParsedProductQuery {
  const candidate = {
    ...base,
    text: first(params.q) || base.text,
    subgroup: first(params.sub) || base.subgroup,
    brandSlugs: list(params.marca).filter(Boolean),
    minPriceCents: reaisToCents(first(params.min)),
    maxPriceCents: reaisToCents(first(params.max)),
    inStockOnly: first(params.estoque) === "1",
    sort: first(params.ordem),
    page: Number(first(params.pagina) ?? "1") || 1,
  };
  const parsed = productQuerySchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  // Parâmetro inválido na URL: ignora os filtros opcionais em vez de quebrar a página
  return productQuerySchema.parse({ ...base, text: candidate.text?.slice(0, 80) });
}
