import { MAX_LINES, MAX_QTY_PER_LINE, type CartLineInput } from "@/modules/cart/schema";

const STORAGE_KEY = "lt-carrinho-v2";
const LEGACY_KEY = "tropical-carrinho"; // carrinho do site original ({ id, cor, foto, qtd })

export type CartAction =
  | { type: "add"; line: CartLineInput }
  | { type: "setQty"; slug: string; color: string | null; qty: number }
  | { type: "remove"; slug: string; color: string | null }
  | { type: "clear" };

const same = (a: CartLineInput, slug: string, color: string | null) => a.slug === slug && a.color === color;
const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.trunc(n)));

export function cartReducer(state: CartLineInput[], action: CartAction): CartLineInput[] {
  switch (action.type) {
    case "add": {
      const existing = state.find((l) => same(l, action.line.slug, action.line.color));
      if (existing) return state.map((l) => (l === existing ? { ...l, qty: clamp(l.qty + action.line.qty) } : l));
      if (state.length >= MAX_LINES) return state;
      return [...state, { ...action.line, qty: clamp(action.line.qty) }];
    }
    case "setQty":
      return action.qty < 1
        ? state.filter((l) => !same(l, action.slug, action.color))
        : state.map((l) => (same(l, action.slug, action.color) ? { ...l, qty: clamp(action.qty) } : l));
    case "remove":
      return state.filter((l) => !same(l, action.slug, action.color));
    case "clear":
      return [];
  }
}

function readStorage(): CartLineInput[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (l): l is CartLineInput =>
              typeof l?.slug === "string" && (l.color === null || typeof l.color === "string") && Number.isInteger(l.qty) && l.qty > 0,
          )
          .slice(0, MAX_LINES);
      }
    }
    const legacy: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    if (Array.isArray(legacy)) {
      return legacy
        .filter((l) => typeof l?.id === "string" && Number.isInteger(l.qtd))
        .map((l) => ({ slug: l.id as string, color: typeof l.cor === "string" ? l.cor : null, qty: clamp(l.qtd as number) }))
        .slice(0, MAX_LINES);
    }
  } catch {
    /* navegador sem armazenamento: carrinho só nesta visita */
  }
  return [];
}

/** Carrinho do visitante guardado no navegador (sincroniza entre abas). Para clientes logados, o banco assume na etapa 7. */
let lines: CartLineInput[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: CartLineInput[] = [];

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        lines = readStorage();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): CartLineInput[] {
    lines ??= readStorage();
    return lines;
  },
  getServerSnapshot(): CartLineInput[] {
    return EMPTY;
  },
  dispatch(action: CartAction) {
    lines = cartReducer(cartStore.getSnapshot(), action);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignora */
    }
    listeners.forEach((l) => l());
  },
};
