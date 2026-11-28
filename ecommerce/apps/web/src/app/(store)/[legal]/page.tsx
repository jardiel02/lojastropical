import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_PAGES, loadLegalPage, type LegalSlug } from "@/modules/legal";

type Props = { params: Promise<{ legal: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((legal) => ({ legal }));
}

const isLegal = (s: string): s is LegalSlug => s in LEGAL_PAGES;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legal } = await params;
  if (!isLegal(legal)) return {};
  const page = await loadLegalPage(legal);
  return { title: page.title, description: page.description, alternates: { canonical: `/${legal}` } };
}

export default async function LegalPage({ params }: Props) {
  const { legal } = await params;
  if (!isLegal(legal)) notFound();
  const page = await loadLegalPage(legal);
  // Conteúdo vem de arquivos do próprio repositório (não de usuários)
  return <article className="legal wrap" dangerouslySetInnerHTML={{ __html: page.html }} />;
}
