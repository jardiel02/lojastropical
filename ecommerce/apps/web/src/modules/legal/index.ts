import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { wa } from "@/lib/site";

/**
 * Políticas e termos: durante a migração, o texto oficial continua sendo o das páginas do
 * site original (raiz do repositório), lido na hora do build. Assim existe uma única versão
 * revisada do texto jurídico. Os links .html são convertidos para as novas rotas.
 */
export const LEGAL_PAGES = {
  "politica-de-privacidade": "Política de Privacidade",
  "termos-de-uso": "Termos de Uso",
  "politica-de-trocas-e-reembolso": "Trocas, Devoluções e Reembolso",
  "politica-de-cookies": "Política de Cookies",
} as const;
export type LegalSlug = keyof typeof LEGAL_PAGES;

const legacyRoot = () => join(process.cwd(), "../../..");

export async function loadLegalPage(slug: LegalSlug): Promise<{ title: string; description: string; html: string }> {
  const source = await readFile(join(legacyRoot(), `${slug}.html`), "utf8");
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(source)?.[1];
  if (!main) throw new Error(`Conteúdo não encontrado em ${slug}.html`);
  const description = /<meta name="description" content="([^"]*)"/.exec(source)?.[1] ?? "";
  const rightsMessage = wa(
    "Olá! Quero fazer uma solicitação sobre meus dados pessoais (LGPD). Tipo de pedido: ",
  );
  const html = main
    // O formulário interativo de direitos vira um atalho direto para o WhatsApp
    .replace(
      /<form[\s\S]*?<\/form>/g,
      `<p><a class="lt-enviar" href="${rightsMessage}" target="_blank" rel="noopener">Fazer minha solicitação pelo WhatsApp</a></p>`,
    )
    // Esta versão ainda não carrega ferramentas de medição, então não há preferências a abrir
    .replace(/<button[^>]*data-lt-preferencias[^>]*>[\s\S]*?<\/button>/g, "<b>Preferências de cookies</b>")
    .replace(/href="index\.html"/g, 'href="/"')
    .replace(/href="([a-z-]+)\.html(#[a-z-]+)?"/g, (_m, page: string, hash = "") => `href="/${page}${hash}"`)
    .replace(/src="img\//g, 'src="/img/');
  return { title: LEGAL_PAGES[slug], description, html };
}
