import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseSignatureHeader, signatureManifest, verifyMercadoPagoSignature } from "./signature";

const secret = "segredo-de-teste";
const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

describe("assinatura do webhook do Mercado Pago", () => {
  const ts = "1704908010";
  const v1 = sign("id:123456;request-id:req-1;ts:1704908010;");

  it("aceita o aviso assinado com a chave certa", () => {
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret })).toBe(true);
    expect(verifyMercadoPagoSignature({ xSignature: ` v1=${v1} , ts=${ts} `, xRequestId: "req-1", dataId: "123456", secret })).toBe(true);
  });

  it("recusa assinatura de outro aviso, outra chave ou partes faltando", () => {
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "999", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-2", dataId: "123456", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret: "outra" })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts}`, xRequestId: "req-1", dataId: "123456", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=abc`, xRequestId: "req-1", dataId: "123456", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: null, xRequestId: "req-1", dataId: "123456", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "123456", secret: "" })).toBe(false);
  });

  it("monta o texto assinado com o id em minúsculas", () => {
    expect(signatureManifest("ABC123", "r", "1")).toBe("id:abc123;request-id:r;ts:1;");
    expect(parseSignatureHeader("ts=1,v1=2")).toEqual({ ts: "1", v1: "2" });
  });
});
