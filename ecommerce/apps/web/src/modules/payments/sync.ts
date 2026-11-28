import "server-only";
import { getPrisma, Prisma } from "@lojas-tropical/database";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { mpAccessToken } from "./config";
import { intentStatusFrom, methodFrom, orderPaymentStatusFrom, shouldApply } from "./status";

/**
 * Consulta o pagamento NA API do Mercado Pago (nunca confia no que veio no aviso ou na
 * URL de retorno) e atualiza o pedido. Avisos repetidos não mudam nada: cada situação do
 * pagamento grava uma linha única em payment_transactions.
 */
export async function syncMercadoPagoPayment(paymentId: string, origin: "webhook" | "retorno") {
  if (!/^\d{1,20}$/.test(paymentId)) return null;
  const client = new MercadoPagoConfig({ accessToken: mpAccessToken(), options: { timeout: 10_000 } });
  const payment = await new Payment(client).get({ id: paymentId });
  const orderId = payment.external_reference;
  if (!payment.id || !orderId) return null;

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentIntents: { where: { provider: "MERCADO_PAGO" }, take: 1 } },
  });
  const intent = order?.paymentIntents[0];
  if (!order || !intent) {
    console.warn("Mercado Pago: pagamento sem pedido conhecido", { paymentId, origin });
    return null;
  }

  const id = String(payment.id);
  const status = payment.status ?? "pending";
  const amountCents = Math.round((payment.transaction_amount ?? 0) * 100);
  const eventId = `mp:${id}:${status}:${payment.status_detail ?? ""}:${payment.date_last_updated ?? ""}`;

  try {
    await prisma.paymentTransaction.create({
      data: {
        paymentIntentId: intent.id,
        type: "payment",
        status,
        amountCents,
        providerEventId: eventId,
        providerTransactionId: id,
        // Só o necessário para conferência; nada de dados pessoais do pagador
        rawPayload: {
          origem: origin,
          status,
          status_detail: payment.status_detail ?? null,
          payment_type_id: payment.payment_type_id ?? null,
          payment_method_id: payment.payment_method_id ?? null,
          installments: payment.installments ?? null,
          currency_id: payment.currency_id ?? null,
          transaction_amount: payment.transaction_amount ?? null,
          live_mode: payment.live_mode ?? null,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return order; // já registrado
    throw error;
  }

  const nextIntent = intentStatusFrom(status);
  if (!shouldApply({ status: intent.status, providerPaymentId: intent.providerPaymentId }, { id, status: nextIntent })) {
    if (nextIntent === "APPROVED") {
      // Segundo pagamento aprovado para o mesmo pedido: a loja precisa estornar um deles
      await prisma.orderEvent.create({ data: { orderId: order.id, type: "payment_duplicate", payload: { payment_id: id } } });
    }
    return order;
  }

  // Valor ou moeda diferentes do pedido: não marca como pago, fica para conferência
  const amountOk = payment.currency_id === "BRL" && amountCents >= order.totalCents;
  let nextOrder = orderPaymentStatusFrom(status);
  if (nextOrder === "PAID" && !amountOk) {
    nextOrder = "PENDING";
    await prisma.orderEvent.create({ data: { orderId: order.id, type: "payment_amount_mismatch", payload: { payment_id: id, amountCents, currency: payment.currency_id ?? null } } });
  }

  return prisma.$transaction(async (tx) => {
    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: {
        status: nextIntent,
        providerPaymentId: id,
        method: methodFrom(payment.payment_type_id, payment.payment_method_id),
        installments: payment.installments ?? 1,
        statusDetail: payment.status_detail ?? null,
      },
    });
    if (order.paymentStatus === nextOrder) return order;
    await tx.orderEvent.create({
      data: { orderId: order.id, type: "payment_status_changed", fromStatus: order.paymentStatus, toStatus: nextOrder, payload: { payment_id: id, origem: origin } },
    });
    return tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: nextOrder, ...(nextOrder === "PAID" && !order.paidAt ? { paidAt: new Date() } : {}) },
      include: { paymentIntents: { where: { provider: "MERCADO_PAGO" }, take: 1 } },
    });
  });
}
