"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CartLineInput } from "@/modules/cart/schema";
import type { CartQuote } from "@/modules/cart/pricing";
import { cartStore } from "./cart-store";

export { cartReducer } from "./cart-store";

const EMPTY_QUOTE: CartQuote = { lines: [], subtotalCents: 0 as CartQuote["subtotalCents"], itemsWithoutPrice: 0, removed: [] };

type CartContextValue = {
  lines: CartLineInput[];
  count: number;
  quote: CartQuote | null;
  quoteError: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: CartLineInput) => void;
  setQty: (slug: string, color: string | null, qty: number) => void;
  remove: (slug: string, color: string | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const [open, setOpen] = useState(false);
  const [lastQuote, setLastQuote] = useState<CartQuote | null>(null);
  const [quoteError, setQuoteError] = useState(false);

  // Preços e disponibilidade vêm do servidor a cada mudança do carrinho
  useEffect(() => {
    if (!lines.length) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: lines }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CartQuote;
        setLastQuote(data);
        setQuoteError(false);
        // Produto que saiu do catálogo some do carrinho
        for (const r of data.removed) cartStore.dispatch({ type: "remove", slug: r.slug, color: null });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setQuoteError(true);
      }
    }, 150);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [lines]);

  // Mostra o último cálculo enquanto o novo chega (evita piscar ao mudar quantidade)
  const quote = lines.length ? lastQuote : EMPTY_QUOTE;

  const add = useCallback((line: CartLineInput) => cartStore.dispatch({ type: "add", line }), []);
  const setQty = useCallback((slug: string, color: string | null, qty: number) => cartStore.dispatch({ type: "setQty", slug, color, qty }), []);
  const remove = useCallback((slug: string, color: string | null) => cartStore.dispatch({ type: "remove", slug, color }), []);
  const clear = useCallback(() => cartStore.dispatch({ type: "clear" }), []);

  const value = useMemo<CartContextValue>(
    () => ({ lines, count: lines.reduce((s, l) => s + l.qty, 0), quote, quoteError, open, setOpen, add, setQty, remove, clear }),
    [lines, quote, quoteError, open, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
