import "server-only";
import { catalog } from "@/modules/catalog";
import { matchesSubgroup } from "@/modules/catalog/search";
import type { NavCategory } from "@/components/layout/category-nav";

/** Departamentos do menu, com os subgrupos que têm produto (regra do site original). */
export async function navCategories(): Promise<NavCategory[]> {
  const [categories, products] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    subgroups: c.subgroups
      .filter((g) => products.some((p) => p.category === c.name && matchesSubgroup(p, g.pattern)))
      .map((g) => g.name),
  }));
}
