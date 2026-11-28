import { describe, expect, it } from "vitest";
import type { CartQuote } from "@/modules/cart/pricing";
import { cartProblem, missingCustomerFields, pickBranch } from "./checkout-rules";

const branches = [
  { slug: "loja-avenida", city: "Codó", isActive: true },
  { slug: "loja-matriz", city: "Codó", isActive: true },
  { slug: "loja-coroata", city: "Coroatá", isActive: true },
  { slug: "loja-timbiras", city: "Timbiras", isActive: false },
];

const line = { slug: "a", name: "A", color: null, image: "", qty: 1, unitCashCents: 100, manualInstallmentCents: null, lineTotalCents: 100, outOfStock: false, priceLabel: "" };
const quote = (over: Partial<CartQuote> = {}, lineOver = {}): CartQuote =>
  ({ lines: [{ ...line, ...lineOver }], subtotalCents: 100, itemsWithoutPrice: 0, removed: [], ...over }) as CartQuote;

describe("regras do pagamento online", () => {
  it("escolhe a loja da cidade do cliente, Matriz em Codó", () => {
    expect(pickBranch(branches, "codo")?.slug).toBe("loja-matriz");
    expect(pickBranch(branches, "Coroatá")?.slug).toBe("loja-coroata");
    expect(pickBranch(branches, "Timbiras")).toBeNull();
    expect(pickBranch(branches, "São Luís")).toBeNull();
    expect(pickBranch(branches, null)).toBeNull();
  });

  it("só libera carrinho com preço e estoque", () => {
    expect(cartProblem(quote())).toBeNull();
    expect(cartProblem(quote({ lines: [] }))).toBe("empty");
    expect(cartProblem(quote({ itemsWithoutPrice: 1 }))).toBe("no-price");
    expect(cartProblem(quote({}, { outOfStock: true }))).toBe("out-of-stock");
    expect(cartProblem(quote({ removed: [{ slug: "x", reason: "not-found" }] }))).toBe("removed");
  });

  it("aponta o que falta no cadastro", () => {
    const c = { id: "1", nome: "Maria", cpf: "52998224725", celular: "99981771035", cep: "65400000", rua: "Rua A", numero: "1", complemento: null, bairro: "Centro", cidade: "Codó" };
    expect(missingCustomerFields(c)).toEqual([]);
    expect(missingCustomerFields({ ...c, cpf: null, numero: " " })).toEqual(["cpf", "numero"]);
  });
});
