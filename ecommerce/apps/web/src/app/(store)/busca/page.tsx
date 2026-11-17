import type { Metadata } from "next";
import { ProductListing } from "@/components/products/product-listing";
import { parseSearchParams } from "@/modules/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  const text = Array.isArray(q) ? q[0] : q;
  // Resultados de busca não são indexados; a página "todos os produtos" é
  return text ? { title: `Busca: ${text.slice(0, 60)}`, robots: { index: false } } : { title: "Todos os produtos", alternates: { canonical: "/busca" } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = parseSearchParams(sp);
  return (
    <ProductListing
      title={query.text ? `Resultados para “${query.text}”` : "Todos os produtos"}
      eyebrow={query.text ? "Busca" : "Catálogo"}
      crumbs={[{ name: query.text ? "Busca" : "Todos os produtos" }]}
      action="/busca"
      query={query}
      searchParams={sp}
    />
  );
}
