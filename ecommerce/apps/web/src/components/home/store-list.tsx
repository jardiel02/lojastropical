import { MapPin } from "lucide-react";
import type { Branch } from "@lojas-tropical/shared";
import { InteractiveHoverContent, interactiveHoverClasses } from "@/components/ui/interactive-hover-button";
import { cn } from "@/lib/utils";

/**
 * Lojas físicas. Ao passar o mouse (ou focar pelo teclado) o cartão sobe, ganha sombra e
 * borda vermelha, a faixa amarela do topo se abre e o pino do mapa pula. Sem animação para
 * quem pede menos movimento no sistema.
 */
export function StoreList({ branches }: { branches: Branch[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      {branches.map((b) => {
        const address = `${b.street}, ${b.district}, ${b.city} - ${b.state}, ${b.zipCode}`;
        return (
          <div
            key={b.slug}
            className="group/loja relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-line bg-surface px-5 pt-[22px] pb-[18px] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_14px_30px_rgb(156_10_16/.16)] focus-within:-translate-y-1 focus-within:border-brand focus-within:shadow-[0_14px_30px_rgb(156_10_16/.16)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 origin-left scale-x-[.18] bg-sun transition-transform duration-500 group-hover/loja:scale-x-100 group-focus-within/loja:scale-x-100 motion-reduce:transition-none"
            />
            <span className="text-[13px] font-bold tracking-[.04em] text-brand-text uppercase">{b.city}</span>
            <h3 className="flex items-center gap-2 text-[17px]">
              <span className="grid size-8 flex-none place-items-center rounded-full bg-chip text-brand-text transition-colors duration-300 group-hover/loja:bg-brand group-hover/loja:text-white group-focus-within/loja:bg-brand group-focus-within/loja:text-white">
                <MapPin
                  aria-hidden
                  className="size-[18px] group-hover/loja:animate-[pino_.6s_ease-out] motion-reduce:group-hover/loja:animate-none"
                  strokeWidth={2.2}
                />
              </span>
              {b.name}
            </h3>
            <address className="flex-1 text-sm leading-normal text-muted-foreground not-italic">
              {b.street}
              <br />
              {b.district}, {b.city} - {b.state}
              <br />
              CEP {b.zipCode}
            </address>
            <a
              className={cn(interactiveHoverClasses, "mt-2 h-10 self-start border-2 border-brand-text px-4 text-sm text-brand-text")}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Lojas Tropical, ${address}`)}`}
              target="_blank"
              rel="noopener"
              aria-label={`Ver ${b.name} no mapa`}
            >
              <InteractiveHoverContent text="Ver no mapa" fillClassName="bg-brand" hoverTextClassName="text-white" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
