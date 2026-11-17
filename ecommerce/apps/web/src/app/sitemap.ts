import type { MetadataRoute } from "next";
import { slugify } from "@lojas-tropical/shared";
import { SITE } from "@/lib/site";
import { catalog } from "@/modules/catalog";
import { LEGAL_PAGES } from "@/modules/legal";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands] = await Promise.all([catalog.listProducts(), catalog.listCategories(), catalog.listBrands()]);
  const url = (path: string) => new URL(path, SITE.url).toString();
  const usedBrands = new Set(products.map((p) => slugify(p.brand)));
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/busca"), changeFrequency: "daily", priority: 0.6 },
    ...categories.map((c) => ({ url: url(`/departamento/${c.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...brands.filter((b) => usedBrands.has(b.slug)).map((b) => ({ url: url(`/marca/${b.slug}`), priority: 0.5 })),
    ...products.map((p) => ({ url: url(`/produto/${p.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...Object.keys(LEGAL_PAGES).map((s) => ({ url: url(`/${s}`), priority: 0.2 })),
  ];
}
