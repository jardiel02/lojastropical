import Link from "next/link";
import type { BrandFacet, ParsedProductQuery } from "@/modules/catalog";
import { SORT_OPTIONS } from "@/modules/catalog";

/**
 * Filtros como formulário GET: funcionam sem JavaScript, geram URLs compartilháveis
 * e são validados no servidor (parseSearchParams).
 */
export function ProductFilters({
  action,
  query,
  brands,
  showBrands = true,
  subgroups = [],
}: {
  action: string;
  query: ParsedProductQuery;
  brands: BrandFacet[];
  showBrands?: boolean;
  subgroups?: string[];
}) {
  const reais = (c: number | undefined) => (c === undefined ? "" : String(c / 100));
  const fieldset = "grid gap-2 border-t border-line pt-4";
  const legend = "mb-1 text-[15px] font-bold";
  return (
    <form action={action} method="get" className="grid gap-4 rounded-[var(--radius)] border border-line bg-surface p-4" aria-label="Filtrar produtos">
      {query.text && <input type="hidden" name="q" value={query.text} />}
      <div className="grid gap-1.5">
        <label htmlFor="ordem" className={legend}>
          Ordenar por
        </label>
        <select id="ordem" name="ordem" defaultValue={query.sort} className="rounded-[10px] border border-line bg-surface px-3 py-2.5">
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {subgroups.length > 0 && (
        <fieldset className={fieldset}>
          <legend className={legend}>Tipo</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="sub" value="" defaultChecked={!query.subgroup} className="accent-[var(--brand)]" /> Todos
          </label>
          {subgroups.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input type="radio" name="sub" value={s} defaultChecked={query.subgroup === s} className="accent-[var(--brand)]" /> {s}
            </label>
          ))}
        </fieldset>
      )}

      {showBrands && brands.length > 1 && (
        <fieldset className={fieldset}>
          <legend className={legend}>Marca</legend>
          <div className="grid max-h-60 gap-1.5 overflow-y-auto pr-1">
            {brands.map((b) => (
              <label key={b.slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="marca" value={b.slug} defaultChecked={query.brandSlugs.includes(b.slug)} className="size-4 accent-[var(--brand)]" />
                {b.name} <span className="text-muted-foreground">({b.count})</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className={fieldset}>
        <legend className={legend}>Preço à vista (R$)</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Mínimo
            <input name="min" inputMode="decimal" defaultValue={reais(query.minPriceCents)} className="w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 py-2 text-base text-foreground" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Máximo
            <input name="max" inputMode="decimal" defaultValue={reais(query.maxPriceCents)} className="w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 py-2 text-base text-foreground" />
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Disponibilidade</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="estoque" value="1" defaultChecked={query.inStockOnly} className="size-4 accent-[var(--brand)]" />
          Somente em estoque
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="submit" className="h-11 flex-1 rounded-[10px] bg-brand px-4 font-bold text-white">
          Aplicar filtros
        </button>
        <Link href={query.text ? `${action}?q=${encodeURIComponent(query.text)}` : action} className="grid h-11 place-items-center rounded-[10px] bg-chip px-4 font-bold">
          Limpar
        </Link>
      </div>
    </form>
  );
}
