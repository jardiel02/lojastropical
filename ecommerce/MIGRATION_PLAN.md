# Plano de migração — Lojas Tropical

Este documento registra o diagnóstico do site original, o que foi preservado, migrado ou será reconstruído, e o andamento de cada etapa. Atualize a tabela de progresso a cada entrega.

> **O site original continua no ar** (GitHub Pages, raiz deste repositório, branch `main`). A nova plataforma vive em `ecommerce/` e só substitui o site original depois da homologação (etapa 10).

## 1. Diagnóstico do site original (17/11/2026)

### Estrutura

| Arquivo | O que faz |
|---|---|
| `index.html` (205 KB, 47 KB com gzip) | O site inteiro: ~390 linhas de CSS, ~1.070 linhas de JavaScript, os 112 produtos (`PRODUTOS`), fichas técnicas (`FICHAS`), 8 lojas (`LOJAS`), departamentos, subgrupos do menu, cores das bolinhas, marcas. Navegação por `#` (`#produto-<id>`, `#catalogo`). |
| `estoque.js` | Preço e quantidade por código do Sólidus. Gerado de hora em hora por `.github/workflows/estoque.yml` + `scripts/atualizar_estoque.py`. |
| `instagram.js` | Últimos posts do Instagram (Behold), 1x por dia por `.github/workflows/instagram.yml`. |
| `conta.js`, `conta.css` | Cadastro, login, recuperação de senha e "Sua conta" com Supabase Auth (tabela `clientes` com RLS). |
| `legal.js`, `legal.css` + 4 páginas `.html` | Dados da empresa, aviso de cookies (LGPD), Política de Privacidade, Termos, Trocas e Reembolso, Cookies. |
| `banner-carousel.js` | Carrossel de 3 banners. |
| `img/` (448 arquivos, 36 MB) | Fotos de produtos (`p<código>-N.jpg`, `v<código>-<cor>-N.jpg`), banners, logos de marcas, logo. |

Bibliotecas externas: Google Fonts (Poppins e Inter) e `@supabase/supabase-js` via CDN. Nenhum framework.

### Funcionalidades que eram só visuais ou simuladas

- **Carrinho**: guardado no navegador; "finalizar" abre o WhatsApp com a lista. Não há pedido, pagamento nem reserva.
- **Etiqueta "Oferta"**: aparecia em todo produto com preço, sem existir desconto real. **Removida** na nova versão.
- **Consulta de entrega**: só abre o WhatsApp com a cidade escolhida.
- **"Meus pedidos" / "Trocas"** na conta: telas vazias ("Você ainda não tem pedidos pelo site").
- **Estoque**: saldo somado de todas as lojas (a consulta do Sólidus usada não separa por filial); retrato de até 1 hora atrás.
- **Parcela 12x** de 9 produtos digitada à mão no código, sem ligação com o ERP.

### Problemas encontrados

| Tipo | Problema |
|---|---|
| Organização | Dados, estilo e lógica no mesmo arquivo de 205 KB. Produtos editados à mão no código. O script de estoque lê os códigos do `index.html` por expressão regular (acoplamento frágil). |
| SEO | Uma única página para o Google: produtos em `#produto-…` não são indexados, sem título/descrição por produto, sem sitemap, sem dados estruturados, sem canonical. |
| Desempenho | Todo o catálogo e todas as fichas são baixados e montados no navegador a cada visita. Fotos JPG sem WebP/AVIF e sem tamanhos responsivos. |
| Segurança | Montagem de HTML com `innerHTML` a partir dos dados (seguro hoje porque os dados são do próprio repositório; vira risco de XSS quando vierem do painel ou do ERP). Preço não é conferido em servidor (sem impacto hoje, pois a venda é pelo WhatsApp). Pontos positivos: token do Sólidus só em segredo do GitHub, chave pública do Supabase com RLS, HTTPS/HSTS. |
| Responsividade | Boa. Testado em 1366 px e em celular (Pixel 7): sem rolagem lateral. |
| Acessibilidade | Boa base: link "pular para o conteúdo", foco visível, rótulos ARIA, carrinho como diálogo, respeito a "reduzir movimento". Mantido. |

### Preservado na nova plataforma

Cores oficiais (tokens extraídos do `:root`), logotipo, fontes Poppins + Inter, banners e textos, barra de benefícios, cartões de produto com bolinhas de cor, linha por departamento na página inicial, menu "Todos os departamentos" com subgrupos, página de produto (galeria, cores, quantidade, benefícios, consulta de entrega, descrição, ficha, relacionados), carrinho, botões e mensagens do WhatsApp, marcas, faixa do Instagram, lojas com mapa, redes sociais, rodapé com dados da empresa, textos jurídicos, links antigos com `#` (redirecionados).

## 2. Arquitetura de destino

