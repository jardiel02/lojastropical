"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getImageProps } from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/modules/campaigns";
import { cn } from "@/lib/utils";

const INTERVAL = 6000;

function BannerPicture({ banner, eager }: { banner: Banner; eager: boolean }) {
  const common = { alt: banner.alt, sizes: "100vw", priority: eager, loading: eager ? undefined : ("lazy" as const) };
  const { props: desktop } = getImageProps({ ...common, ...banner.desktop, quality: 80 });
  const { props: mobile } = getImageProps({ ...common, ...banner.mobile, quality: 80 });
  return (
    <picture className="mx-auto block max-w-[620px] min-[861px]:max-w-none">
      <source media="(min-width: 861px)" srcSet={desktop.srcSet} width={banner.desktop.width} height={banner.desktop.height} />
      <source srcSet={mobile.srcSet} width={banner.mobile.width} height={banner.mobile.height} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt vem de getImageProps */}
      <img {...desktop} className="block h-auto w-full" style={{ aspectRatio: "auto" }} />
    </picture>
  );
}

/** No celular o texto aparece abaixo da foto (como no site original); no computador ele está na arte. */
function BannerCopy({ banner: b }: { banner: Banner }) {
  const box = {
    dark: "text-white",
    cream: "text-[#55241d]",
    light: "mx-6 mb-6 rounded-3xl bg-[#c90012] px-4 py-6 text-white",
  }[b.theme];
  const h2 = {
    dark: "text-[clamp(27px,7vw,42px)]",
    cream: "rounded-[18px] bg-[#cf0011] px-3 py-[18px] text-[clamp(22px,5.8vw,34px)] text-white",
    light: "text-[clamp(25px,6vw,38px)]",
  }[b.theme];
  return (
    <span className={cn("block px-6 pt-1 pb-8 text-center max-[860px]:block min-[861px]:sr-only", b.theme === "light" && "px-0 pb-0", box)}>
      <span className={cn("block font-[Arial,Helvetica,sans-serif] leading-[1.1] font-bold tracking-[-.035em]", h2)}>
        {b.headingLines.map((line, li) => (
          <span key={li} className="block">
            {line.map((part, pi) => (
              <span key={pi} className={part.hl ? "text-[#ffd400]" : undefined}>
                {part.t}
              </span>
            ))}
          </span>
        ))}
      </span>
      <span className={cn("mt-3.5 mb-5 block text-base", b.theme === "dark" ? "text-[#f1eeee]" : b.theme === "cream" ? "text-[#55241d]" : "")}>{b.text}</span>
      <span
        className={cn(
          "inline-flex max-w-full items-center justify-center rounded-[10px] px-6 py-[13px] text-[19px] font-bold",
          b.theme === "light" ? "bg-[#ffd400] px-4 text-[17px] text-[#b40013]" : "bg-[#e00000] text-white",
        )}
      >
        {b.cta}
      </span>
    </span>
  );
}

/** Carrossel de banners com pausa ao passar o mouse/foco, respeita "reduzir movimento". */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [announce, setAnnounce] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const count = banners.length;

  const show = useCallback(
    (i: number, speak = false) => {
      const next = (i + count) % count;
      setCurrent(next);
      if (speak) setAnnounce(`${next + 1} de ${count}: ${banners[next]?.label ?? ""}`);
    },
    [count, banners],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || paused || count < 2) return;
    const t = setTimeout(() => show(current + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [current, paused, count, show]);

  const arrow =
    "absolute top-[min(28.28vw,175px)] z-[2] grid size-11 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#bd0013] text-white opacity-65 shadow-[0_2px_10px_rgb(0_0_0/.16)] hover:bg-[#8c0010] hover:opacity-90 focus-visible:opacity-90 min-[861px]:top-1/2";

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques da Lojas Tropical"
      className="[--focus-ring:#b40013]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !rootRef.current?.contains(e.relatedTarget) && setPaused(false)}
    >
      <div className="relative isolate grid bg-[#050101]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${count}: ${b.label}`}
            aria-hidden={i !== current}
            inert={i !== current}
            className={cn(
              "[grid-area:1/1] min-w-0 transition-[opacity,visibility] duration-350 motion-reduce:transition-none",
              i === current ? "visible z-[1] opacity-100" : "invisible pointer-events-none opacity-0",
              b.id === "praticidade" && "bg-[#f6e9db]",
              b.id === "casa-completa" && "bg-[#f5f5f5]",
            )}
          >
            <Link href={b.href} className="relative mx-auto block max-w-[1920px] focus-visible:outline-offset-[-4px]">
              <BannerPicture banner={b} eager={i === 0} />
              <BannerCopy banner={b} />
            </Link>
          </div>
        ))}
        {count > 1 && (
          <>
            <button type="button" className={cn(arrow, "left-2 min-[861px]:left-3")} aria-label="Banner anterior" onClick={() => show(current - 1, true)}>
              <ChevronLeft aria-hidden className="size-6" strokeWidth={2.5} />
            </button>
            <button type="button" className={cn(arrow, "right-2 min-[861px]:right-3")} aria-label="Próximo banner" onClick={() => show(current + 1, true)}>
              <ChevronRight aria-hidden className="size-6" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="flex items-center justify-center border-b border-line bg-surface px-3" role="group" aria-label="Escolher banner">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Mostrar banner ${i + 1}: ${b.label}`}
              aria-pressed={i === current}
              onClick={() => show(i, true)}
              className="group grid h-6 w-9 place-items-center rounded-full"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none",
                  i === current ? "w-[22px] bg-[#c90012]" : "w-2 bg-[#b4aaa9]",
                )}
              />
            </button>
          ))}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
