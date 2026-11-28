"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { CardProduct } from "@/lib/card";
import { imageSrc } from "@/lib/product-view";
import { wa } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ProductPrice } from "./product-price";

export function ProductCard({ product: p, priority = false }: { product: CardProduct; priority?: boolean }) {
  const [color, setColor] = useState(0);
  const soldOut = p.stockQuantity !== null && p.stockQuantity <= 0;
  const href = `/produto/${p.slug}${color > 0 ? `?cor=${color}` : ""}`;
  const image = p.colors.length > 1 ? (p.colors[color]?.image ?? p.cover) : p.cover;

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-surface transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(156_10_16/.14)] focus-within:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={href} className="relative block aspect-square bg-white" aria-label={`Ver ${p.name}`} tabIndex={-1}>
        {soldOut && (
          <span className="absolute top-2.5 left-2.5 z-[1] rounded-full bg-[#6e6360] px-2 py-0.5 text-[11px] font-bold tracking-[.04em] text-white uppercase">
            Esgotado
          </span>
        )}
        <Image
          src={imageSrc(image)}
          alt={p.name}
          fill
          sizes="(max-width: 480px) 46vw, 230px"
          priority={priority}
          className={cn(p.coverFit === "cover" && color === 0 ? "object-cover" : "object-contain")}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 min-[481px]:px-4 min-[481px]:pt-3.5 min-[481px]:pb-4">
        <span className="text-xs font-semibold tracking-[.08em] text-muted-foreground uppercase">{p.category}</span>
        <h3 className="font-sans text-sm leading-snug font-semibold min-[481px]:text-base">
          <Link href={href} className="hover:underline">
            {p.name}
          </Link>
        </h3>
        {p.colors.length > 1 && (
          <>
            <span className="text-xs text-muted-foreground">{p.colors.length} cores: toque para escolher</span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5" role="group" aria-label="Cores">
              {p.colors.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  aria-label={`Cor ${c.name}`}
                  aria-pressed={i === color}
                  onClick={() => setColor(i)}
                  className={cn(
                    "size-6 flex-none rounded-full border-2 border-white p-0",
                    i === color ? "shadow-[0_0_0_2px_var(--brand)]" : "shadow-[0_0_0_1px_#b9aca7]",
                  )}
                  style={{ background: c.css }}
                />
              ))}
            </div>
          </>
        )}
        <ProductPrice product={p} />
        <div className="mt-auto grid gap-2 pt-3">
          <Link href={href} className="flex items-center justify-center rounded-[10px] bg-brand p-2.5 text-sm font-bold text-white">
            Ver produto
          </Link>
          <a
            href={wa(`${soldOut ? "Olá! Vim pelo site e quero saber quando chega: " : "Olá! Vim pelo site e quero comprar: "}${p.name}`)}
            target="_blank"
            rel="noopener"
            className="flex items-center justify-center gap-2 rounded-[10px] bg-whatsapp p-2.5 text-sm font-bold text-whatsapp-foreground"
          >
            <MessageCircle aria-hidden className="size-[18px]" />
            {soldOut ? "Avise quando chegar" : "Comprar pelo WhatsApp"}
          </a>
        </div>
      </div>
    </article>
  );
}
