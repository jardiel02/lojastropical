import type { LegalSlug } from "@/modules/legal";
import { previewData } from "../data";

export const LEGAL_PAGES = Object.fromEntries(Object.entries(previewData.legal).map(([slug, page]) => [slug, page.title])) as Record<
  LegalSlug,
  string
>;

export async function loadLegalPage(slug: LegalSlug) {
  const page = previewData.legal[slug];
  if (!page) throw new Error(`Política não encontrada: ${slug}`);
  return page;
}
