import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { CartButton } from "@/components/cart/cart-button";
import { wa } from "@/lib/site";
import type { NavCategory } from "./category-nav";
import { CategoryNav } from "./category-nav";
import { SearchBar } from "./search-bar";

export function Header({ categories }: { categories: NavCategory[] }) {
  return (
    <header className="on-brand z-30 bg-brand text-white shadow-[0_2px_12px_rgb(0_0_0/.18)] min-[861px]:sticky min-[861px]:top-0">
      <div className="wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-2 min-[861px]:gap-x-6 min-[861px]:py-2.5">
        <Link href="/" className="block flex-none" aria-label="Lojas Tropical, página inicial">
          <Image
            src="/img/logo.png"
            alt="Lojas Tropical, Mania de preços baixos"
            width={520}
            height={223}
            priority
            className="h-[52px] w-auto min-[861px]:h-16"
          />
        </Link>
        <SearchBar />
        <div className="order-2 ml-auto flex items-center gap-2.5 min-[861px]:order-3 min-[861px]:ml-0">
          <a
            href={wa("Olá! Vim pelo site.")}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-whatsapp px-4 font-bold whitespace-nowrap text-whatsapp-foreground max-[860px]:hidden"
          >
            Compre pelo WhatsApp
          </a>
          <Link
            href="/conta"
            className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-white/55 px-3.5 font-bold text-white hover:bg-white/12"
            aria-label="Entrar ou criar conta"
          >
            <UserRound aria-hidden className="size-[22px]" />
            <span className="max-[480px]:hidden">Entrar</span>
          </Link>
          <CartButton />
        </div>
      </div>
      <CategoryNav categories={categories} />
    </header>
  );
}
