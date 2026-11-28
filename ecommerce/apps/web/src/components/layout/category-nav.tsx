"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NavCategory = { slug: string; name: string; subgroups: string[] };

/**
 * Barra de departamentos em uma linha, rolável (setas, roda do mouse e arrastar), com o menu
 * "Todos os departamentos" que abre ao passar o mouse (computador) ou ao tocar (celular).
 */
export function CategoryNav({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const megaRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [megaOpen, setMegaOpen] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const ul = listRef.current;
    if (!ul) return;
    const max = ul.scrollWidth - ul.clientWidth;
    setCanLeft(ul.scrollLeft > 2);
    setCanRight(max > 2 && ul.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!megaRef.current?.contains(t) && !toggleRef.current?.contains(t)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [megaOpen]);

  const hoverCapable = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const openSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMegaOpen(false), 250);
  };

  const activeSlug = pathname.startsWith("/departamento/") ? pathname.split("/")[2] : null;
  const pill =
    "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-[11px] py-[7px] text-[15px] font-semibold text-[#ffe9e7] hover:bg-sun hover:text-sun-foreground min-[861px]:px-3.5 min-[861px]:py-2 min-[861px]:text-base";

  return (
    <nav aria-label="Departamentos" className="relative z-20 bg-brand-deep">
      {canLeft && (
        <button
          type="button"
          className="absolute top-1/2 left-2.5 z-10 grid size-[34px] -translate-y-1/2 place-items-center rounded-full bg-sun text-sun-foreground shadow-md hover:bg-white max-[860px]:hidden"
          aria-label="Ver departamentos anteriores"
          onClick={() => listRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
      )}
      <ul
        ref={listRef}
        onScroll={updateArrows}
        className="wrap no-scrollbar flex gap-1 overflow-x-auto py-1.5 [mask-image:linear-gradient(to_right,#000_82%,transparent)] pr-10 min-[861px]:px-[52px] min-[861px]:[mask-image:none]"
      >
        <li>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={megaOpen}
            aria-controls="menu-departamentos"
            className={cn(pill, "bg-sun text-sun-foreground")}
            onClick={() => setMegaOpen((v) => !v)}
            onPointerEnter={(e) => e.pointerType === "mouse" && hoverCapable() && openSoon()}
            onPointerLeave={(e) => e.pointerType === "mouse" && hoverCapable() && closeSoon()}
          >
            <Menu aria-hidden className="size-4" />
            Todos os departamentos
          </button>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/departamento/${c.slug}`}
              aria-current={activeSlug === c.slug ? "page" : undefined}
              className={cn(pill, activeSlug === c.slug && "bg-sun text-sun-foreground")}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      {canRight && (
        <button
          type="button"
          className="absolute top-1/2 right-2.5 z-10 grid size-[34px] -translate-y-1/2 place-items-center rounded-full bg-sun text-sun-foreground shadow-md hover:bg-white max-[860px]:hidden"
          aria-label="Ver mais departamentos"
          onClick={() => listRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      )}

      <div
        id="menu-departamentos"
        ref={megaRef}
        hidden={!megaOpen}
        className="absolute inset-x-0 top-full z-30"
        onPointerEnter={(e) => e.pointerType === "mouse" && openSoon()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hoverCapable() && closeSoon()}
        // Escolher um departamento fecha o menu
        onClick={(e) => (e.target as HTMLElement).closest("a") && setMegaOpen(false)}
      >
        <div className="wrap max-[860px]:px-0">
          <div
            role="region"
            aria-label="Todos os departamentos"
            className="max-h-[min(76vh,660px)] w-full max-w-[1040px] overflow-y-auto overscroll-contain rounded-b-[var(--radius)] border border-t-4 border-line border-t-sun bg-surface px-[26px] pt-[22px] pb-[18px] text-foreground shadow-[0_18px_40px_rgb(0_0_0/.22)] max-[860px]:max-h-[70vh] max-[860px]:p-4"
          >
            <div className="mb-3.5 flex items-center justify-between gap-3 border-b border-line pb-3">
              <Link href="/busca" className="font-bold hover:underline">
                Ver todos os produtos →
              </Link>
              <button type="button" aria-label="Fechar menu de departamentos" className="text-muted-foreground" onClick={() => setMegaOpen(false)}>
                <X aria-hidden className="size-6" />
              </button>
            </div>
            <div className="columns-2 gap-[18px] [column-width:150px] min-[861px]:columns-4 min-[861px]:gap-7 min-[861px]:[column-width:190px]">
              {categories.map((c) => (
                <div key={c.slug} className="mb-[18px] break-inside-avoid">
                  <Link href={`/departamento/${c.slug}`} className="text-[17px] font-bold text-brand-text hover:underline">
                    {c.name}
                  </Link>
                  <ul className="mt-1">
                    {c.subgroups.map((s) => (
                      <li key={s}>
                        <Link
                          href={`/departamento/${c.slug}?sub=${encodeURIComponent(s)}`}
                          className="block py-1 text-[15px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {s}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
