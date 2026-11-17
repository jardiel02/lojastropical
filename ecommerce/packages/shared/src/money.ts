/**
 * Dinheiro sempre em centavos inteiros. Nunca use number com casas decimais
 * para somar, multiplicar ou dividir valores financeiros.
 */
declare const centsBrand: unique symbol;
export type Cents = number & { readonly [centsBrand]: true };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Valor em centavos inválido: ${value}`);
  }
  return value as Cents;
}

/**
 * Converte um valor em reais vindo de fontes externas (planilha, ERP, dados legados)
 * para centavos. Aceita number (ex.: 1099.9) ou string ("1.099,90" / "1099.90").
 */
export function fromReais(value: number | string): Cents {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError(`Preço inválido: ${value}`);
    return cents(Math.round(value * 100));
  }
  const raw = value.trim().replace(/[^\d,.-]/g, "");
  if (!raw) throw new RangeError(`Preço inválido: "${value}"`);
  // "1.099,90" (pt-BR) ou "1099.90" (API)
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const [intPart = "0", fracPart = ""] = normalized.split(".");
  const sign = intPart.startsWith("-") ? -1 : 1;
  const intDigits = intPart.replace("-", "") || "0";
  const frac = (fracPart + "00").slice(0, 2);
  const roundUp = Number((fracPart + "000")[2] ?? "0") >= 5 ? 1 : 0;
  return cents(sign * (Number(intDigits) * 100 + Number(frac) + roundUp));
}

export function addCents(...values: Cents[]): Cents {
  return cents(values.reduce<number>((total, v) => total + v, 0));
}

export function multiplyCents(value: Cents, quantity: number): Cents {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantidade inválida: ${quantity}`);
  }
  return cents(value * quantity);
}

/**
 * Divide um total em N parcelas iguais em centavos. A diferença de arredondamento
 * vai para a primeira parcela, para que a soma das parcelas seja exatamente o total.
 */
export function splitInstallments(total: Cents, count: number): Cents[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`Número de parcelas inválido: ${count}`);
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => cents(i === 0 ? base + remainder : base));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: Cents): string {
  return brl.format(value / 100);
}
