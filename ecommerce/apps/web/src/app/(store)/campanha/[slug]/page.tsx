import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/products/product-listing";
import { CAMPAIGNS, getCampaign } from "@/modules/campaigns";
import { parseSearchParams } from "@/modules/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateStaticParams() {
  return CAMPAIGNS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCampaign((await params).slug);
  return c ? { title: c.title, description: c.description, alternates: { canonical: `/campanha/${c.slug}` } } : {};
}

export default async function CampaignPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const campaign = getCampaign(slug);
  if (!campaign) notFound();
  return (
    <ProductListing
      title={campaign.title}
      eyebrow="Campanha"
      crumbs={[{ name: campaign.title }]}
      action={`/campanha/${slug}`}
      query={parseSearchParams(sp, { erpCodes: campaign.erpCodes })}
      searchParams={sp}
      intro={<p className="mt-1 text-muted-foreground">{campaign.description}</p>}
    />
  );
}
