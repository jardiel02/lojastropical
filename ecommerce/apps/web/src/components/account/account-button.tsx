"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { InteractiveHoverContent, interactiveHoverClasses } from "@/components/ui/interactive-hover-button";
import { cn } from "@/lib/utils";
import { firstName, useAccount } from "@/modules/account/store";

/** Botão da conta no topo: "Entrar" ou "Olá, Maria" quando o cliente está logado. */
export function AccountButton() {
  const account = useAccount();
  const name = firstName(account);
  const label = account.user ? (name ? `Olá, ${name}` : "Sua conta") : "Entrar";
  return (
    <Link
      href="/conta"
      className={cn(interactiveHoverClasses, "h-11 border-2 border-white/55 px-3.5 text-white")}
      aria-label={account.user ? "Sua conta" : "Entrar ou criar conta"}
    >
      <InteractiveHoverContent
        text={label}
        icon={<UserRound aria-hidden className="size-[22px]" />}
        fillClassName="bg-sun"
        hoverTextClassName="text-sun-foreground"
        textClassName="max-w-[12ch] truncate max-[480px]:hidden"
      />
    </Link>
  );
}
