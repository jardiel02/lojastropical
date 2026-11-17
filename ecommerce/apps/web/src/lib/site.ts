import { whatsappLink } from "@lojas-tropical/shared";

export const SITE = {
  name: "Lojas Tropical",
  slogan: "Mania de preços baixos",
  description:
    "Lojas Tropical: móveis e eletrodomésticos no Maranhão com crediário próprio, parcelamento em até 12x e entrega e montagem grátis.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsapp: "559981771035",
  whatsappDisplay: "(99) 98177-1035",
  instagram: "lojastropicaloficial",
  linkInBio: "https://linkme.bio/LojasTropical",
} as const;

export const wa = (message?: string) => whatsappLink(SITE.whatsapp, message);
