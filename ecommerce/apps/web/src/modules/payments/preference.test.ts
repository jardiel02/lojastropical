import { describe, expect, it } from "vitest";
import { buildPreferenceBody, isPublicHttpsUrl, type PreferenceInput } from "./preference";

const base: PreferenceInput = {
  orderId: "ck_pedido",
  orderNumber: 7,
  items: [{ id: "geladeira-x:Branco", title: "Geladeira X", quantity: 2, unitPriceCents: 249990 }],
  payer: { email: "cliente@example.com", name: "Maria", cpf: "52998224725" },
  appUrl: "http://localhost:3000",
};

describe("preferência do Checkout Pro", () => {
  it("em localhost não pede retorno automático nem aviso", () => {
    const body = buildPreferenceBody(base);
    expect(body).not.toHaveProperty("auto_return");
    expect(body).not.toHaveProperty("notification_url");
    expect(body.back_urls.success).toBe("http://localhost:3000/pedido/retorno");
  });

  it("com endereço público HTTPS liga retorno automático e aviso só de webhook", () => {
    const body = buildPreferenceBody({ ...base, appUrl: "https://loja.example.com" });
    expect(body).toMatchObject({
      auto_return: "approved",
      notification_url: "https://loja.example.com/api/webhooks/mercadopago?source_news=webhooks",
    });
  });

  it("leva preço em reais, referência do pedido, só Pix e cartão em até 12x", () => {
    const body = buildPreferenceBody(base);
    expect(body.items[0]).toEqual({ id: "geladeira-x:Branco", title: "Geladeira X", quantity: 2, unit_price: 2499.9, currency_id: "BRL" });
    expect(body.external_reference).toBe("ck_pedido");
    expect(body.payment_methods).toEqual({ excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 12 });
    expect(body.payer).toEqual({ email: "cliente@example.com", name: "Maria", identification: { type: "CPF", number: "52998224725" } });
  });

  it("reconhece endereço público", () => {
    expect(isPublicHttpsUrl("https://lojastropical.vercel.app")).toBe(true);
    expect(isPublicHttpsUrl("https://localhost:3000")).toBe(false);
    expect(isPublicHttpsUrl("http://loja.example.com")).toBe(false);
  });
});
