import { describe, expect, it } from "vitest";
import { mapLimit, planInventory, snapshotKey } from "./plan";

const products = [
  { id: "p1", erpCode: "100" },
  { id: "p2", erpCode: "200" },
];
const branches = [
  { id: "b1", code: "MATRIZ" },
  { id: "b2", code: "AVENIDA" },
];

describe("planInventory", () => {
  it("soma as lojas e grava saldo de cada loja e o total", () => {
    const readings = new Map([
      ["b1", new Map([["100", 3], ["200", 0]])],
      ["b2", new Map([["100", 2], ["200", 1]])],
    ]);
    const plan = planInventory(products, branches, readings, new Map());
    expect(plan.totals).toEqual(new Map([["p1", 5], ["p2", 1]]));
    expect(plan.rows).toContainEqual({ productId: "p1", branchId: null, quantity: 5 });
    expect(plan.rows).toContainEqual({ productId: "p2", branchId: "b1", quantity: 0 });
    expect(plan.rows).toHaveLength(6);
  });

  it("não grava de novo o que não mudou", () => {
    const readings = new Map([
      ["b1", new Map([["100", 3]])],
      ["b2", new Map([["100", 2]])],
    ]);
    const latest = new Map([
      [snapshotKey("p1", "b1"), 3],
      [snapshotKey("p1", "b2"), 1],
      [snapshotKey("p1", null), 4],
    ]);
    const plan = planInventory([products[0]!], branches, readings, latest);
    expect(plan.rows).toEqual([
      { productId: "p1", branchId: "b2", quantity: 2 },
      { productId: "p1", branchId: null, quantity: 5 },
    ]);
  });

  it("loja que não respondeu entra no total com o último saldo, sem virar zero", () => {
    const readings = new Map([["b1", new Map([["100", 3]])]]);
    const latest = new Map([[snapshotKey("p1", "b2"), 4]]);
    const plan = planInventory([products[0]!], branches, readings, latest);
    expect(plan.totals.get("p1")).toBe(7);
    expect(plan.usedPrevious).toBe(1);
    expect(plan.rows.some((r) => r.branchId === "b2")).toBe(false);
  });

  it("sem nenhuma leitura o produto fica como estava", () => {
    const plan = planInventory([products[0]!], branches, new Map(), new Map());
    expect(plan.unknown).toBe(1);
    expect(plan.rows).toEqual([]);
  });
});

describe("mapLimit", () => {
  it("mantém a ordem e respeita o limite", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });
});
