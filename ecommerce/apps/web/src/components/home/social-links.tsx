import { ArrowRight, Link2, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { SITE, wa } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Redes sociais. Ao passar o mouse (ou focar pelo teclado) o botão sobe e ganha sombra, um
 * brilho atravessa a cor, o ícone dá um giro curto e uma seta entra pela direita, como nos
 * outros botões animados da loja. Sem animação para quem pede menos movimento no sistema.
 */
export function SocialLinks() {
  const links = [
    { href: `https://instagram.com/${SITE.instagram}`, label: "Instagram", sub: `@${SITE.instagram}`, Icon: InstagramIcon, cls: "bg-[linear-gradient(135deg,#c1356f,#a02f8f_55%,#6a2fa8)]" },
    { href: SITE.linkInBio, label: "Todos os links", sub: "linkme.bio/LojasTropical", Icon: Link2, cls: "bg-[#26731b]" },
    { href: wa("Olá! Vim pelo site."), label: "WhatsApp", sub: SITE.whatsappDisplay, Icon: MessageCircle, cls: "bg-[#0b7a3e]" },
  ];
  const motion = "duration-300 motion-reduce:transition-none";
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
      {links.map(({ href, label, sub, Icon, cls }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener"
          className={cn(
            "group/rede relative isolate flex items-center gap-3.5 overflow-hidden rounded-[var(--radius)] p-[18px] font-bold text-white",
            "transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_14px_28px_rgb(0_0_0/.22)] focus-visible:-translate-y-1 focus-visible:shadow-[0_14px_28px_rgb(0_0_0/.22)] motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0",
            motion,
            cls,
          )}
        >
          {/* Brilho que atravessa o botão */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-[left,opacity] duration-700 group-hover/rede:left-[120%] group-hover/rede:opacity-100 group-focus-visible/rede:left-[120%] group-focus-visible/rede:opacity-100 motion-reduce:hidden"
          />
          <span
            className={cn(
              "grid size-11 flex-none place-items-center rounded-full bg-white/15 transition-transform group-hover/rede:scale-110 group-hover/rede:-rotate-12 group-focus-visible/rede:scale-110 group-focus-visible/rede:-rotate-12 motion-reduce:group-hover/rede:transform-none",
              motion,
            )}
          >
            <Icon aria-hidden className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            {label}
            <span className="block text-sm font-medium opacity-92">{sub}</span>
          </div>
          <ArrowRight
            aria-hidden
            className={cn(
              "size-5 flex-none -translate-x-3 opacity-0 transition-[transform,opacity] group-hover/rede:translate-x-0 group-hover/rede:opacity-100 group-focus-visible/rede:translate-x-0 group-focus-visible/rede:opacity-100",
              motion,
            )}
          />
        </a>
      ))}
    </div>
  );
}
