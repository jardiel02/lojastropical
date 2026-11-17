import { describe, expect, it } from "vitest";
import { canSellOnline, ErpError } from "./contract";
import { MockErpAdapter } from "./mock";
import { SolidusReadOnlyAdapter } from "./solidus";

const seed = [{ erpCode: "9967", name: "Cômoda Moval Texas", priceCents: 109900, stock: { codo: 2, timbiras: 0 } }];

describe("ERP simulado: reservas de estoque", () => {
  it("reserva e reduz o disponível", async () => {
    const erp = MockErpAdapter.fromSeed(seed);
    await erp.reserveStock({ idempotencyKey: "a", branchCode: "codo", items: [{ erpCode: "9967", quantity: 1 }], ttlSeconds: 900 });
    const stock = await erp.getStock("9967");
    expect(stock.find((s) => s.branchCode === "codo")?.available).toBe(1);
  });

  it("não vende acima do estoque com reservas simultâneas", async () => {
    const erp = MockErpAdapter.fromSeed(seed);
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        erp.reserveStock({ idempotencyKey: `k${i}`, branchCode: "codo", items: [{ erpCode: "9967", quantity: 1 }], ttlSeconds: 900 }),
      ),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(2);
    const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(rejected).toHaveLength(3);
    expect((rejected[0]!.reason as ErpError).code).toBe("INSUFFICIENT_STOCK");
  });

  it("é idempotente: repetir a chamada não reserva de novo", async () => {
    const erp = MockErpAdapter.fromSeed(seed);
    const req = { idempotencyKey: "same", branchCode: "codo", items: [{ erpCode: "9967", quantity: 2 }], ttlSeconds: 900 };
    const a = await erp.reserveStock(req);
    const b = await erp.reserveStock(req);
    expect(b.reservationId).toBe(a.reservationId);
  });

  it("reserva expira e devolve o estoque", async () => {
    let now = new Date("2026-11-17T12:00:00Z");
    const erp = MockErpAdapter.fromSeed(seed, () => now);
    const r = await erp.reserveStock({ idempotencyKey: "x", branchCode: "codo", items: [{ erpCode: "9967", quantity: 2 }], ttlSeconds: 600 });
    now = new Date("2026-11-17T12:11:00Z");
    await expect(erp.confirmReservation(r.reservationId)).rejects.toThrow(/EXPIRED/);
    expect((await erp.getStock("9967")).find((s) => s.branchCode === "codo")?.available).toBe(2);
  });

  it("liberar reserva devolve o estoque", async () => {
    const erp = MockErpAdapter.fromSeed(seed);
    const r = await erp.reserveStock({ idempotencyKey: "r", branchCode: "codo", items: [{ erpCode: "9967", quantity: 2 }], ttlSeconds: 600 });
    await erp.releaseReservation(r.reservationId);
    expect((await erp.getStock("9967")).find((s) => s.branchCode === "codo")?.available).toBe(2);
  });

  it("pedido consome a reserva e não duplica com a mesma chave", async () => {
    const erp = MockErpAdapter.fromSeed(seed);
    const r = await erp.reserveStock({ idempotencyKey: "o", branchCode: "codo", items: [{ erpCode: "9967", quantity: 1 }], ttlSeconds: 600 });
    const order = {
      idempotencyKey: "pedido-1",
      orderNumber: 1,
      branchCode: "codo",
      reservationId: r.reservationId,
      customer: { name: "Cliente Teste", cpf: null, phone: null },
      items: [{ erpCode: "9967", quantity: 1, unitPriceCents: 109900 }],
      totalCents: 109900,
      payment: { method: "PIX" as const, installments: 1, providerPaymentId: "test" },
    };
    const a = await erp.submitOrder(order);
    const b = await erp.submitOrder(order);
    expect(b.erpOrderRef).toBe(a.erpOrderRef);
    expect((await erp.getStock("9967")).find((s) => s.branchCode === "codo")?.available).toBe(1);
  });

  it("falha do ERP é marcada como temporária (pode tentar de novo)", async () => {
    const erp = MockErpAdapter.fromSeed(seed);
    erp.failNext = 1;
    await expect(erp.getStock("9967")).rejects.toMatchObject({ code: "UNAVAILABLE", retryable: true });
    await expect(erp.getStock("9967")).resolves.toHaveLength(2);
  });
});

describe("Sólidus somente leitura", () => {
  const fakeFetch = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

  it("não permite vender online enquanto não houver reserva no ERP", () => {
    const s = new SolidusReadOnlyAdapter({ baseUrl: "https://erp.invalid/consultas/", token: "t", fetchImpl: fakeFetch({}) });
    expect(canSellOnline(s)).toBe(false);
    expect(canSellOnline(MockErpAdapter.fromSeed(seed))).toBe(true);
  });

  it("reserva e pedido falham com NOT_SUPPORTED (não finge integração)", async () => {
    const s = new SolidusReadOnlyAdapter({ baseUrl: "https://erp.invalid/consultas/", token: "t", fetchImpl: fakeFetch({}) });
    await expect(s.reserveStock()).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
    await expect(s.submitOrder()).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
  });

  it("lê preço válido da tabela vigente, em centavos", async () => {
    const body = {
      precos: [
        { tabela_preco: { nome: "TABELA 1", validade_inicial: "01/01/2026", validade_final: "30/04/2026", produtos: [{ codigo: "9967", preco: "999.00" }] } },
        { tabela_preco: { nome: "TABELA 2", validade_inicial: "01/05/2026", validade_final: "31/12/2026", produtos: [{ codigo: 9967, preco: 1099.9 }] } },
      ],
    };
    const s = new SolidusReadOnlyAdapter({ baseUrl: "https://erp.invalid/consultas/", token: "t", fetchImpl: fakeFetch(body) });
    const prices = await s.getPrices("9967", new Date("2026-11-17T12:00:00Z"));
    expect(prices).toEqual([{ erpCode: "9967", priceCents: 109990, priceTable: "TABELA 2", validFrom: "2026-05-01", validUntil: "2026-12-31" }]);
  });

  it("soma o estoque disponível e informa que não é por filial", async () => {
    const body = { estoques: [{ codigo: "9967", quantidade_disponivel: "3" }, { codigo: "9967", quantidade_disponivel: 2 }, { codigo: "1", quantidade_disponivel: 9 }] };
    const s = new SolidusReadOnlyAdapter({ baseUrl: "https://erp.invalid/consultas/", token: "t", fetchImpl: fakeFetch(body) });
    expect(await s.getStock("9967")).toEqual([{ erpCode: "9967", branchCode: null, available: 5 }]);
  });

  it("token recusado vira erro não temporário", async () => {
    const s = new SolidusReadOnlyAdapter({ baseUrl: "https://erp.invalid/consultas/", token: "t", fetchImpl: fakeFetch({}, 403) });
    await expect(s.getStock("9967")).rejects.toMatchObject({ code: "UNAUTHORIZED", retryable: false });
  });
});
