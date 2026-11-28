import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, MessageCircle, XCircle } from "lucide-react";
import { getPrisma } from "@lojas-tropical/database";
import { cents, formatBRL } from "@lojas-tropical/shared";
import { ClearCartOnPaid } from "@/components/cart/clear-cart-on-paid";
import { Button } from "@/components/ui/button";
import { wa } from "@/lib/site";
import { onlinePaymentReady } from "@/modules/payments/config";
import { syncMercadoPagoPayment } from "@/modules/payments/sync";

export const metadata: Metadata = { title: "Seu pagamento", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/**
 * Volta do Checkout Pro. A situação mostrada é a do NOSSO servidor, conferida na API do
 * Mercado Pago; os parâmetros da URL só dizem qual pagamento consultar.
 */
export default async function PaymentReturnPage({ searchParams }: Props) {
  const sp = await searchParams;
  const orderId = one(sp.external_reference);
  const paymentId = one(sp.payment_id) ?? one(sp.collection_id);

  let order: { number: number; paymentStatus: string; totalCents: number } | null = null;
  if (onlinePaymentReady() && orderId) {
    if (paymentId && paymentId !== "null") {
      await syncMercadoPagoPayment(paymentId, "retorno").catch((error: unknown) => {
        console.error("Retorno Mercado Pago: falha ao conferir o pagamento", error instanceof Error ? error.message : error);
      });
    }
    order = await getPrisma().order.findUnique({ where: { id: orderId }, select: { number: true, paymentStatus: true, totalCents: true } });
  }

  const state = !order ? "unknown" : order.paymentStatus === "PAID" ? "paid" : order.paymentStatus === "PENDING" || order.paymentStatus === "AUTHORIZED" ? "pending" : "failed";
  const help = wa(order ? `Olá! Quero falar sobre o meu pedido nº ${order.number} do site.` : "Olá! Quero falar sobre um pagamento pelo site.");

  return (
    <div className="wrap grid max-w-xl justify-items-center gap-4 py-16 text-center">
      {state === "paid" && (
        <>
          <ClearCartOnPaid />
          <CheckCircle2 aria-hidden className="size-14 text-[#0b7a3e]" />
          <h1 className="text-2xl">Pagamento aprovado!</h1>
          <p className="text-muted-foreground">
            Pedido nº <strong className="text-foreground">{order!.number}</strong>, total de {formatBRL(cents(order!.totalCents))}. A loja confere o estoque e
            fala com você no WhatsApp para combinar a entrega.
          </p>
        </>
      )}
      {state === "pending" && (
        <>
          <Clock aria-hidden className="size-14 text-sun-foreground" />
          <h1 className="text-2xl">Pagamento em processamento</h1>
          <p className="text-muted-foreground">
            Pedido nº <strong className="text-foreground">{order!.number}</strong>. Se você escolheu Pix, pague o código no app do seu banco. Assim que o
            Mercado Pago confirmar, o pedido muda sozinho para pago.
          </p>
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle aria-hidden className="size-14 text-brand" />
          <h1 className="text-2xl">Pagamento não aprovado</h1>
          <p className="text-muted-foreground">
            O pedido nº <strong className="text-foreground">{order!.number}</strong> não foi pago. Nada foi cobrado. Tente de novo pelo carrinho com outro
            cartão ou com Pix, ou fale com a loja.
          </p>
        </>
      )}
      {state === "unknown" && (
        <>
          <Clock aria-hidden className="size-14 text-muted-foreground" />
          <h1 className="text-2xl">Não encontramos este pagamento</h1>
          <p className="text-muted-foreground">Se você acabou de pagar, aguarde alguns minutos. Em caso de dúvida, fale com a loja no WhatsApp.</p>
        </>
      )}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button asChild variant="outline">
          <Link href="/">Voltar para a loja</Link>
        </Button>
        <Button asChild variant="whatsapp">
          <a href={help} target="_blank" rel="noopener">
            <MessageCircle aria-hidden className="size-5" />
            Falar no WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
