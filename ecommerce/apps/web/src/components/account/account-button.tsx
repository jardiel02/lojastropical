"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { firstName, useAccount } from "@/modules/account/store";

/** Botão da conta no topo: "Entrar" ou "Olá, Maria" quando o cliente está logado. */
export function AccountButton() {
  const account = useAccount();
  const name = firstName(account);
  const label = account.user ? (name ? `Olá, ${name}` : "Sua conta") : "Entrar";
  return (
    <Link
      href="/conta"
      className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-white/55 px-3.5 font-bold text-white hover:bg-white/12"
      aria-label={account.user ? "Sua conta" : "Entrar ou criar conta"}
    >
      <UserRound aria-hidden className="size-[22px]" />
      <span className="max-w-[12ch] truncate max-[480px]:hidden">{label}</span>
    </Link>
  );
}
