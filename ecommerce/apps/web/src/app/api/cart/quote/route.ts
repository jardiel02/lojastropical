import { NextResponse } from "next/server";
import { catalog } from "@/modules/catalog";
import { quoteCart } from "@/modules/cart/pricing";
import { cartQuoteRequestSchema, MAX_QTY_PER_LINE } from "@/modules/cart/schema";

/** Calcula o carrinho no servidor. Nunca confia em preço ou nome enviados pelo navegador. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = cartQuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Carrinho inválido", issues: parsed.error.issues.length }, { status: 422 });
  }
  const products = await catalog.listProducts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const quote = quoteCart(parsed.data.items, (slug) => bySlug.get(slug), MAX_QTY_PER_LINE);
  return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
}