Ver [ARCHITECTURE.md](ARCHITECTURE.md). Resumo: monorepo pnpm em `ecommerce/` com `apps/web` (Next.js App Router + TypeScript strict + Tailwind + componentes no padrão shadcn/ui), `packages/shared` (dinheiro em centavos, tipos, validação Zod), `packages/database` (Prisma + PostgreSQL), `packages/erp-adapter` (contrato do ERP, adaptador simulado e Sólidus somente leitura). Worker (BullMQ + Redis) e `payment-providers` entram nas etapas 6 e 8.

## 3. Etapas e progresso

| # | Etapa | Situação |
|---|---|---|
| 1 | Diagnóstico | ✅ Concluída (este documento) |
| 2 | Preparação (monorepo, TypeScript strict, Tailwind, testes) | ✅ Concluída |
| 3 | Migração visual para Next.js | ✅ Início, departamentos, marcas, campanha, busca, produto, carrinho, políticas, 404 |
| 4 | Componentização | ✅ Componentes em `components/{layout,home,products,cart,ui}` |
| 5 | Catálogo e dados | 🟡 Vitrine lê o PostgreSQL com `CATALOG_SOURCE=database` (`PrismaCatalogRepository`), conferida contra o retrato JSON (`pnpm db:check`) no CI. Banco escolhido: **Supabase existente, esquema `loja`** ([SUPABASE.md](SUPABASE.md)). **Aplicado no Supabase em 17/11** (112 produtos, conferido igual ao JSON). Até existir a sincronização de preço/estoque (etapa 6), a loja publicada deve continuar no retrato JSON, que já acompanha o `estoque.js` de hora em hora. |
| 6 | Integração de estoque | 🟡 Contrato `ErpAdapter`, adaptador simulado com reservas e Sólidus somente leitura, com testes. Falta worker/BullMQ e o retrato por filial. **Bloqueio**: Sólidus sem API documentada de reserva e pedido. |
| 7 | E-commerce funcional (contas, checkout, pedidos, entrega/retirada) | ⬜ Não iniciada. Conta do cliente mostra aviso honesto "em construção". |
| 8 | Pagamentos (Mercado Pago, sandbox) | ⬜ Não iniciada. Ver [PAYMENTS.md](PAYMENTS.md). |
| 9 | Painel administrativo | ⬜ Não iniciada |
| 10 | Testes e homologação | 🟡 35 testes de unidade e 14 de navegação (desktop e celular) passando |
| 11 | Publicação | ⬜ Depende das contas de infraestrutura |

## 4. Riscos e dependências

1. **ERP (crítico para vender online)**: o Sólidus expõe consultas de produto, preço e estoque (já usadas). Não há documentação de **reserva de estoque**, **envio de pedido** nem **estoque por filial**. Sem isso, a venda online fica bloqueada por design (`canSellOnline()` retorna falso). Ação: pedir à SGI a documentação dessas operações. Alternativa, se o ERP não reservar: reserva centralizada no e-commerce com baixa manual na loja (precisa de aprovação da gerência). Ver [ERP_INTEGRATION.md](ERP_INTEGRATION.md).
2. **Contas de infraestrutura**: Vercel, Redis, Cloudinary/S3, Sentry e credenciais **de teste** do Mercado Pago. Banco: **decidido em 17/11 usar o Supabase existente** (esquema `loja`, ver SUPABASE.md).
3. **Mudança de decisão anterior**: em 15/11 o plano era manter o GitHub Pages + Supabase Auth + Mercado Pago Checkout Pro via Edge Function. Esta reestruturação troca por Next.js + Auth.js + Prisma. Os clientes já cadastrados no Supabase Auth precisarão ser migrados (e-mail + redefinição de senha ou importação dos hashes bcrypt).
4. **Decisões comerciais pendentes**: % de desconto no Pix, parcelamento sem juros (regras de parcelas devem vir do ERP), frete e prazo para itens volumosos, quais lojas fazem retirada, cidades atendidas.
5. **Imagens**: hoje copiadas da pasta `img/` do site original no build (`sync-legacy-images`). Migrar para Cloudinary/S3 antes de desligar o site original.
6. **Domínio**: o site usa `jardiel02.github.io/lojastropical`. Definir o domínio próprio antes da publicação (etapa 11).

## 5. Registro de mudanças

- **17/11/2026** — Etapas 1 a 4 e base das etapas 5, 6 e 10: diagnóstico, monorepo, extração do catálogo (`pnpm legacy:extract`), vitrine em Next.js, carrinho com preço calculado no servidor (`POST /api/cart/quote`), SEO (URLs por produto, sitemap, robots, JSON-LD, canonical), esquema Prisma com 35 tabelas e restrições CHECK, adaptadores de ERP, testes Vitest e Playwright. Etiqueta "Oferta" removida (não havia desconto real).
- **17/11/2026 (tarde)** — Prévia navegável (`preview:build`), loja sempre no tema claro, etapa 5: `PrismaCatalogRepository`, migração `catalog_order` (ordem de marcas e produtos, foto da cor), esquema `loja` no Supabase, workflow manual de banco, conferência banco × JSON no CI. Índice trigram removido (desnecessário com 112 produtos e incompatível com o esquema separado no Supabase).
