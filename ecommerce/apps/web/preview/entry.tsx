/**
 * Prévia navegável da loja sem servidor: usa as MESMAS páginas e componentes de src/app,
 * renderizados no navegador. Componentes de servidor assíncronos são resolvidos antes do
 * render; o cálculo do carrinho usa a mesma função do POST /api/cart/quote.
 */
import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import StoreLayout from "@/app/(store)/layout";
import HomePage from "@/app/(store)/page";
import ProductPage from "@/app/(store)/produto/[slug]/page";
import CategoryPage from "@/app/(store)/departamento/[slug]/page";
import BrandPage from "@/app/(store)/marca/[slug]/page";
import CampaignPage from "@/app/(store)/campanha/[slug]/page";
import SearchPage from "@/app/(store)/busca/page";
import AccountPage from "@/app/(store)/conta/page";
import LegalPage from "@/app/(store)/[legal]/page";
import NotFound from "@/app/not-found";
import { catalog } from "@/modules/catalog";
import { quoteCart } from "@/modules/cart/pricing";
import { cartQuoteRequestSchema, MAX_QTY_PER_LINE } from "@/modules/cart/schema";
import { PreviewNotFound } from "./shims/next-navigation";
import { hashToLocation, isRouteHash, locationStore, navigate, type PreviewLocation } from "./location";

type SearchParams = Record<string, string | string[] | undefined>;

// A página de produto lê ?cor= de window.location.search; na prévia ele vem do "#"
declare global {
  var __previewSearch: string;
}
globalThis.__previewSearch = "";

function toRecord(search: string): SearchParams {
  const out: SearchParams = {};
  for (const [k, v] of new URLSearchParams(search)) {
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

const isAsyncComponent = (type: unknown): type is (props: unknown) => Promise<ReactNode> =>
  typeof type === "function" && type.constructor.name === "AsyncFunction";

/** Executa os componentes de servidor assíncronos da árvore (ProductListing, layouts) antes do render. */
async function resolveTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveTree));
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<Record<string, unknown>>;
  if (isAsyncComponent(el.type)) return resolveTree(await el.type(el.props));
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(el.props)) {
    if (key === "children" || isValidElement(value) || (Array.isArray(value) && value.some(isValidElement))) {
      const resolved = await resolveTree(value as ReactNode);
      if (resolved !== value) changes[key] = resolved;
    }
  }
  return Object.keys(changes).length ? cloneElement(el, changes) : el;
}

async function pageFor(loc: PreviewLocation): Promise<ReactNode> {
  const sp = Promise.resolve(toRecord(loc.search));
  const [, section = "", slug = ""] = loc.pathname.split("/");
  const params = Promise.resolve({ slug });
  switch (section) {
    case "":
      return HomePage();
    case "produto":
      return ProductPage({ params });
    case "departamento":
      return CategoryPage({ params, searchParams: sp });
    case "marca":
      return BrandPage({ params, searchParams: sp });
    case "campanha":
      return CampaignPage({ params, searchParams: sp });
    case "busca":
      return SearchPage({ searchParams: sp });
    case "conta":
      return <AccountPage />;
    default:
      return LegalPage({ params: Promise.resolve({ legal: section }) });
  }
}

// O carrinho chama POST /api/cart/quote; aqui a mesma regra roda no navegador
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url !== "/api/cart/quote") return realFetch(input, init);
  let body: unknown;
  try {
    body = JSON.parse(String(init?.body ?? ""));
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = cartQuoteRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Carrinho inválido" }, { status: 422 });
  const bySlug = new Map((await catalog.listProducts()).map((p) => [p.slug, p]));
  return Response.json(quoteCart(parsed.data.items, (slug) => bySlug.get(slug), MAX_QTY_PER_LINE));
};

const container = document.getElementById("app");
if (!container) throw new Error("#app não encontrado");
const root = createRoot(container);
let renderId = 0;

async function render() {
  const id = ++renderId;
  const loc = hashToLocation(window.location.hash);
  globalThis.__previewSearch = loc.search;
  let page: ReactNode;
  try {
    page = await pageFor(loc);
  } catch (e) {
    if (!(e instanceof PreviewNotFound)) console.error(e);
    page = <NotFound />;
  }
  const tree = await resolveTree(
    <StoreLayout>
      <Fragment key={loc.pathname + loc.search}>{page}</Fragment>
    </StoreLayout>,
  );
  if (id !== renderId) return;
  locationStore.set(loc);
  root.render(tree);
  requestAnimationFrame(() => {
    const target = loc.anchor ? document.getElementById(loc.anchor) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  });
}

// Links e formulários com endereço do site (/busca, /produto/...) viram rotas em "#"
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a");
  const href = a?.getAttribute("href");
  if (!a || !href || a.target === "_blank") return;
  if (href.startsWith("/")) {
    e.preventDefault();
    navigate(href);
  } else if (href.startsWith("#") && !isRouteHash(href)) {
    const target = document.getElementById(href.slice(1));
    if (target) {
      e.preventDefault();
      target.scrollIntoView();
      if (target.tabIndex >= -1) target.focus({ preventScroll: true });
    }
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target as HTMLFormElement;
  const action = form.getAttribute("action");
  if (e.defaultPrevented || !action?.startsWith("/") || form.method.toLowerCase() !== "get") return;
  e.preventDefault();
  const params = new URLSearchParams();
  for (const [k, v] of new FormData(form, e.submitter)) if (typeof v === "string" && v !== "") params.append(k, v);
  const qs = params.toString();
  navigate(qs ? `${action}?${qs}` : action);
});

window.addEventListener("hashchange", () => void render());
void render();
