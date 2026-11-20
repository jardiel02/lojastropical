/**
 * Rotas da prévia. A prévia roda numa página só (sem servidor), então cada endereço do site
 * vira um "#": /produto/x?cor=1 → #produto-x?cor=1, /departamento/y → #departamento-y.
 * Os links antigos do site original (#produto-x~2, #catalogo, #conta) continuam valendo.
 */
import { previewData } from "./data";

export type PreviewLocation = { pathname: string; search: string; anchor: string | null };

const LEGAL = new Set(Object.keys(previewData.legal));

export function hrefToHash(href: string): string {
  if (!href.startsWith("/")) return href;
  const url = new URL(href, "https://previa.invalid");
  const segments = url.pathname.split("/").filter(Boolean);
  if (!segments.length) return url.hash || "#inicio";
  return `#${segments.join("-")}${url.search}`;
}

export function hashToLocation(hash: string): PreviewLocation {
  const raw = hash.replace(/^#/, "");
  const q = raw.indexOf("?");
  const name = q >= 0 ? raw.slice(0, q) : raw;
  const search = q >= 0 ? raw.slice(q) : "";
  if (!name || name === "inicio") return { pathname: "/", search: "", anchor: null };
  const m = /^(produto|departamento|marca|campanha)-(.+)$/.exec(name);
  if (m) {
    const [, section, rest] = m as unknown as [string, string, string];
    if (section === "produto") {
      const [slug, color] = rest.split("~");
      return { pathname: `/produto/${slug}`, search: color ? `?cor=${color}` : search, anchor: null };
    }
    return { pathname: `/${section}/${rest}`, search, anchor: null };
  }
  if (name === "busca" || name === "catalogo") return { pathname: "/busca", search, anchor: null };
  if (name === "conta" || name.startsWith("conta-")) return { pathname: "/conta", search, anchor: null };
  if (LEGAL.has(name)) return { pathname: `/${name}`, search: "", anchor: null };
  // Qualquer outro nome é uma seção da página inicial (#lojas, #redes)
  return { pathname: "/", search: "", anchor: name };
}

export const isRouteHash = (hash: string) => hashToLocation(hash).anchor === null;

let current: PreviewLocation = { pathname: "/", search: "", anchor: null };
const listeners = new Set<() => void>();

export const locationStore = {
  get: () => current,
  set(next: PreviewLocation) {
    current = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function navigate(href: string) {
  const hash = hrefToHash(href);
  if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = hash;
}
