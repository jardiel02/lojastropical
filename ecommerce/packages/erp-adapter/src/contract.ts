/**
 * Contrato interno de integração com o ERP. O backend do e-commerce conversa SÓ com esta
 * interface; cada fornecedor de ERP ganha um adaptador próprio. Valores em centavos.
 */

export type ErpCapability =
  | "products.read"
  | "prices.read"
  | "stock.read"
  | "stock.readByBranch"
  | "stock.reserve"
  | "orders.submit";

export type ErpProduct = { erpCode: string; name: string; active: boolean };
export type ErpPrice = { erpCode: string; priceCents: number; priceTable: string; validFrom: string; validUntil: string };
export type ErpStockLevel = {
  erpCode: string;
  /** null = saldo consolidado (sem informação por filial) */
  branchCode: string | null;
  available: number;
};

export type ReservationRequest = {
  /** Mesma chave = mesma reserva (repetir a chamada não reserva de novo). */
  idempotencyKey: string;
  branchCode: string;
  items: { erpCode: string; quantity: number }[];
  /** Por quanto tempo segurar a mercadoria esperando o pagamento. */
  ttlSeconds: number;
};
export type Reservation = {
  reservationId: string;
  status: "CONFIRMED" | "RELEASED" | "EXPIRED" | "CONSUMED";
  expiresAt: string;
  items: { erpCode: string; quantity: number }[];
};

export type ErpOrderRequest = {
  idempotencyKey: string;
  orderNumber: number;
  branchCode: string;
  reservationId: string | null;
  customer: { name: string; cpf: string | null; phone: string | null };
  items: { erpCode: string; quantity: number; unitPriceCents: number }[];
  totalCents: number;
  payment: { method: "PIX" | "CREDIT_CARD"; installments: number; providerPaymentId: string };
};
export type ErpOrderResult = { erpOrderRef: string };

export class ErpError extends Error {
  constructor(
    message: string,
    readonly code: "UNAVAILABLE" | "NOT_SUPPORTED" | "INSUFFICIENT_STOCK" | "NOT_FOUND" | "INVALID_RESPONSE" | "UNAUTHORIZED",
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ErpError";
  }
}

export interface ErpAdapter {
  readonly system: string;
  readonly capabilities: ReadonlySet<ErpCapability>;
  getProduct(erpCode: string): Promise<ErpProduct | null>;
  getPrices(erpCode: string, at?: Date): Promise<ErpPrice[]>;
  getStock(erpCode: string): Promise<ErpStockLevel[]>;
  reserveStock(req: ReservationRequest): Promise<Reservation>;
  confirmReservation(reservationId: string): Promise<Reservation>;
  releaseReservation(reservationId: string): Promise<Reservation>;
  submitOrder(order: ErpOrderRequest): Promise<ErpOrderResult>;
}

/** Venda online só pode ser habilitada se o ERP garantir reserva de estoque. */
export function canSellOnline(adapter: ErpAdapter): boolean {
  return adapter.capabilities.has("stock.reserve") && adapter.capabilities.has("orders.submit");
}
