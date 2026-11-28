/**
 * Regras puras da sincronização de estoque (sem banco nem rede), para poder testar.
 *
 * No Sólidus cada loja tem o próprio token, e cada token devolve só o saldo daquela loja.
 * A vitrine mostra o total das lojas; o saldo de cada loja fica guardado para retirada.
 */

/** Filiais do site e o sufixo do segredo SOLIDUS_TOKEN_<SUFIXO> de cada uma. */
export const BRANCH_TOKENS = [
  { slug: "loja-matriz", code: "MATRIZ" },
  { slug: "loja-avenida", code: "AVENIDA" },
  { slug: "loja-timbiras", code: "TIMBIRAS" },
  { slug: "loja-pio-xii", code: "PIO_XII" },
  { slug: "loja-dom-pedro", code: "DOM_PEDRO" },
  { slug: "loja-goncalves-dias", code: "GONCALVES_DIAS" },
  { slug: "loja-coroata", code: "COROATA" },
  { slug: "loja-alto-alegre", code: "ALTO_ALEGRE" },
] as const;

export type PlanProduct = { id: string; erpCode: string };
export type PlanBranch = { id: string; code: string };
/** Leitura de cada filial: código do ERP → quantidade. Código ausente = não foi possível ler. */
export type BranchReadings = Map<string, Map<string, number>>;
/** Último saldo gravado, por chave `${productId}:${branchId ?? ""}`. */
export type LatestQuantities = Map<string, number>;
export type SnapshotRow = { productId: string; branchId: string | null; quantity: number };

export const snapshotKey = (productId: string, branchId: string | null) => `${productId}:${branchId ?? ""}`;

export type InventoryPlan = {
  /** Linhas novas: só onde o saldo mudou (ou ainda não havia saldo). */
  rows: SnapshotRow[];
  /** Total das lojas por produto, como vai aparecer na vitrine. */
  totals: Map<string, number>;
  /** Produtos cujo total usou o último saldo conhecido de alguma loja que não respondeu agora. */
  usedPrevious: number;
  /** Produtos sem nenhuma leitura de nenhuma loja (total não é gravado). */
  unknown: number;
};

export function planInventory(products: PlanProduct[], branches: PlanBranch[], readings: BranchReadings, latest: LatestQuantities): InventoryPlan {
  const rows: SnapshotRow[] = [];
  const totals = new Map<string, number>();
  let usedPrevious = 0;
  let unknown = 0;

  for (const product of products) {
    let total = 0;
    let known = 0;
    let previous = false;
    for (const branch of branches) {
      const key = snapshotKey(product.id, branch.id);
      const read = readings.get(branch.id)?.get(product.erpCode);
      if (read !== undefined) {
        known++;
        total += read;
        if (latest.get(key) !== read) rows.push({ productId: product.id, branchId: branch.id, quantity: read });
      } else if (latest.has(key)) {
        // Loja fora do ar agora: mantém o último saldo dela no total, sem gravar nada novo
        known++;
        previous = true;
        total += latest.get(key)!;
      }
    }
    if (!known) {
      unknown++;
      continue;
    }
    if (previous) usedPrevious++;
    totals.set(product.id, total);
    if (latest.get(snapshotKey(product.id, null)) !== total) rows.push({ productId: product.id, branchId: null, quantity: total });
  }
  return { rows, totals, usedPrevious, unknown };
}

/** Executa `fn` para cada item com no máximo `limit` chamadas ao mesmo tempo. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}
