import type { Metadata } from "next";
import { wa } from "@/lib/site";

export const metadata: Metadata = { title: "Sua conta", robots: { index: false } };

/**
 * A conta do cliente do site original usa Supabase Auth. Nesta nova plataforma ela será
 * refeita com Auth.js (etapa 7), migrando os cadastros existentes. Até lá, nada de login falso.
 */
export default function AccountPage() {
  return (
    <div className="wrap max-w-2xl py-12">
      <span className="eyebrow">Sua conta</span>
      <h1 className="mb-3 text-[clamp(28px,3.6vw,40px)]">Área do cliente em construção</h1>
      <p className="mb-4 text-muted-foreground">
        Nesta nova versão do site, o cadastro, o login e o acompanhamento de pedidos ainda estão sendo implantados. Enquanto isso, fale com a
        gente pelo WhatsApp para comprar ou tirar dúvidas.
      </p>
      <a className="inline-flex h-12 items-center rounded-xl bg-buy px-5 font-bold text-white" href={wa("Olá! Vim pelo site.")} target="_blank" rel="noopener">
        Falar no WhatsApp
      </a>
    </div>
  );
}
