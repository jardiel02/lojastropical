"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { CreditCard, Hammer, MessageCircle, ReceiptText, ShoppingCart, Truck } from "lucide-react";
import type { Product } from "@lojas-tropical/shared";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { MAX_QTY_PER_LINE } from "@/modules/cart/schema";
import { availability, imagesForColor } from "@/lib/product-view";
import { wa } from "@/lib/site";
import { ProductAvailability } from "./product-availability";
import { ProductGallery } from "./product-gallery";
import { ProductPrice } from "./product-price";
import { ProductVariants } from "./product-variants";
import { QuantitySelector } from "./quantity-selector";

const noopSubscribe = () => () => {};
function colorFromUrl(count: number): number {
  const n = Number(new URLSearchParams(window.location.search).get("cor"));
  return Number.isInteger(n) && n > 0 && n < count ? n : 0;
}

export function ProductDetail({
  product: p,
  colorCss,
  cities,
}: {
  product: Product;
  colorCss: string[];
  cities: string[];
}) {
  const { add, setOpen } = useCart();
  // Cor escolhida no cartão (?cor=N): lida no navegador para a página continuar estática
  const urlColor = useSyncExternalStore(noopSubscribe, () => colorFromUrl(p.colors.length), () => 0);
  const [picked, setColor] = useState<number | null>(null);
  const color = p.colors.length ? (picked ?? urlColor) : -1;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [city, setCity] = useState(cities[0] ?? "");
  const status = availability(p);
  const soldOut = status === "out-of-stock";
  const colorName = color >= 0 ? (p.colors[color]?.name ?? null) : null;
  const images = imagesForColor(p, color >= 0 ? color : null);

  const orderText = () => {
    const c = colorName && p.colors.length > 1 ? `, cor ${colorName}` : "";
    if (soldOut) return `Olá! Vim pelo site e quero saber quando chega: ${p.name}${c}`;
    return `Olá! Vim pelo site e quero comprar: ${p.name}${c}${qty > 1 ? ` (quantidade: ${qty})` : ""}`;
  };

  return (
    <div className="grid items-start gap-5 pb-10 min-[861px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] min-[861px]:gap-8">
      <ProductGallery key={color} images={images} name={p.name} coverFirst={p.coverFit === "cover" && color <= 0} />
      <div className="flex min-w-0 flex-col gap-3.5">
        <div>
          <span className="text-xs font-semibold tracking-[.08em] text-muted-foreground uppercase">{p.category}</span>
          <h1 className="font-sans text-[clamp(22px,2.6vw,30px)] leading-tight font-bold">{p.name}</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span>
            Marca: <b className="text-foreground">{p.brand}</b>
          </span>
          {p.erpCode && <span>Cód.: {p.erpCode}</span>}
          <span>Entrega e montagem grátis</span>
          <ProductAvailability status={status} />
        </div>
        <div className="grid gap-1 rounded-[var(--radius)] border border-line bg-surface px-5 py-[18px]">
          <ProductPrice product={p} size="page" />
        </div>
        <ProductVariants
          colors={p.colors.map((c, i) => ({ name: c.name, css: colorCss[i] ?? "#ccc" }))}
          selected={Math.max(0, color)}
          onSelect={(i) => {
            setColor(i);
            setAdded(false);
          }}
        />
        <QuantitySelector value={qty} onChange={setQty} max={MAX_QTY_PER_LINE} />
        <Button asChild variant="buy" size="lg">
          <a href={wa(orderText())} target="_blank" rel="noopener">
            <MessageCircle aria-hidden className="size-[22px]" />
            {soldOut ? "Avise quando chegar" : "Comprar pelo WhatsApp"}
          </a>
        </Button>
        <Button
          variant="outlineBuy"
          size="lg"
          disabled={soldOut}
          onClick={() => {
            add({ slug: p.slug, color: colorName, qty });
            setAdded(true);
          }}
        >
          <ShoppingCart aria-hidden className="size-[22px]" />
          Adicionar ao carrinho
        </Button>
        <div className="min-h-6 text-sm font-bold text-buy-text" aria-live="polite">
          {added && (
            <>
              Adicionado ao carrinho.{" "}
              <button type="button" className="underline" onClick={() => setOpen(true)}>
                Ver carrinho
              </button>
            </>
          )}
        </div>
        <div className="grid gap-3 rounded-[var(--radius)] bg-chip px-[18px] py-4">
          <ul className="grid gap-x-4 gap-y-2.5 min-[481px]:grid-cols-2">
            {[
              [Truck, "Entrega grátis"],
              [Hammer, "Montagem grátis"],
              [ReceiptText, "Crediário próprio"],
              [CreditCard, "Até 12x no cartão"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Truck;
              return (
                <li key={label as string} className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
                  <span className="grid size-[34px] flex-none place-items-center rounded-full bg-surface text-brand-text">
                    <I aria-hidden className="size-[18px]" />
                  </span>
                  {label as string}
                </li>
              );
            })}
          </ul>
          <label htmlFor="cidade-entrega" className="text-[15px] font-bold">
            Consulte a entrega na sua cidade
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id="cidade-entrega"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="min-w-0 flex-[1_1_180px] rounded-[10px] border border-line bg-surface px-3 py-2.5"
            >
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option>Outra cidade</option>
            </select>
            <a
              href={wa(`Olá! Vocês entregam o produto ${p.name} em ${city}?`)}
              target="_blank"
              rel="noopener"
              className="rounded-[10px] border-2 border-foreground px-4 py-2.5 font-bold whitespace-nowrap"
            >
              Consultar
            </a>
          </div>
          <p className="m-0 text-[13px] text-muted-foreground">
            O cálculo automático de frete e prazo chega junto com o checkout online.{" "}
            <Link href="/#lojas" className="underline">
              Ver nossas lojas
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
