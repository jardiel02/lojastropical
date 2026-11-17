import { Link2, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import { SITE, wa } from "@/lib/site";

export function SocialLinks() {
  const links = [
    { href: `https://instagram.com/${SITE.instagram}`, label: "Instagram", sub: `@${SITE.instagram}`, Icon: InstagramIcon, cls: "bg-[linear-gradient(135deg,#c1356f,#a02f8f_55%,#6a2fa8)]" },
    { href: SITE.linkInBio, label: "Todos os links", sub: "linkme.bio/LojasTropical", Icon: Link2, cls: "bg-[#26731b]" },
    { href: wa("Olá! Vim pelo site."), label: "WhatsApp", sub: SITE.whatsappDisplay, Icon: MessageCircle, cls: "bg-[#0b7a3e]" },
  ];
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
      {links.map(({ href, label, sub, Icon, cls }) => (
        <a key={label} href={href} target="_blank" rel="noopener" className={`flex items-center gap-3.5 rounded-[var(--radius)] p-[18px] font-bold text-white ${cls}`}>
          <Icon aria-hidden className="size-7" />
          <div>
            {label}
            <span className="block text-sm font-medium opacity-92">{sub}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
