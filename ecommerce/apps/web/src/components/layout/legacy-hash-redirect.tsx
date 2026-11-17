"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * O site original usava links com # (ex.: /#produto-moval-alasca~1, /#catalogo, /#lojas).
 * O # não chega ao servidor, então o redirecionamento acontece aqui, no navegador.
 */
export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (!h) return;
    const produto = /^produto-([a-z0-9-]+)(?:~(\d+))?$/.exec(h);
    if (produto) {
      router.replace(`/produto/${produto[1]}${produto[2] ? `?cor=${produto[2]}` : ""}`);
      return;
    }
    if (h === "catalogo") router.replace("/busca");
    else if (h.startsWith("conta")) router.replace("/conta");
  }, [router]);
  return null;
}
