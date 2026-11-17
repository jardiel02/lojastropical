import { describe, expect, it } from "vitest";
import { addCents, cents, formatBRL, fromReais, multiplyCents, splitInstallments } from "./money";

describe("dinheiro em centavos", () => {
  it("converte reais em centavos sem erro de ponto flutuante", () => {
    expect(fromReais(1099.9)).toBe(109990);
    expect(fromReais(0.1 + 0.2)).toBe(30);
    expect(fromReais(129.9)).toBe(12990);
    expect(fromReais("1.099,90")).toBe(109990);
    expect(fromReais("1099.90")).toBe(109990);
    expect(fromReais("R$ 2.299,00")).toBe(229900);
  });

  it("recusa valores inválidos", () => {
    expect(() => fromReais(Number.NaN)).toThrow();
    expect(() => fromReais("")).toThrow();
    expect(() => cents(10.5)).toThrow();
    expect(() => multiplyCents(cents(100), 1.5)).toThrow();
  });

  it("soma e multiplica em inteiros", () => {
    expect(addCents(cents(10), cents(20), cents(30))).toBe(60);
    expect(multiplyCents(cents(109900), 3)).toBe(329700);
  });

  it("divide parcelas sem perder centavos", () => {
    const parts = splitInstallments(cents(100000), 12);
    expect(parts).toHaveLength(12);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100000);
    expect(parts[0]).toBe(8337);
    expect(parts[1]).toBe(8333);
    expect(() => splitInstallments(cents(100), 0)).toThrow();
  });

  it("formata em reais", () => {
    expect(formatBRL(cents(109900)).replace(/\s/g, " ")).toBe("R$ 1.099,00");
  });
});
