/** Roda em Node no build da prévia: lê as políticas do site original e o feed do Instagram. */
import { LEGAL_PAGES, loadLegalPage, type LegalSlug } from "@/modules/legal";
import { getInstagramFeed } from "@/modules/instagram";

export async function collect() {
  const legal: Record<string, { title: string; description: string; html: string }> = {};
  for (const slug of Object.keys(LEGAL_PAGES) as LegalSlug[]) legal[slug] = await loadLegalPage(slug);
  return { legal, instagram: await getInstagramFeed() };
}
