import { wa, SITE } from "@/lib/site";

/** Faixa fina de informações comerciais acima do cabeçalho. */
export function TopBar() {
  return (
    <div className="on-brand bg-brand-deep text-[13px] text-white/90">
      <div className="wrap flex items-center justify-center gap-x-4 py-1.5 text-center min-[861px]:justify-between">
        <p className="m-0">
          Entrega e montagem grátis na região das nossas lojas<span className="max-[860px]:hidden"> · Crediário próprio</span>
        </p>
        <a className="hidden font-semibold text-white hover:underline min-[861px]:inline" href={wa("Olá! Vim pelo site.")} target="_blank" rel="noopener">
          Atendimento pelo WhatsApp {SITE.whatsappDisplay}
        </a>
      </div>
    </div>
  );
}
