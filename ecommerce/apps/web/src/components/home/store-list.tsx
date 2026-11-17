import { MapPin } from "lucide-react";
import type { Branch } from "@lojas-tropical/shared";

export function StoreList({ branches }: { branches: Branch[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
      {branches.map((b) => {
        const address = `${b.street}, ${b.district}, ${b.city} - ${b.state}, ${b.zipCode}`;
        return (
          <div key={b.slug} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-5 py-[18px]">
            <span className="text-[13px] font-bold tracking-[.04em] text-brand-text uppercase">{b.city}</span>
            <h3 className="flex items-center gap-2 text-[17px]">
              <MapPin aria-hidden className="size-[18px] flex-none text-brand-text" strokeWidth={2.2} />
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
              className="mt-1 text-sm font-bold text-brand-text hover:underline"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Lojas Tropical, ${address}`)}`}
              target="_blank"
              rel="noopener"
            >
              Ver no mapa →
            </a>
          </div>
        );
      })}
    </div>
  );
}
