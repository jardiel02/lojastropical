import { BannerCarousel } from "@/components/home/banner-carousel";
import { BrandGrid } from "@/components/home/brand-grid";
import { InstagramStrip } from "@/components/home/instagram-strip";
import { SocialLinks } from "@/components/home/social-links";
import { StoreList } from "@/components/home/store-list";
import { PromotionalBar } from "@/components/layout/promotional-bar";
import { SectionHeading } from "@/components/layout/section-heading";
import { CategoryRow } from "@/components/products/category-row";
import { toCardProduct } from "@/lib/card";
import { BANNERS } from "@/modules/campaigns";
import { catalog } from "@/modules/catalog";
import { getInstagramFeed } from "@/modules/instagram";
import { isOutOfStock } from "@lojas-tropical/shared";

export const revalidate = 3600;

const PER_ROW = 10; // mesmo número de produtos por linha do site original

export default async function HomePage() {
  const [products, categories, brands, branches, hex, instagram] = await Promise.all([
    catalog.listProducts(),
    catalog.listCategories(),
    catalog.listBrands(),
    catalog.listBranches(),
    catalog.getColorHex(),
    getInstagramFeed(),
  ]);
  // Esgotados no fim de cada linha
  const ordered = [...products].sort((a, b) => Number(isOutOfStock(a)) - Number(isOutOfStock(b)));
  const featuredBrands = brands
    .filter((b) => b.featured)
    .map((b) => ({ ...b, count: products.filter((p) => p.brand === b.name).length }));

  return (
    <>
      <h1 className="sr-only">Lojas Tropical — móveis e eletrodomésticos</h1>
      <BannerCarousel banners={BANNERS} />
      <PromotionalBar />

      <section className="py-11" aria-labelledby="titulo-catalogo">
        <div className="wrap">
          <SectionHeading
            eyebrow="Catálogo"
            title="Nossos departamentos"
            id="titulo-catalogo"
            aside={<span className="text-sm text-muted-foreground">{products.length} produtos</span>}
          />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-[26px] min-[481px]:gap-[34px]">
            {categories.map((c) => {
              const inCat = ordered.filter((p) => p.category === c.name);
              if (!inCat.length) return null;
              return (
                <CategoryRow
                  key={c.slug}
                  title={c.name}
                  href={`/departamento/${c.slug}`}
                  total={inCat.length}
                  products={inCat.slice(0, PER_ROW).map((p) => toCardProduct(p, hex))}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="pt-2 pb-11" aria-labelledby="titulo-marcas">
        <div className="wrap">
          <SectionHeading eyebrow="Principais fornecedores" title="Navegue por marcas" id="titulo-marcas" />
          <BrandGrid brands={featuredBrands} />
        </div>
      </section>

      {instagram && <InstagramStrip feed={instagram} />}

      <section id="lojas" className="py-11" aria-labelledby="titulo-lojas">
        <div className="wrap">
          <SectionHeading eyebrow="Onde estamos" title="Nossas lojas" id="titulo-lojas" />
          <StoreList branches={branches} />
        </div>
      </section>

      <section id="redes" className="pb-11" aria-labelledby="titulo-redes">
        <div className="wrap">
          <SectionHeading eyebrow="Redes sociais" title="Siga a Tropical" id="titulo-redes" />
          <SocialLinks />
        </div>
      </section>
    </>
  );
}
