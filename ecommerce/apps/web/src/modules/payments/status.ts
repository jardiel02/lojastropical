/** Situações do pagamento no Mercado Pago (GET /v1/payments/{id} → status). */
export type MpPaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

export type IntentStatus = "CREATED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "CHARGED_BACK";
export type OrderPaymentStatus = "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED";
export type IntentMethod = "PIX" | "CREDIT_CARD" | "MERCADO_PAGO_CHECKOUT";

export function intentStatusFrom(status: string): IntentStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "charged_back":
      return "CHARGED_BACK";
    default: // pending, authorized, in_process, in_mediation
      return "PENDING";
  }
}

export function orderPaymentStatusFrom(status: string): OrderPaymentStatus {
  switch (status) {
    case "approved":
      return "PAID";
    case "authorized":
      return "AUTHORIZED";
    case "rejected":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

/** Pix chega como bank_transfer; cartão de crédito como credit_card. */
export function methodFrom(paymentTypeId: string | null | undefined, paymentMethodId: string | null | undefined): IntentMethod {
  if (paymentMethodId === "pix" || paymentTypeId === "bank_transfer") return "PIX";
  if (paymentTypeId === "credit_card") return "CREDIT_CARD";
  return "MERCADO_PAGO_CHECKOUT";
}

/**
 * Um pagamento já aprovado não volta para trás por causa de outra tentativa (ex.: o cliente
 * tentou um cartão recusado e depois pagou no Pix). Só estorno ou contestação do MESMO
 * pagamento mudam um pedido pago.
 */
export function shouldApply(current: { status: IntentStatus; providerPaymentId: string | null }, incoming: { id: string; status: IntentStatus }): boolean {
  if (current.status !== "APPROVED" && current.status !== "REFUNDED" && current.status !== "CHARGED_BACK") return true;
  if (current.providerPaymentId !== incoming.id) return false;
  return incoming.status !== "PENDING";
}
