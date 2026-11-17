import type { PrismaClient } from "@lojas-tropical/database";
import { ErpError, type ErpAdapter } from "@lojas-tropical/erp-adapter";
import { mapLimit, planInventory, snapshotKey, type BranchReadings } from "./plan";

export type BranchReader = { slug: string; code: string; adapter: ErpAdapter };

export type StockSyncOptions = {
  /** Um leitor por loja (token próprio de cada filial). */
  branches: BranchReader[];
  /** Leitor dos preços (tabela da Matriz, a mesma que o site atual usa). null = não mexe nos preços. */
  prices: ErpAdapter | null;
  concurrency?: number;
  triggeredBy?: string;
  log?: (line: string) => void;
};

export type BranchResult = { slug: string; code: string; read: number; failed: number; units: number; error: string | null };
export type StockSyncResult = {
  jobId: string;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  products: number;
  branches: BranchResult[];
  snapshotsWritten: number;
  usedPrevious: number;
  unknown: number;
  prices: { checked: number; changed: number; withoutPrice: number; failed: number } | null;
};

const SOURCE = "solidus";
const reason = (e: unknown) => (e instanceof ErpError ? e.code : e instanceof Error ? e.name : "erro");

/**
 * Lê o estoque de cada loja no Sólidus e grava no banco: o saldo de cada filial e o total
 * das lojas (que a vitrine mostra). Só grava o que mudou. Uma loja que não responder não
 * zera o estoque: o total usa o último saldo conhecido dela e a execução fica PARTIAL.
 */
export async function syncStock(prisma: PrismaClient, opts: StockSyncOptions): Promise<StockSyncResult> {
  const log = opts.log ?? (() => {});
  const concurrency = opts.concurrency ?? 4;
  const job = await prisma.syncJob.create({
    data: { type: "STOCK", status: "RUNNING", triggeredBy: opts.triggeredBy ?? "schedule", startedAt: new Date() },
  });

  try {
    const products = (
      await prisma.product.findMany({ where: { deletedAt: null, erpCode: { not: null } }, select: { id: true, erpCode: true } })
    ).map((p) => ({ id: p.id, erpCode: p.erpCode! }));
    const codes = [...new Set(products.map((p) => p.erpCode))];

    const dbBranches = await prisma.branch.findMany({ where: { slug: { in: opts.branches.map((b) => b.slug) } } });
    const branchIdBySlug = new Map(dbBranches.map((b) => [b.slug, b.id]));

    const readings: BranchReadings = new Map();
    const branchResults: BranchResult[] = [];
    for (const reader of opts.branches) {
      const branchId = branchIdBySlug.get(reader.slug);
      if (!branchId) {
        branchResults.push({ slug: reader.slug, code: reader.code, read: 0, failed: codes.length, units: 0, error: "filial não cadastrada no banco" });
        continue;
      }
      // Guarda no banco qual é a filial no ERP (o sufixo do segredo)
      await prisma.branch.update({ where: { id: branchId }, data: { erpBranchCode: reader.code } });

      const byCode = new Map<string, number>();
      let failed = 0;
      let fatal: string | null = null;
      await mapLimit(codes, concurrency, async (code) => {
        if (fatal) return;
        try {
          const levels = await reader.adapter.getStock(code);
          byCode.set(code, levels.reduce((sum, l) => sum + l.available, 0));
        } catch (e) {
          failed++;
          // Token recusado: não adianta continuar consultando essa loja
          if (e instanceof ErpError && e.code === "UNAUTHORIZED") fatal = "token recusado";
        }
      });
      if (fatal) byCode.clear();
      const units = [...byCode.values()].reduce((a, b) => a + b, 0);
      if (byCode.size) readings.set(branchId, byCode);
      branchResults.push({ slug: reader.slug, code: reader.code, read: byCode.size, failed: fatal ? codes.length : failed, units, error: fatal });
      log(`${reader.code}: ${byCode.size} lidos, ${failed} falhas, ${units} unidades${fatal ? ` (${fatal})` : ""}`);
    }

    const latestRows = await prisma.inventorySnapshot.findMany({
      where: { variantId: null },
      orderBy: [{ productId: "asc" }, { branchId: "asc" }, { capturedAt: "desc" }],
      distinct: ["productId", "branchId"],
      select: { productId: true, branchId: true, quantity: true },
    });
    const latest = new Map(latestRows.map((r) => [snapshotKey(r.productId, r.branchId), r.quantity]));

    const plan = planInventory(
      products,
      opts.branches.flatMap((b) => (branchIdBySlug.has(b.slug) ? [{ id: branchIdBySlug.get(b.slug)!, code: b.code }] : [])),
      readings,
      latest,
    );
    const capturedAt = new Date();
    if (plan.rows.length) {
      await prisma.inventorySnapshot.createMany({
        data: plan.rows.map((r) => ({ ...r, source: SOURCE, capturedAt, syncJobId: job.id })),
      });
    }

    let prices: StockSyncResult["prices"] = null;
    if (opts.prices) {
      const priceReader = opts.prices;
      prices = { checked: 0, changed: 0, withoutPrice: 0, failed: 0 };
      const found = await mapLimit(codes, concurrency, async (code) => {
        try {
          const list = await priceReader.getPrices(code, capturedAt);
          return { code, cents: list[0]?.priceCents ?? null, ok: true };
        } catch {
          return { code, cents: null, ok: false };
        }
      });
      for (const f of found) {
        if (!f.ok) {
          prices.failed++;
          continue;
        }
        prices.checked++;
        if (f.cents === null) prices.withoutPrice++;
        // Sem preço válido no ERP = "consulte o preço" (como no site atual). Só mexe em preço vindo do ERP.
        // No SQL "preço ≠ X" não casa com preço vazio, por isso as duas condições
        const differs = f.cents === null ? { priceCents: { not: null } } : { OR: [{ priceCents: { not: f.cents } }, { priceCents: null }] };
        const { count } = await prisma.productVariant.updateMany({
          where: { AND: [{ erpCode: f.code }, { OR: [{ priceSource: null }, { priceSource: "ERP" }] }, differs] },
          data: { priceCents: f.cents, priceSource: f.cents === null ? null : "ERP", priceUpdatedAt: capturedAt },
        });
        if (count) prices.changed++;
      }
      log(`preços: ${prices.checked} conferidos, ${prices.changed} mudaram, ${prices.withoutPrice} sem preço, ${prices.failed} falhas`);
    }

    const okBranches = branchResults.filter((b) => !b.error && b.read > 0).length;
    const anyFailure = branchResults.some((b) => b.error || b.failed) || (prices?.failed ?? 0) > 0;
    const status = okBranches === 0 ? "FAILED" : anyFailure ? "PARTIAL" : "SUCCEEDED";
    const result: StockSyncResult = {
      jobId: job.id,
      status,
      products: products.length,
      branches: branchResults,
      snapshotsWritten: plan.rows.length,
      usedPrevious: plan.usedPrevious,
      unknown: plan.unknown,
      prices,
    };
    const { jobId: _jobId, ...stats } = result;
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status, finishedAt: new Date(), stats, error: status === "FAILED" ? "Nenhuma loja respondeu" : null },
    });
    return result;
  } catch (e) {
    await prisma.syncJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: reason(e) } });
    throw e;
  }
}
