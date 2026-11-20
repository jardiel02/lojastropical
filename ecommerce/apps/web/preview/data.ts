import type { InstagramFeed } from "@/modules/instagram";

/** Dados lidos no build da prévia (textos jurídicos e retrato do Instagram), embutidos na página. */
export type PreviewData = {
  builtAt: string;
  legal: Record<string, { title: string; description: string; html: string }>;
  instagram: InstagramFeed | null;
};

declare const __PREVIEW_DATA__: PreviewData;
export const previewData: PreviewData = __PREVIEW_DATA__;
