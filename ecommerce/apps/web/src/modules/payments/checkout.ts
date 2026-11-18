import "server-only";
import { getPrisma, Prisma } from "@lojas-tropical/database";
import { customerFromAccessToken, type SignedInCustomer } from "@/modules/account/server";
import { catalog } from "@/modules/catalog";
import { quoteCart } from "@/modules/cart/pricing";
import { MAX_QTY_PER_LINE, type CartLineInput } from "@/modules/cart/schema";
import { appUrl, mpAccessToken, onlinePaymentReady } from "./config";
import { CART_PROBLEM_MESSAGE, cartProblem, missingCustomerFields, pickBranch } from "./checkout-rules";
import { createPreference } from "./preference";

export class CheckoutError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const PREFERENCE_EVENT = "mp_preference_created";

/**
 * Começa o pagamento: confere login e cadastro, recalcula o carrinho no servidor, cria o
 * pedido (uma vez só por idempotencyKey) e a preferência do Checkout Pro.
 * Devolve o link do Mercado Pago (init_point).
 *
 * Ainda NÃO reserva estoque no ERP (o Sólidus não tem API de reserva): a loja confere o
 * estoque antes de separar. Por isso o pagamento online fica em modo teste.
 */
export async function startMercadoPagoCheckout(input: { accessToken: string; items: CartLineInput[]; idempotencyKey: string }) {
  if (!onlinePaymentReady()) throw new CheckoutError(503, "indisponivel", "O pagamento pelo site ainda não está disponível. Envie o pedido pelo WhatsApp.");

  const signed = await customerFromAccessToken(input.accessToken);
  if (!signed) throw new CheckoutError(401, "login", "Entre na sua conta para pagar pelo site.");
  const { customer } = signed;
  if (missingCustomerFields(customer).length) {
    throw new CheckoutError(422, "cadastro", "Complete seu cadastro (CPF, celular e endereço) em Sua conta antes de pagar.");
  }

  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: {
      customer: { select: { userId: true } },
      items: true,
      paymentIntents: { where: { provider: "MERCADO_PAGO" }, take: 1 },
      events: { where: { type: PREFERENCE_EVENT }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (existing && existing.customer.userId !== signed.userId) throw new CheckoutError(409, "conflito", "Tente de novo.");
  const saved = existing?.events[0]?.payload as { init_point?: string } | undefined;
  if (existing && saved?.init_point) return { initPoint: saved.init_point, orderNumber: existing.number };

  const order = existing ?? (await createOrder(input, signed));
  const intent = order.paymentIntents[0];
  if (!intent) throw new CheckoutError(500, "pedido", "Não foi possível abrir o pagamento agora. Tente de novo.");

  try {
    const pref = await createPreference(
      mpAccessToken(),
      {
        orderId: order.id,
        orderNumber: order.number,
        items: order.items.map((i) => ({
          id: i.sku,
          title: i.colorName ? `${i.name} (${i.colorName})` : i.name,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
        })),
        payer: { email: signed.email, name: customer.nome, cpf: customer.cpf?.replace(/\D/g, "") ?? null },
        appUrl: appUrl(),
      },
      intent.idempotencyKey,
    );
    await prisma.orderEvent.create({ data: { orderId: order.id, type: PREFERENCE_EVENT, payload: { preference_id: pref.id, init_point: pref.init_point } } });
    return { initPoint: pref.init_point, orderNumber: order.number };
  } catch (error) {
    console.error("Mercado Pago: falha ao criar a preferência", { order: order.number, error: error instanceof Error ? error.message : error });
    await prisma.orderEvent.create({ data: { orderId: order.id, type: "mp_preference_failed", payload: {} } }).catch(() => {});
    throw new CheckoutError(502, "mercado-pago", "Não foi possível abrir o pagamento agora. Tente de novo em instantes.");
  }
}

async function createOrder(input: { items: CartLineInput[]; idempotencyKey: string }, signed: SignedInCustomer) {
  const { customer } = signed;
  const prisma = getPrisma();

  // 1. O carrinho como o cliente viu (preço, estoque), só com itens vendáveis
  const products = await catalog.listProducts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const quote = quoteCart(input.items, (slug) => bySlug.get(slug), MAX_QTY_PER_LINE);
  const problem = cartProblem(quote);
  if (problem) throw new CheckoutError(422, problem, CART_PROBLEM_MESSAGE[problem]);

  // 2. Preço oficial do banco; se mudou desde a tela, o cliente confere de novo
  const dbProducts = await prisma.product.findMany({
    where: { slug: { in: quote.lines.map((l) => l.slug) }, status: "PUBLISHED", deletedAt: null },
    include: { variants: { where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { position: "asc" }] } },
  });
  const items = quote.lines.map((l) => {
    const p = dbProducts.find((d) => d.slug === l.slug);
    const v = p && (l.color === null ? p.variants[0] : p.variants.find((x) => x.colorName === l.color));
    if (!p || !v || v.priceCents === null || v.priceCents !== l.unitCashCents) {
      throw new CheckoutError(409, "preco", "Os preços foram atualizados. Confira o carrinho e tente de novo.");
    }
    return {
      productId: p.id,
      variantId: v.id,
      sku: v.sku,
      name: p.name,
      colorName: v.colorName,
      unitPriceCents: v.priceCents,
      quantity: l.qty,
      totalCents: v.priceCents * l.qty,
    };
  });
  const total = items.reduce((s, i) => s + i.totalCents, 0);

  // 3. Loja da cidade do cliente (entrega grátis nas cidades com loja)
  const branch = pickBranch(await prisma.branch.findMany(), customer.cidade);
  if (!branch) throw new CheckoutError(422, "cidade", "Por enquanto vendemos pelo site só para as cidades onde temos loja.");

  const address = {
    destinatario: customer.nome,
    cep: customer.cep,
    rua: customer.rua,
    numero: customer.numero,
    complemento: customer.complemento,
    bairro: customer.bairro,
    cidade: customer.cidade,
    estado: "MA",
    celular: customer.celular,
  };
  const fullName = customer.nome ?? "";
  const cpf = (customer.cpf ?? "").replace(/\D/g, "");

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: signed.userId },
        create: { id: signed.userId, email: signed.email, name: fullName, phone: customer.celular },
        update: { email: signed.email, name: fullName, phone: customer.celular },
      });
      const dbCustomer = await tx.customer.upsert({
        where: { userId: signed.userId },
        create: { userId: signed.userId, fullName, cpf, phone: customer.celular },
        update: { fullName, phone: customer.celular },
      });
      return tx.order.create({
        data: {
          customerId: dbCustomer.id,
          branchId: branch.id,
          fulfillmentType: "DELIVERY",
          status: "PLACED",
          subtotalCents: total,
          totalCents: total,
          shippingAddress: address,
          idempotencyKey: input.idempotencyKey,
          placedAt: new Date(),
          items: { create: items },
          events: { create: { type: "order_placed", toStatus: "PLACED", payload: { origem: "site", pagamento: "mercado-pago-checkout-pro" } } },
          paymentIntents: {
            create: {
              provider: "MERCADO_PAGO",
              method: "MERCADO_PAGO_CHECKOUT",
              amountCents: total,
              installments: 1,
              idempotencyKey: `${input.idempotencyKey}:mp`,
            },
          },
        },
        include: { items: true, paymentIntents: true },
      });
    });
  } catch (error) {
    // Dois cliques ao mesmo tempo: o segundo encontra o pedido do primeiro
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CheckoutError(409, "repetido", "Seu pedido já está sendo aberto. Aguarde um instante e tente de novo.");
    }
    throw error;
  }
}
