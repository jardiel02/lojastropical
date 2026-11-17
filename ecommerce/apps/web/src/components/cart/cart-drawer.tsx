"use client";

import Link from "next/link";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { formatBRL } from "@lojas-tropical/shared";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { whatsappOrderText } from "@/modules/cart/pricing";
import { wa } from "@/lib/site";
import { useCart } from "./cart-provider";
import { CartItem } from "./cart-item";

function CartEmptyState() {
  return (
    <div className="grid place-items-center gap-3 py-10 text-center text-muted-foreground">
      <ShoppingCart aria-hidden className="size-10" />
      <p>
        Seu carrinho está vazio.
        <br />
        Abra um produto e toque em “Adicionar ao carrinho”.
      </p>
    </div>
  );
}

export function CartDrawer() {
  const { open, setOpen, lines, quote, quoteError } = useCart();
  const loading = lines.length > 0 && !quote?.lines.length && !quoteError;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent title="Seu carrinho" description="Produtos que você escolheu, com preços conferidos pela loja.">
        <div className="flex-1 overflow-y-auto px-5 py-2" aria-busy={loading}>
          {!lines.length && <CartEmptyState />}
          {loading && <p className="py-8 text-center text-muted-foreground">Calculando seu carrinho…</p>}
          {quoteError && (
            <p role="alert" className="my-4 rounded-lg bg-chip p-3 text-sm">
              Não foi possível atualizar os preços agora. Tente de novo em instantes.
            </p>
          )}
          {lines.length > 0 && quote && quote.lines.length > 0 && (
            <ul>
              {quote.lines.map((l) => (
                <CartItem key={`${l.slug}-${l.color ?? ""}`} line={l} />
              ))}
            </ul>
          )}
        </div>
        {lines.length > 0 && quote && quote.lines.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 border-t border-line px-5 pt-4 pb-5">
            <dl className="flex items-baseline justify-between">
              <dt className="font-bold">Subtotal à vista</dt>
              <dd className="font-display text-xl font-bold text-price tabular-nums">{formatBRL(quote.subtotalCents)}</dd>
            </dl>
            {quote.itemsWithoutPrice > 0 && (
              <p className="m-0 text-[13px] text-muted-foreground">
                {quote.itemsWithoutPrice === 1
                  ? "1 item não tem preço à vista cadastrado e fica fora do subtotal."
                  : `${quote.itemsWithoutPrice} itens não têm preço à vista cadastrado e ficam fora do subtotal.`}{" "}
                O vendedor confirma o valor no WhatsApp.
              </p>
            )}
            <Button asChild variant="buy" size="lg" className="h-auto min-h-14 py-3 text-center whitespace-normal tracking-[.04em]">
              <a href={wa(whatsappOrderText(quote))} target="_blank" rel="noopener">
                <MessageCircle aria-hidden className="size-5" />
                Enviar pedido pelo WhatsApp
              </a>
            </Button>
            <p className="m-0 text-[13px] text-muted-foreground">
              Você combina a forma de pagamento (crediário, cartão em até 12x ou Pix) e a entrega com o vendedor. O pagamento online
              pelo site ainda está em implantação.
            </p>
            <p className="m-0 text-[13px] text-muted-foreground">
              Usamos seus dados só para atender e entregar o pedido, conforme a{" "}
              <Link className="text-foreground underline" href="/politica-de-privacidade" onClick={() => setOpen(false)}>
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
