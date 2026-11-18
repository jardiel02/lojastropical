import { createHmac, timingSafeEqual } from "node:crypto";

export type SignatureInput = {
  /** Cabeçalho x-signature: "ts=1704908010,v1=618c8534…" */
  xSignature: string | null;
  /** Cabeçalho x-request-id */
  xRequestId: string | null;
  /** data.id do aviso (vem na URL; o corpo é a alternativa) */
  dataId: string | null;
  secret: string;
};

/** Lê "ts=…,v1=…" sem depender da ordem nem de espaços. */
export function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const i = piece.indexOf("=");
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  return { ts: parts.ts, v1: parts.v1 };
}

/** Texto assinado pelo Mercado Pago. Um data.id com letras vai em minúsculas. */
export function signatureManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
}

/**
 * Confere a assinatura (HMAC-SHA256 com a chave secreta do webhook) antes de qualquer
 * uso do aviso. Comparação em tempo constante. Falta de qualquer parte = inválido.
 */
export function verifyMercadoPagoSignature({ xSignature, xRequestId, dataId, secret }: SignatureInput): boolean {
  if (!secret || !xSignature || !xRequestId || !dataId) return false;
  const { ts, v1 } = parseSignatureHeader(xSignature);
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const expected = createHmac("sha256", secret).update(signatureManifest(dataId, xRequestId, ts)).digest();
  return timingSafeEqual(expected, Buffer.from(v1, "hex"));
}
