/**
 * Campanhas e banners. Hoje ficam em código (mesmos do site original); na etapa 9
 * passam a ser cadastrados pelo painel administrativo (tabela promotions/banners).
 */
export type Banner = {
  id: string;
  label: string;
  href: string;
  desktop: { src: string; width: number; height: number };
  mobile: { src: string; width: number; height: number };
  alt: string;
  /** Texto do banner para leitores de tela e para o celular (no computador ele já está na arte). */
  heading: string;
  headingLines: { t: string; hl?: boolean }[][];
  theme: "dark" | "cream" | "light";
  text: string;
  cta: string;
};

export const BANNERS: Banner[] = [
  {
    id: "imagem-e-som",
    label: "Imagem e som",
    href: "/departamento/audio-e-video",
    desktop: { src: "/img/banner-imagem-e-som-1920x480.jpg", width: 1920, height: 480 },
    mobile: { src: "/img/banner-imagem-e-som-produtos-mobile.jpg", width: 960, height: 543 },
    alt: "Smart TV Semp Roku de 50 polegadas e caixa de som Amvox ACA 1200 sobre um pedestal com iluminação vermelha",
    heading: "Imagem e som para curtir mais",
    headingLines: [[{ t: "IMAGEM E SOM" }], [{ t: "PARA CURTIR MAIS", hl: true }]],
    theme: "dark",
    text: "TVs e caixas de som na Lojas Tropical",
    cta: "Confira os modelos",
  },
  {
    id: "praticidade",
    label: "Mais praticidade",
    href: "/campanha/mais-praticidade",
    desktop: { src: "/img/banner-praticidade-1920x480.jpg", width: 1920, height: 480 },
    mobile: { src: "/img/banner-praticidade-produtos-mobile.jpg", width: 900, height: 543 },
    alt: "Forno Elétrico Suggar de 50 litros preto, Liquidificador Britânia Diamante Vermelho e Ventilador Mondial Super Power VSP40 sobre bancada de madeira clara",
    heading: "Mais praticidade no seu dia a dia",
    headingLines: [[{ t: "MAIS " }, { t: "PRATICIDADE", hl: true }], [{ t: "NO SEU DIA A DIA" }]],
    theme: "cream",
    text: "Facilite sua rotina com a Lojas Tropical",
    cta: "Confira os produtos",
  },
  {
    id: "casa-completa",
    label: "Sua casa mais completa",
    href: "/departamento/eletrodomesticos",
    desktop: { src: "/img/banner-casa-completa-1920x480.jpg", width: 1920, height: 480 },
    mobile: { src: "/img/banner-casa-completa-produtos-mobile.jpg", width: 720, height: 543 },
    alt: "Geladeira Consul CRM50MK inox, lavadora Electrolux LES11 branca com abertura superior e fogão Mueller Decorato Vetro de cinco bocas preto fosco",
    heading: "Sua casa mais completa",
    headingLines: [[{ t: "SUA CASA" }], [{ t: "MAIS " }, { t: "COMPLETA", hl: true }]],
    theme: "light",
    text: "Eletrodomésticos para sua casa você encontra na Lojas Tropical",
    cta: "Ver eletrodomésticos",
  },
];

export type Campaign = { slug: string; title: string; description: string; erpCodes: string[] };

export const CAMPAIGNS: Campaign[] = [
  {
    slug: "mais-praticidade",
    title: "Mais praticidade",
    description: "Facilite sua rotina com a Lojas Tropical.",
    // Mesmos produtos do banner do site original (forno, liquidificador e ventilador)
    erpCodes: ["9874", "6596", "9737"],
  },
];

export const getCampaign = (slug: string) => CAMPAIGNS.find((c) => c.slug === slug) ?? null;
