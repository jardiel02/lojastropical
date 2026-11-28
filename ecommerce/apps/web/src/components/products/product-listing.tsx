import type { ReactNode } from "react";
import { catalog, type ParsedProductQuery } from "@/modules/catalog";
import { toCardProduct } from "@/lib/card";
import { wa } from "@/lib/site";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { Pagination } from "./pagination";
import { ProductFilters } from "./product-filters";
import { ProductGrid } from "./product-grid";

type SearchParams = Record<string, string | string[] | undefined>;

/** Página de lista de produtos (departamento, marca, campanha e busca) com filtros e paginação. */
export async function ProductListing({
  title,
  eyebrow,
  crumbs,
  action,
  query,
  searchParams,
  showBrandFilter = true,
  subgroups = [],
  intro,
}: {
  title: string;
  eyebrow: string;
  crumbs: Crumb[];
  action: string;
  query: ParsedProductQuery;
  searchParams: SearchParams;
  showBrandFilter?: boolean;
  subgroups?: string[];
  intro?: ReactNode;
}) {
  const [result, hex] = await Promise.all([catalog.searchProducts(query), catalog.getColorHex()]);
  const hrefFor = (page: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "pagina" || v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) sp.append(k, item);
    }
    if (page > 1) sp.set("pagina", String(page));
    const qs = sp.toString();
    return qs ? `${action}?${qs}` : action;
  };
  const count = `${result.total} ${result.total === 1 ? "produto" : "produtos"}`;

  return (
    <div className="wrap pb-12">
      <Breadcrumbs items={crumbs} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="text-[clamp(28px,3.6vw,40px)]">{title}</h1>
          {intro}
        </div>
        <span role="status" className="text-sm text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="grid gap-6 min-[961px]:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <details className="group min-[961px]:hidden">
            <summary className="mb-3 cursor-pointer list-none rounded-[10px] border border-line bg-surface px-4 py-3 font-bold">
              Filtrar e ordenar
            </summary>
            <ProductFilters action={action} query={query} brands={result.facets.brands} showBrands={showBrandFilter} subgroups={subgroups} />
          </details>
          <div className="hidden min-[961px]:block">
            <ProductFilters action={action} query={query} brands={result.facets.brands} showBrands={showBrandFilter} subgroups={subgroups} />
          </div>
        </aside>
        <div>
          <ProductGrid
            products={result.items.map((p) => toCardProduct(p, hex))}
            empty={
              <>
                Nenhum produto encontrado. Tente outra palavra ou{" "}
                <a className="underline" href={wa(`Olá! Estou procurando: ${query.text ?? title}`)} target="_blank" rel="noopener">
                  pergunte no WhatsApp
                </a>
                .
              </>
            }
          />
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} />
        </div>
      </div>
    </div>
  );
}
