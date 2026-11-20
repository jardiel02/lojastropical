import Link from "next/link";
import { SITE } from "@/lib/site";

export type Crumb = { name: string; href?: string };

/** Trilha de navegação + dados estruturados BreadcrumbList. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Início", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: new URL(c.href, SITE.url).toString() } : {}),
    })),
  };
  return (
    <nav aria-label="Você está em" className="py-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap gap-1.5">
        {all.map((c, i) => (
          <li key={i} className="flex gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-foreground hover:underline">
                {c.name}
              </Link>
            ) : (
              <b aria-current="page" className="font-bold text-brand-text">
                {c.name}
              </b>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
