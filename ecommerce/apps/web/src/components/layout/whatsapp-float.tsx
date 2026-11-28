import { MessageCircle } from "lucide-react";
import { wa } from "@/lib/site";

export function WhatsAppFloat() {
  return (
    <a
      href={wa("Olá! Vim pelo site.")}
      target="_blank"
      rel="noopener"
      aria-label="Conversar no WhatsApp"
      className="fixed right-[calc(18px+env(safe-area-inset-right))] bottom-[calc(18px+env(safe-area-inset-bottom))] z-20 grid size-[50px] place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-[0_6px_18px_rgb(0_0_0/.25)] min-[861px]:size-[58px]"
    >
      <MessageCircle aria-hidden className="size-[30px]" strokeWidth={2.2} />
    </a>
  );
}
