"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import { InteractiveHoverContent, interactiveHoverClasses } from "@/components/ui/interactive-hover-button";
import { supabase } from "@/modules/account/client";
import type { CartLineInput } from "@/modules/cart/schema";
import { cn } from "@/lib/utils";

/** Liga o botão de pagar no carrinho (por enquanto só em ambiente de teste). */
export const onlinePaymentEnabled = process.env.NEXT_PUBLIC_MP_CHECKOUT_ENABLED === "true";

type Problem = { code: string; message: string };

/**
 * Checkout Pro: pede ao servidor o link de pagamento (init_point) e leva o cliente para a
 * página do Mercado Pago. O navegador manda só os itens, o login e uma chave que evita
 * pedido em dobro se o cliente clicar de novo.
 */
export function MercadoPagoButton({ lines, blockedReason, onNavigate }: { lines: CartLineInput[]; blockedReason: string | null; onNavigate: () => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const attempt = useRef<{ cart: string; key: string } | null>(null);

  async function payWithMercadoPago() {
    setBusy(true);
    setProblem(null);
    let leaving = false;
    try {
      const { data } = await supabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setProblem({ code: "login", message: "Entre na sua conta para pagar pelo site." });
        return;
      }
      // Mesmo carrinho = mesma chave: um segundo clique reaproveita o pedido já aberto
      const cart = JSON.stringify(lines);
      if (attempt.current?.cart !== cart) attempt.current = { cart, key: crypto.randomUUID() };
      const res = await fetch("/api/checkout/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: lines, idempotencyKey: attempt.current.key }),
      });
      const body = (await res.json().catch(() => ({}))) as { init_point?: string; error?: string; code?: string };
      if (!res.ok || !body.init_point) {
        setProblem({ code: body.code ?? "erro", message: body.error ?? "Não foi possível abrir o pagamento agora. Tente de novo em instantes." });
        return;
      }
      leaving = true;
      window.location.assign(body.init_point);
    } catch {
      setProblem({ code: "rede", message: "Sem conexão com a loja agora. Confira sua internet e tente de novo." });
    } finally {
      if (!leaving) setBusy(false);
    }
  }

  const disabled = busy || Boolean(blockedReason);
  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        data-mp-checkout-cta="checkout-pro"
        aria-label="Pagar com Mercado Pago"
        onClick={payWithMercadoPago}
        disabled={disabled}
        aria-busy={busy}
        className={cn(interactiveHoverClasses, "min-h-14 w-full rounded-xl bg-[#0067b1] px-5 text-[17px] text-white disabled:pointer-events-none disabled:opacity-60")}
      >
        <InteractiveHoverContent
          text={busy ? "Abrindo o Mercado Pago…" : "Pagar com Mercado Pago"}
          icon={<Lock aria-hidden className="size-5" />}
          fillClassName="bg-sun"
          hoverTextClassName="text-sun-foreground"
        />
      </button>
      <p className="m-0 text-center text-[13px] text-muted-foreground">Pix ou cartão em até 12x, na página segura do Mercado Pago.</p>
      {blockedReason && <p className="m-0 rounded-lg bg-chip p-2.5 text-[13px]">{blockedReason}</p>}
      {problem && (
        <p role="alert" className="m-0 rounded-lg bg-chip p-2.5 text-sm">
          {problem.message}{" "}
          {(problem.code === "login" || problem.code === "cadastro") && (
            <Link className="font-bold text-brand-text underline" href={problem.code === "login" ? "/conta" : "/conta?secao=endereco"} onClick={onNavigate}>
              {problem.code === "login" ? "Entrar ou criar conta" : "Completar cadastro"}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
