import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountApp } from "@/components/account/account-app";
import { catalog } from "@/modules/catalog";

export const metadata: Metadata = { title: "Sua conta", robots: { index: false } };

/**
 * Cadastro, login e "Sua conta" do cliente (Supabase Auth, tabela public.clientes), com as
 * mesmas regras do site original. Pedidos online entram na etapa 7.
 */
export default async function AccountPage() {
  // Vende online só para as cidades onde há loja (mesma regra do site original)
  const cities = [...new Set((await catalog.listBranches()).map((b) => b.city))];
  return (
    <div className="wrap py-10">
      <Suspense fallback={<p className="py-16 text-center text-muted-foreground">Carregando sua conta…</p>}>
        <AccountApp cities={cities} />
      </Suspense>
    </div>
  );
}
