import { randomUUID } from "node:crypto";
import type { ErpAdapter, ErpCapability, ErpOrderRequest, ErpPrice, ErpProduct, ErpStockLevel, Reservation, ReservationRequest } from "./contract";
import { ErpError } from "./contract";

type MockState = {
  products: Map<string, ErpProduct>;
  prices: Map<string, number>;
  /** estoque por filial: erpCode -> branchCode -> quantidade física */
  stock: Map<string, Map<string, number>>;
};

/**
 * ERP SIMULADO para desenvolvimento e testes. Não representa o Sólidus real.
 * Implementa reservas com expiração e idempotência para validar o fluxo de checkout.
 */
export class MockErpAdapter implements ErpAdapter {
  readonly system = "mock";
  readonly capabilities: ReadonlySet<ErpCapability> = new Set<ErpCapability>([
    "products.read",
    "prices.read",
    "stock.read",
    "stock.readByBranch",
    "stock.reserve",
    "orders.submit",
  ]);
  private readonly reservations = new Map<string, Reservation & { branchCode: string }>();
  private readonly byKey = new Map<string, string>();
  private readonly orders = new Map<string, string>();
  /** Simula indisponibilidade do ERP nos testes. */
  failNext = 0;

  constructor(
    private readonly state: MockState,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static fromSeed(items: { erpCode: string; name: string; priceCents: number; stock: Record<string, number> }[], now?: () => Date) {
    return new MockErpAdapter(
      {
        products: new Map(items.map((i) => [i.erpCode, { erpCode: i.erpCode, name: i.name, active: true }])),
        prices: new Map(items.map((i) => [i.erpCode, i.priceCents])),
        stock: new Map(items.map((i) => [i.erpCode, new Map(Object.entries(i.stock))])),
      },
      now,
    );
  }

  private maybeFail() {
    if (this.failNext > 0) {
      this.failNext--;
      throw new ErpError("ERP simulado indisponível", "UNAVAILABLE", true);
    }
  }

  private expireOld() {
    const now = this.now().getTime();
    for (const r of this.reservations.values()) {
      if (r.status === "CONFIRMED" && new Date(r.expiresAt).getTime() <= now) r.status = "EXPIRED";
    }
  }

  private reservedQty(erpCode: string, branchCode: string) {
    this.expireOld();
    let total = 0;
    for (const r of this.reservations.values()) {
      if (r.status !== "CONFIRMED" || r.branchCode !== branchCode) continue;
      for (const i of r.items) if (i.erpCode === erpCode) total += i.quantity;
    }
    return total;
  }

  async getProduct(erpCode: string) {
    this.maybeFail();
    return this.state.products.get(erpCode) ?? null;
  }

  async getPrices(erpCode: string): Promise<ErpPrice[]> {
    this.maybeFail();
    const p = this.state.prices.get(erpCode);
    return p === undefined ? [] : [{ erpCode, priceCents: p, priceTable: "MOCK", validFrom: "2000-01-01", validUntil: "2999-12-31" }];
  }

  async getStock(erpCode: string): Promise<ErpStockLevel[]> {
    this.maybeFail();
    const branches = this.state.stock.get(erpCode);
    if (!branches) return [];
    return [...branches].map(([branchCode, qty]) => ({ erpCode, branchCode, available: qty - this.reservedQty(erpCode, branchCode) }));
  }

  async reserveStock(req: ReservationRequest): Promise<Reservation> {
    this.maybeFail();
    const existing = this.byKey.get(req.idempotencyKey);
    if (existing) return structuredClone(this.reservations.get(existing)!);
    // Checagem e reserva acontecem juntas (sem await no meio): não há venda acima do estoque
    for (const item of req.items) {
      const physical = this.state.stock.get(item.erpCode)?.get(req.branchCode) ?? 0;
      if (physical - this.reservedQty(item.erpCode, req.branchCode) < item.quantity) {
        throw new ErpError(`Estoque insuficiente para ${item.erpCode}`, "INSUFFICIENT_STOCK", false);
      }
    }
    const reservation = {
      reservationId: randomUUID(),
      status: "CONFIRMED" as const,
      expiresAt: new Date(this.now().getTime() + req.ttlSeconds * 1000).toISOString(),
      items: req.items.map((i) => ({ ...i })),
      branchCode: req.branchCode,
    };
    this.reservations.set(reservation.reservationId, reservation);
    this.byKey.set(req.idempotencyKey, reservation.reservationId);
    return structuredClone(reservation);
  }

  private get(reservationId: string) {
    this.expireOld();
    const r = this.reservations.get(reservationId);
    if (!r) throw new ErpError("Reserva não encontrada", "NOT_FOUND", false);
    return r;
  }

  async confirmReservation(reservationId: string): Promise<Reservation> {
    this.maybeFail();
    const r = this.get(reservationId);
    if (r.status !== "CONFIRMED") throw new ErpError(`Reserva não está ativa (${r.status})`, "INSUFFICIENT_STOCK", false);
    return structuredClone(r);
  }

  async releaseReservation(reservationId: string): Promise<Reservation> {
    this.maybeFail();
    const r = this.get(reservationId);
    if (r.status === "CONFIRMED") r.status = "RELEASED";
    return structuredClone(r);
  }

  async submitOrder(order: ErpOrderRequest) {
    this.maybeFail();
    const existing = this.orders.get(order.idempotencyKey);
    if (existing) return { erpOrderRef: existing };
    if (order.reservationId) {
      const r = this.get(order.reservationId);
      if (r.status !== "CONFIRMED") throw new ErpError("Reserva expirada ou liberada", "INSUFFICIENT_STOCK", false);
      for (const i of r.items) {
        const branch = this.state.stock.get(i.erpCode)!;
        branch.set(r.branchCode, (branch.get(r.branchCode) ?? 0) - i.quantity);
      }
      r.status = "CONSUMED";
    }
    const ref = `MOCK-${order.orderNumber}`;
    this.orders.set(order.idempotencyKey, ref);
    return { erpOrderRef: ref };
  }
}
