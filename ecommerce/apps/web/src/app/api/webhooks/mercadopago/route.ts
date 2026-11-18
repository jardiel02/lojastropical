import { after } from "next/server";
import { mpWebhookSecret, onlinePaymentReady } from "@/modules/payments/config";
import { verifyMercadoPagoSignature } from "@/modules/payments/signature";
import { syncMercadoPagoPayment } from "@/modules/payments/sync";

/**
 * Aviso de pagamento (webhook) do Mercado Pago.
 * 1. Confere a assinatura (x-signature, HMAC com a chave secreta) antes de qualquer coisa.
 * 2. Responde 200 na hora; a consulta do pagamento roda depois da resposta.
 * 3. O pedido só muda com o que a API do Mercado Pago confirmar (syncMercadoPagoPayment).
 */
export async function POST(request: Request) {
  const secret = mpWebhookSecret();
  if (!secret || !onlinePaymentReady()) return new Response(null, { status: 503 });

  const url = new URL(request.url);
  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    // Alguns avisos vêm só com os dados na URL
  }
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type ?? null;

  const valid = verifyMercadoPagoSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secret,
  });
  if (!valid) return new Response(null, { status: 401 });

  if (type === "payment" && dataId) {
    after(async () => {
      try {
        await syncMercadoPagoPayment(dataId, "webhook");
      } catch (error) {
        // Fica no log; a página de retorno e um novo aviso refazem a consulta sem duplicar nada
        console.error("Webhook Mercado Pago: falha ao atualizar o pedido", { dataId, error: error instanceof Error ? error.message : error });
      }
    });
  }
  return new Response(null, { status: 200 });
}
