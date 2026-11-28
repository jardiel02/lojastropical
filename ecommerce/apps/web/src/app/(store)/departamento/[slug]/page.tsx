import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/products/product-listing";
import { navCategories } from "@/lib/nav";
import { catalog, parseSearchParams } from "@/modules/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateStaticParams() {
  return (await catalog.listCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await catalog.getCategory(slug);
  if (!c) return {};
  return {
    title: c.name,
    description: `${c.name} na Lojas Tropical: entrega e montagem grátis na região das nossas lojas e crediário próprio.`,
    alternates: { canonical: `/departamento/${c.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await catalog.getCategory(slug);
  if (!category) notFound();
  const nav = (await navCategories()).find((c) => c.slug === slug);
  const query = parseSearchParams(sp, { categorySlug: slug });
  if (query.subgroup && !nav?.subgroups.includes(query.subgroup)) query.subgroup = undefined;
  return (
    <ProductListing
      title={query.subgroup ? `${category.name}: ${query.subgroup}` : category.name}
      eyebrow="Departamento"
      crumbs={query.subgroup ? [{ name: category.name, href: `/departamento/${slug}` }, { name: query.subgroup }] : [{ name: category.name }]}
      action={`/departamento/${slug}`}
      query={query}
      searchParams={sp}
      subgroups={nav?.subgroups ?? []}
    />
  );
}
