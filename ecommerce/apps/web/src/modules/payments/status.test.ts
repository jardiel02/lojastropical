import { describe, expect, it } from "vitest";
import { intentStatusFrom, methodFrom, orderPaymentStatusFrom, shouldApply } from "./status";

describe("situação do pagamento", () => {
  it("traduz o status do Mercado Pago para o pedido", () => {
    expect([intentStatusFrom("approved"), orderPaymentStatusFrom("approved")]).toEqual(["APPROVED", "PAID"]);
    expect([intentStatusFrom("in_process"), orderPaymentStatusFrom("in_process")]).toEqual(["PENDING", "PENDING"]);
    expect([intentStatusFrom("rejected"), orderPaymentStatusFrom("rejected")]).toEqual(["REJECTED", "FAILED"]);
    expect([intentStatusFrom("refunded"), orderPaymentStatusFrom("refunded")]).toEqual(["REFUNDED", "REFUNDED"]);
    expect(intentStatusFrom("charged_back")).toBe("CHARGED_BACK");
    expect(intentStatusFrom("qualquer-coisa")).toBe("PENDING");
  });

  it("reconhece Pix e cartão", () => {
    expect(methodFrom("bank_transfer", "pix")).toBe("PIX");
    expect(methodFrom("credit_card", "visa")).toBe("CREDIT_CARD");
    expect(methodFrom("account_money", "account_money")).toBe("MERCADO_PAGO_CHECKOUT");
  });

  it("não deixa outra tentativa desfazer um pagamento aprovado", () => {
    const paid = { status: "APPROVED" as const, providerPaymentId: "1" };
    expect(shouldApply(paid, { id: "2", status: "REJECTED" })).toBe(false);
    expect(shouldApply(paid, { id: "2", status: "APPROVED" })).toBe(false);
    expect(shouldApply(paid, { id: "1", status: "REFUNDED" })).toBe(true);
    expect(shouldApply(paid, { id: "1", status: "PENDING" })).toBe(false);
    expect(shouldApply({ status: "REJECTED", providerPaymentId: "1" }, { id: "2", status: "APPROVED" })).toBe(true);
    expect(shouldApply({ status: "CREATED", providerPaymentId: null }, { id: "1", status: "PENDING" })).toBe(true);
  });
});
