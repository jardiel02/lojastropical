import Image from "next/image";
import Link from "next/link";
import { AccountButton } from "@/components/account/account-button";
import { CartButton } from "@/components/cart/cart-button";
import { InteractiveHoverContent, interactiveHoverClasses } from "@/components/ui/interactive-hover-button";
import { wa } from "@/lib/site";
import { cn } from "@/lib/utils";
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
            className={cn(interactiveHoverClasses, "h-11 bg-whatsapp px-4 text-whatsapp-foreground max-[860px]:hidden")}
          >
            <InteractiveHoverContent text="Compre pelo WhatsApp" fillClassName="bg-[#0b7a3b]" hoverTextClassName="text-white" />
          </a>
          <AccountButton />
          <CartButton />
        </div>
      </div>
      <CategoryNav categories={categories} />
    </header>
  );
}
