import Image from "next/image";
import { CreditCard, ReceiptText, Truck } from "lucide-react";

/** Barra de benefícios (frete, montagem, crediário, 12x), com os textos do site original. */
export function PromotionalBar() {
  const perks = [
    { icon: <Truck aria-hidden className="size-[34px]" strokeWidth={1.6} />, title: "Frete grátis pra você!", text: "Na região das nossas lojas." },
    {
      icon: <Image src="/img/icone-montagem.png" alt="" width={30} height={30} className="mx-0.5 size-[30px]" />,
      title: "Montagem sem custo!",
      text: "A gente monta pra você.",
    },
    { icon: <ReceiptText aria-hidden className="size-[34px]" strokeWidth={1.6} />, title: "Crediário próprio", text: "Compre no carnê da loja." },
    { icon: <CreditCard aria-hidden className="size-[34px]" strokeWidth={1.6} />, title: "Parcele em até 12x", text: "No cartão de crédito." },
  ];
  return (
    <div className="on-brand bg-brand-deep text-white">
      <ul className="wrap grid grid-cols-1 gap-x-6 gap-y-3.5 py-4 min-[481px]:grid-cols-2 min-[861px]:grid-cols-[repeat(4,max-content)] min-[861px]:justify-between">
        {perks.map((p) => (
          <li key={p.title} className="flex min-w-0 items-center gap-3">
            {p.icon}
            <div>
              <b className="block font-display text-base leading-tight font-bold tracking-[-.01em] min-[481px]:text-lg">{p.title}</b>
              <span className="text-sm text-white/88">{p.text}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
