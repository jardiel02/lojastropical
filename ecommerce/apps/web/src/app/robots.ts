import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Só libera indexação quando NEXT_PUBLIC_ALLOW_INDEXING=true (produção). Homologação fica fora do Google. */
export default function robots(): MetadataRoute.Robots {
  const allow = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  return {
    rules: allow ? { userAgent: "*", allow: "/", disallow: ["/api/", "/conta", "/busca?"] } : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", SITE.url).toString(),
  };
}
