import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@lojas-tropical/shared";
import { wa } from "@/lib/site";

const tile =
  "flex h-full w-full flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-2 py-4 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_10px_24px_rgb(156_10_16/.14)] motion-reduce:transition-none min-[861px]:px-3 min-[861px]:py-[22px]";

export function BrandGrid({ brands }: { brands: (Brand & { count: number })[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 min-[481px]:grid-cols-3 min-[861px]:grid-cols-5 min-[861px]:gap-4 max-[480px]:[&>li:last-child:nth-child(odd)]:col-span-full">
      {brands.map((b) => {
        const content = (
          <span className={b.logo ? "flex h-24 w-full items-center justify-center rounded-[10px] bg-white p-3.5" : "flex h-16 items-center"}>
            {b.logo ? (
              <Image src={`/img/${b.logo}`} alt={b.name} width={200} height={68} className="max-h-16 w-auto object-contain" />
            ) : (
              <b className="font-display text-[clamp(22px,2.6vw,30px)] text-brand-text">{b.name}</b>
            )}
          </span>
        );
        return (
          <li key={b.slug}>
            {b.count > 0 ? (
              <Link href={`/marca/${b.slug}`} className={tile} aria-label={`Ver produtos ${b.name}`}>
                {content}
              </Link>
            ) : (
              <a href={wa(`Olá! Vim pelo site e quero ver os produtos ${b.name}.`)} target="_blank" rel="noopener" className={tile} aria-label={`Perguntar no WhatsApp sobre produtos ${b.name}`}>
                {content}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
