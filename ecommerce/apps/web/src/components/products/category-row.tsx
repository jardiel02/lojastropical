"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CardProduct } from "@/lib/card";
import { ProductCard } from "./product-card";

/** Uma linha de produtos por departamento na página inicial (rola para o lado). */
export function CategoryRow({
  title,
  href,
  total,
  products,
}: {
  title: string;
  href: string;
  total: number;
  products: CardProduct[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const rest = total - products.length;

  const update = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    setCanPrev(row.scrollLeft > 4);
    setCanNext(row.scrollLeft < row.scrollWidth - row.clientWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(update);
    ro.observe(row);
    return () => ro.disconnect();
  }, [update]);

  const page = (dir: 1 | -1) => {
    const row = rowRef.current;
    const first = row?.firstElementChild as HTMLElement | null;
    if (!row || !first) return;
    const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || "0");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: dir * step * Math.max(1, Math.floor(row.clientWidth / step)), behavior: reduce ? "instant" : "smooth" });
  };

  const arrow =
    "absolute top-[119px] z-[2] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-price shadow-[0_2px_8px_rgb(0_0_0/.15)] hover:enabled:border-brand hover:enabled:bg-brand hover:enabled:text-white disabled:opacity-30 max-[860px]:hidden";
  const headingId = `linha-${href.replace(/[^a-z0-9]+/gi, "-")}`;
  const qtd = (n: number) => `${n} ${n === 1 ? "produto" : "produtos"}`;

  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={headingId} className="text-[clamp(20px,2.4vw,26px)]">
          {title}
        </h3>
        <span className="text-sm text-muted-foreground">{qtd(total)}</span>
        <Link href={href} className="ml-auto py-1.5 text-[15px] font-bold text-brand-text hover:underline">
          Ver todos<span className="sr-only"> os produtos de {title}</span> →
        </Link>
      </div>
      <div className="relative">
        <div
          ref={rowRef}
          onScroll={update}
          className="no-scrollbar grid auto-cols-[46%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain px-0.5 py-1 snap-x snap-mandatory min-[481px]:auto-cols-[230px] min-[481px]:gap-[18px] [&>*]:snap-start"
        >
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
          {rest > 0 && (
            <Link
              href={href}
              className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius)] border-2 border-dashed border-line bg-surface p-4 text-center font-bold hover:border-brand"
            >
              <b className="text-[34px] text-price">+{rest}</b>Ver mais {title}
            </Link>
          )}
        </div>
        <button type="button" className={`${arrow} -left-3`} onClick={() => page(-1)} disabled={!canPrev} aria-label={`Produtos anteriores de ${title}`}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button type="button" className={`${arrow} -right-3`} onClick={() => page(1)} disabled={!canNext} aria-label={`Próximos produtos de ${title}`}>
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>
    </section>
  );
}
