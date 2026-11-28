import { cents, formatBRL, type Product } from "@lojas-tropical/shared";
import { cn } from "@/lib/utils";

type PriceFields = Pick<Product, "cashPriceCents" | "manualInstallmentCents">;

/**
 * Preço com as mesmas regras do site original. Não mostra "de/por", desconto ou
 * condição de parcelamento que não exista nos dados.
 */
export function ProductPrice({ product, size = "card" }: { product: PriceFields; size?: "card" | "page" }) {
  const cash = product.cashPriceCents === null ? null : cents(product.cashPriceCents);
  const inst = product.manualInstallmentCents === null ? null : cents(product.manualInstallmentCents);
  const big = size === "page";
  const price = cn(
    "font-display font-bold leading-[1.1] tracking-[-.01em] text-price tabular-nums",
    big ? "text-[40px]" : "mt-1.5 text-lg max-[480px]:tracking-[-.02em] min-[481px]:text-[25px]",
  );
  const small = cn("font-bold mr-[3px]", big ? "text-xl" : "text-[15px]");
  const note = cn("text-muted-foreground", big ? "text-[15px]" : "text-[13px]");

  if (inst !== null) {
    return (
      <>
        <span className={price}>
          <small className={small}>{big ? "12x de" : "12x"}</small>
          {formatBRL(inst)}
        </span>
        {big && <span className={note}>no crediário próprio ou no cartão de crédito</span>}
        <span className={note}>
          {cash !== null ? (
            <>
              ou <b>{formatBRL(cash)}</b> à vista
            </>
          ) : big ? (
            "Confirme o valor à vista e no Pix pelo WhatsApp."
          ) : (
            "no crediário ou cartão"
          )}
        </span>
      </>
    );
  }
  if (cash !== null) {
    return (
      <>
        <span className={price}>{formatBRL(cash)}</span>
        <span className={note}>à vista</span>
        {big && <span className={note}>Também parcelamos em até 12x. Consulte as condições pelo WhatsApp.</span>}
      </>
    );
  }
  return (
    <>
      <span className={cn(price, "text-muted-foreground", big ? "text-[28px]" : "text-xl")}>Consulte o preço</span>
      <span className={note}>
        {big
          ? "Mande uma mensagem e o vendedor responde com o preço e as condições de pagamento."
          : "Responderemos no WhatsApp"}
      </span>
    </>
  );
}
