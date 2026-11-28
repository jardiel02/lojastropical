import type { CartQuote } from "@/modules/cart/pricing";
import type { Customer } from "@/modules/account/config";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/** Loja que atende o pedido: a da cidade do cliente (em Codó, a Matriz). */
export function pickBranch<T extends { slug: string; city: string; isActive: boolean }>(branches: T[], city: string | null): T | null {
  if (!city) return null;
  const inCity = branches
    .filter((b) => b.isActive && norm(b.city) === norm(city))
    .sort((a, b) => (a.slug === "loja-matriz" ? -1 : b.slug === "loja-matriz" ? 1 : a.slug.localeCompare(b.slug)));
  return inCity[0] ?? null;
}

export type CartProblem = "empty" | "removed" | "no-price" | "out-of-stock";

/** Só dá para pagar online um carrinho com todos os itens com preço e disponíveis. */
export function cartProblem(quote: CartQuote): CartProblem | null {
  if (!quote.lines.length) return "empty";
  if (quote.removed.length) return "removed";
  if (quote.itemsWithoutPrice > 0) return "no-price";
  if (quote.lines.some((l) => l.outOfStock)) return "out-of-stock";
  return null;
}

export const CART_PROBLEM_MESSAGE: Record<CartProblem, string> = {
  empty: "Seu carrinho está vazio.",
  removed: "Algum produto do carrinho saiu do catálogo. Confira o carrinho e tente de novo.",
  "no-price": "Há item sem preço à vista no carrinho. Envie esse pedido pelo WhatsApp.",
  "out-of-stock": "Há item esgotado no carrinho. Tire-o do carrinho ou fale com a loja no WhatsApp.",
};

/** Campos do cadastro que a entrega e a nota precisam. */
export function missingCustomerFields(c: Customer): (keyof Customer)[] {
  const required: (keyof Customer)[] = ["nome", "cpf", "celular", "cep", "rua", "numero", "bairro", "cidade"];
  return required.filter((k) => !c[k]?.trim());
}
