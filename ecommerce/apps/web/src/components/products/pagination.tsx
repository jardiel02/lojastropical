import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount < 2) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav aria-label="Páginas de resultados" className="mt-8 flex flex-wrap justify-center gap-2">
      {page > 1 && (
        <Link className="rounded-[10px] border border-line bg-surface px-4 py-2 font-bold" href={hrefFor(page - 1)} rel="prev">
          ‹ Anterior
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={p === page ? "rounded-[10px] bg-brand px-4 py-2 font-bold text-white" : "rounded-[10px] border border-line bg-surface px-4 py-2"}
        >
          {p}
        </Link>
      ))}
      {page < pageCount && (
        <Link className="rounded-[10px] border border-line bg-surface px-4 py-2 font-bold" href={hrefFor(page + 1)} rel="next">
          Próxima ›
        </Link>
      )}
    </nav>
  );
}
