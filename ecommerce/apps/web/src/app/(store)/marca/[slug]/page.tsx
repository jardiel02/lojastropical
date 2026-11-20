import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/products/product-listing";
import { catalog, parseSearchParams } from "@/modules/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateStaticParams() {
  return (await catalog.listBrands()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await catalog.getBrand(slug);
  return b ? { title: `Produtos ${b.name}`, alternates: { canonical: `/marca/${b.slug}` } } : {};
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await catalog.getBrand(slug);
  if (!brand) notFound();
  const query = parseSearchParams(sp);
  query.brandSlugs = [slug];
  return (
    <ProductListing
      title={`Produtos ${brand.name}`}
      eyebrow="Marca"
      crumbs={[{ name: brand.name }]}
      action={`/marca/${slug}`}
      query={query}
      searchParams={sp}
      showBrandFilter={false}
    />
  );
}
