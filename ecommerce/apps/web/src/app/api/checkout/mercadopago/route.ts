import { NextResponse } from "next/server";
import { z } from "zod";
import { cartQuoteRequestSchema } from "@/modules/cart/schema";
import { CheckoutError, startMercadoPagoCheckout } from "@/modules/payments/checkout";

const bodySchema = cartQuoteRequestSchema.extend({ idempotencyKey: z.uuid() });

/**
 * Começa o pagamento pelo Checkout Pro. O navegador manda só o que quer comprar e o login;
 * preço, cliente e loja são decididos aqui. Responde { init_point } para o redirecionamento.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Entre na sua conta para pagar pelo site.", code: "login" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Carrinho inválido." }, { status: 422 });

  try {
    const { initPoint, orderNumber } = await startMercadoPagoCheckout({ accessToken: token, ...parsed.data });
    return NextResponse.json({ init_point: initPoint, order_number: orderNumber }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Checkout: erro inesperado", error);
    return NextResponse.json({ error: "Não foi possível abrir o pagamento agora. Tente de novo em instantes." }, { status: 500 });
  }
}
