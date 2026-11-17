import { z } from "zod";
import type { ErpAdapter, ErpCapability, ErpPrice, ErpStockLevel } from "./contract";
import { ErpError } from "./contract";

/**
 * Adaptador do Sólidus Smart (SGI Sistemas), SOMENTE LEITURA.
 *
 * Usa apenas as consultas que já funcionam em produção no site original
 * (scripts/atualizar_estoque.py): /consultas/produtos, /consultas/estoques e /consultas/precos.
 * Reserva de estoque e envio de pedidos NÃO estão documentados pela SGI até agora;
 * esses métodos falham com NOT_SUPPORTED em vez de fingir que funcionam.
 */
const stockSchema = z.object({
  estoques: z.array(z.object({ codigo: z.union([z.string(), z.number()]), quantidade_disponivel: z.union([z.string(), z.number()]) }).passthrough()).default([]),
});
const priceSchema = z.object({
  precos: z
    .array(
      z.object({
        tabela_preco: z
          .object({
            nome: z.string().optional(),
            validade_inicial: z.string(),
            validade_final: z.string(),
            produtos: z.array(z.object({ codigo: z.union([z.string(), z.number()]), preco: z.union([z.string(), z.number()]) }).passthrough()).default([]),
          })
          .passthrough(),
      }),
    )
    .default([]),
});

const brDate = (s: string) => {
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y) throw new ErpError(`Data inválida do ERP: ${s}`, "INVALID_RESPONSE", false);
  return new Date(Date.UTC(y, m - 1, d));
};
const toCents = (v: string | number) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) throw new ErpError(`Preço inválido do ERP: ${v}`, "INVALID_RESPONSE", false);
  return Math.round(n * 100);
};

export type SolidusConfig = {
  baseUrl: string; // ex.: https://smart.sgisistemas.com.br/api_produto/<empresa>/consultas/
  token: string;
  userAgent?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class SolidusReadOnlyAdapter implements ErpAdapter {
  readonly system = "solidus";
  readonly capabilities: ReadonlySet<ErpCapability> = new Set<ErpCapability>(["products.read", "prices.read", "stock.read"]);

  constructor(private readonly config: SolidusConfig) {
    if (!config.token) throw new Error("SOLIDUS_TOKEN não configurado");
  }

  private async call(route: string, erpCode: string): Promise<unknown> {
    const url = new URL(route, this.config.baseUrl);
    url.searchParams.set("token", this.config.token);
    url.searchParams.set("codigo", erpCode);
    const doFetch = this.config.fetchImpl ?? fetch;
    let res: Response;
    try {
      res = await doFetch(url, {
        // A API recusa clientes sem User-Agent próprio
        headers: { "User-Agent": this.config.userAgent ?? "LojasTropicalEcommerce/1.0" },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
      });
    } catch {
      throw new ErpError(`Sólidus indisponível (${route})`, "UNAVAILABLE", true);
    }
    if (res.status === 401 || res.status === 403) throw new ErpError("Sólidus recusou o token", "UNAUTHORIZED", false);
    if (!res.ok) throw new ErpError(`Sólidus respondeu ${res.status} (${route})`, "UNAVAILABLE", res.status >= 500);
    return res.json();
  }

  async getProduct(erpCode: string) {
    const data = (await this.call("produtos", erpCode)) as { produtos?: { codigo: string | number; descricao?: string }[] };
    const p = data.produtos?.find((x) => String(x.codigo) === erpCode);
    return p ? { erpCode, name: p.descricao ?? "", active: true } : null;
  }

  async getPrices(erpCode: string, at = new Date()): Promise<ErpPrice[]> {
    const data = priceSchema.parse(await this.call("precos", erpCode));
    const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
    return data.precos
      .map((p) => p.tabela_preco)
      .filter((t) => brDate(t.validade_inicial) <= day && day <= brDate(t.validade_final))
      .sort((a, b) => brDate(b.validade_inicial).getTime() - brDate(a.validade_inicial).getTime())
      .flatMap((t) =>
        t.produtos
          .filter((p) => String(p.codigo) === erpCode && toCents(p.preco) > 0)
          .map((p) => ({
            erpCode,
            priceCents: toCents(p.preco),
            priceTable: t.nome ?? "",
            validFrom: brDate(t.validade_inicial).toISOString().slice(0, 10),
            validUntil: brDate(t.validade_final).toISOString().slice(0, 10),
          })),
      );
  }

  async getStock(erpCode: string): Promise<ErpStockLevel[]> {
    const data = stockSchema.parse(await this.call("estoques", erpCode));
    const available = data.estoques
      .filter((e) => String(e.codigo) === erpCode)
      .reduce((sum, e) => sum + Number(e.quantidade_disponivel), 0);
    // A consulta atual devolve o saldo somado; saldo por filial depende da documentação da SGI.
    return [{ erpCode, branchCode: null, available: Math.trunc(available) }];
  }

  private notSupported(what: string): never {
    throw new ErpError(`${what} ainda não é suportado pela integração com o Sólidus (aguardando documentação da SGI)`, "NOT_SUPPORTED", false);
  }
  async reserveStock(): Promise<never> {
    return this.notSupported("Reserva de estoque");
  }
  async confirmReservation(): Promise<never> {
    return this.notSupported("Confirmação de reserva");
  }
  async releaseReservation(): Promise<never> {
    return this.notSupported("Liberação de reserva");
  }
  async submitOrder(): Promise<never> {
    return this.notSupported("Envio de pedido");
  }
}
