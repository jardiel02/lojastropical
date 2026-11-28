import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cents, formatBRL, slugify } from "@lojas-tropical/shared";
import { Breadcrumbs } from "@/components/products/breadcrumbs";
import { ProductDetail } from "@/components/products/product-detail";
import { ProductGrid } from "@/components/products/product-grid";
import { SectionHeading } from "@/components/layout/section-heading";
import { toCardProduct } from "@/lib/card";
import { availability, colorCss, imageSrc, specsTable } from "@/lib/product-view";
import { SITE } from "@/lib/site";
import { catalog } from "@/modules/catalog";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await catalog.listProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await catalog.getProduct((await params).slug);
  if (!p) return {};
  const price = p.cashPriceCents !== null ? ` por ${formatBRL(cents(p.cashPriceCents))} à vista` : "";
  return {
    title: p.name,
    description: `${p.shortDescription || p.name}${price}. Entrega e montagem grátis na região das nossas lojas.`.slice(0, 160),
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { title: p.name, images: [imageSrc(p.images[0]!)] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, hex, branches, all] = await Promise.all([
    catalog.getProduct(slug),
    catalog.getColorHex(),
    catalog.listBranches(),
    catalog.listProducts(),
  ]);
  if (!p) notFound();

  const related = [
    ...all.filter((x) => x.category === p.category && x.slug !== p.slug),
    ...all.filter((x) => x.category !== p.category && x.cashPriceCents !== null),
  ].slice(0, 4);
  const paragraphs = (p.description ?? p.shortDescription).split("\n").filter(Boolean);
  const status = availability(p);

  // Dados estruturados de produto (Google). Sem preço = sem "offers", para não anunciar valor errado.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.erpCode ?? p.slug,
    brand: { "@type": "Brand", name: p.brand },
    category: p.category,
    description: p.description ?? p.shortDescription,
    image: p.images.map((i) => new URL(imageSrc(i), SITE.url).toString()),
    ...(p.cashPriceCents !== null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: (p.cashPriceCents / 100).toFixed(2),
        url: new URL(`/produto/${p.slug}`, SITE.url).toString(),
        availability: status === "out-of-stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        seller: { "@type": "Organization", name: SITE.name },
      },
    }),
  };

  return (
    <div className="wrap">
      <Breadcrumbs items={[{ name: p.category, href: `/departamento/${slugify(p.category)}` }, { name: p.name }]} />
      <ProductDetail
        product={p}
        colorCss={p.colors.map((c) => colorCss(c.name, hex))}
        cities={[...new Set(branches.map((b) => b.city))]}
      />
      <div className="grid gap-9 border-t border-line py-8">
        <section aria-labelledby="descricao">
          <h2 id="descricao" className="mb-2.5 border-b border-line pb-2.5 text-[28px]">
            Descrição
          </h2>
          {paragraphs.map((t, i) => (
            <p key={i} className="mb-2.5 max-w-[80ch]">
              {t}
            </p>
          ))}
          {p.highlights.length > 0 && (
            <>
              <p className="mt-3.5 mb-1 font-bold">Principais características</p>
              <ul className="mt-2 mb-4 list-disc pl-5">
                {p.highlights.map((h) => {
                  const i = h.indexOf(":");
                  return (
                    <li key={h} className="my-0.5">
                      {i > 0 ? (
                        <>
                          <b>{h.slice(0, i + 1)}</b>
                          {h.slice(i + 1)}
                        </>
                      ) : (
                        h
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <p className="max-w-[80ch]">
            Na Lojas Tropical, a entrega e a montagem são grátis. Você pode pagar no crediário próprio ou parcelar em até 12x.
          </p>
        </section>
        <section aria-labelledby="especificacoes">
          <h2 id="especificacoes" className="mb-2.5 border-b border-line pb-2.5 text-[28px]">
            Especificações técnicas
          </h2>
          <table className="w-full border-collapse text-[15px]">
            <tbody>
              {specsTable(p).map(([k, v]) => (
                <tr key={k} className="even:bg-[color-mix(in_srgb,var(--line)_55%,transparent)]">
                  <th scope="row" className="w-[45%] px-3 py-3.5 text-left align-top font-medium min-[861px]:w-1/2">
                    {k}
                  </th>
                  <td className="px-3 py-3.5 align-top">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      {related.length > 0 && (
        <section className="pt-2 pb-11" aria-labelledby="relacionados">
          <SectionHeading eyebrow="Veja também" title="Você também pode gostar" id="relacionados" />
          <ProductGrid products={related.map((x) => toCardProduct(x, hex))} />
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
