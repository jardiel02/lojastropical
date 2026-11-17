"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-provider";

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative inline-flex h-11 items-center gap-2 rounded-full border-2 border-white/55 px-3.5 font-bold text-white hover:bg-white/12"
      aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
    >
      <ShoppingCart aria-hidden className="size-[22px]" strokeWidth={2} />
      <span className="max-[480px]:hidden">Carrinho</span>
      <span
        aria-hidden
        className="absolute -top-2 -right-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-sun px-1.5 text-xs font-bold text-sun-foreground tabular-nums"
      >
        {count}
      </span>
    </button>
  );
}
