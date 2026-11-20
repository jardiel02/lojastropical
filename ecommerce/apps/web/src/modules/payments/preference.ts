import { MercadoPagoConfig, Preference } from "mercadopago";

/**
 * Checkout Pro (Preferences API): o servidor cria a "preferência" com os itens já
 * conferidos e o cliente paga na página do Mercado Pago (Pix ou cartão em até 12x).
 * Nenhum dado de cartão passa pela loja. Sempre redireciona para init_point.
 */

/** auto_return e o aviso automático só funcionam com endereço público em HTTPS. */
export function isPublicHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && !/^https:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(url);
}

export type PreferenceInput = {
  /** Id interno do pedido: vai como external_reference (difícil de adivinhar). */
  orderId: string;
  orderNumber: number;
  items: { id: string; title: string; quantity: number; unitPriceCents: number }[];
  payer: { email: string; name: string | null; cpf: string | null };
  /** Endereço da loja, sem barra no fim (http://localhost:3000 em desenvolvimento). */
  appUrl: string;
};

export function buildPreferenceBody(input: PreferenceInput) {
  const { appUrl } = input;
  const publicAppUrl = isPublicHttpsUrl(appUrl);
  const back = `${appUrl}/pedido/retorno`;
  return {
    items: input.items.map((i) => ({
      id: i.id,
      title: i.title.slice(0, 250),
      quantity: i.quantity,
      unit_price: i.unitPriceCents / 100,
      currency_id: "BRL",
    })),
    payer: {
      email: input.payer.email,
      ...(input.payer.name ? { name: input.payer.name } : {}),
      ...(input.payer.cpf ? { identification: { type: "CPF", number: input.payer.cpf } } : {}),
    },
    external_reference: input.orderId,
    back_urls: { success: back, failure: back, pending: back },
    // Em localhost o Mercado Pago recusa auto_return; só liga com endereço público HTTPS
    ...(publicAppUrl ? { auto_return: "approved" } : {}),
    ...(publicAppUrl ? { notification_url: `${appUrl}/api/webhooks/mercadopago?source_news=webhooks` } : {}),
    // Só Pix e cartão (decisão da loja): tira boleto e pagamento em lotérica
    payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 12 },
    statement_descriptor: "LOJAS TROPICAL",
    metadata: { order_number: input.orderNumber },
  };
}

/** Cria a preferência e devolve o link de pagamento (init_point). */
export async function createPreference(accessToken: string, input: PreferenceInput, idempotencyKey: string): Promise<{ id: string; init_point: string }> {
  const client = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
  const result = await new Preference(client).create({ body: buildPreferenceBody(input), requestOptions: { idempotencyKey } });
  if (!result.id || !result.init_point) throw new Error("Mercado Pago não devolveu o link de pagamento");
  return { id: result.id, init_point: result.init_point };
}
