"use client";

import Image from "next/image";
import Link from "next/link";
import { formatBRL } from "@lojas-tropical/shared";
import type { QuotedLine } from "@/modules/cart/pricing";
import { MAX_QTY_PER_LINE } from "@/modules/cart/schema";
import { imageSrc } from "@/lib/product-view";
import { useCart } from "./cart-provider";

export function CartItem({ line }: { line: QuotedLine }) {
  const { setQty, remove, setOpen } = useCart();
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-line py-3.5">
      <Image
        src={imageSrc(line.image)}
        alt=""
        width={72}
        height={72}
        className="size-[72px] rounded-lg border border-line bg-white object-contain"
      />
      <div className="min-w-0">
        <Link href={`/produto/${line.slug}`} onClick={() => setOpen(false)} className="block text-sm leading-snug font-bold hover:underline">
          {line.name}
        </Link>
        <span className="text-[13px] text-muted-foreground">
          {line.color ? `Cor: ${line.color} · ` : ""}
          {line.priceLabel}
        </span>
        {line.outOfStock && <span className="block text-[13px] font-bold text-danger">Esgotado no momento</span>}
        <div className="mt-1.5 flex items-center gap-2.5">
          <button
            type="button"
            className="size-[30px] rounded-lg border border-line bg-surface font-bold"
            onClick={() => setQty(line.slug, line.color, line.qty - 1)}
            aria-label={`Diminuir quantidade de ${line.name}`}
          >
            −
          </button>
          <span className="min-w-5 text-center tabular-nums" aria-label={`Quantidade: ${line.qty}`}>
            {line.qty}
          </span>
          <button
            type="button"
            className="size-[30px] rounded-lg border border-line bg-surface font-bold disabled:opacity-40"
            onClick={() => setQty(line.slug, line.color, line.qty + 1)}
            disabled={line.qty >= MAX_QTY_PER_LINE}
            aria-label={`Aumentar quantidade de ${line.name}`}
          >
            +
          </button>
          <button
            type="button"
            className="h-[30px] rounded-lg border border-line bg-surface px-2.5 text-[13px] font-semibold text-brand-text"
            onClick={() => remove(line.slug, line.color)}
          >
            Remover
          </button>
          {line.lineTotalCents !== null && (
            <span className="ml-auto text-sm font-bold tabular-nums">{formatBRL(line.lineTotalCents)}</span>
          )}
        </div>
      </div>
    </li>
  );
}
