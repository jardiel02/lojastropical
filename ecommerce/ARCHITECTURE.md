# Arquitetura — Lojas Tropical e-commerce

## Visão geral

```
                 ┌──────────────────────────── apps/web (Next.js, Vercel) ────────────────────────────┐
 Navegador ────▶ │  app/(store)  páginas (Server Components)       app/api/*  Route Handlers (REST)    │
                 │  components/  React (Client só onde há interação)                                   │
                 │  modules/     regras de negócio: catalog · cart · campaigns · instagram · legal     │
                 └───────────────┬───────────────────────────────┬──────────────────────────────────────┘
                                 │                               │
                      packages/database (Prisma)        packages/erp-adapter
                                 │                               │
                           PostgreSQL                 Sólidus Smart (ERP oficial)
                                 ▲                               ▲
                                 └──── apps/worker (BullMQ + Redis, etapa 6): sincronização, reservas, reconciliação
```

Pacotes:

| Pacote | Responsabilidade |
|---|---|
| `apps/web` | Loja (páginas, componentes, Route Handlers). Nunca acessa o banco direto de um componente visual: passa por `modules/*`. |
| `packages/shared` | Dinheiro em centavos (`Cents`, `fromReais`, `splitInstallments`, `formatBRL`), `slugify`, esquemas Zod do catálogo. Sem dependência de framework. |
| `packages/database` | `schema.prisma`, migrações versionadas, seed, cliente Prisma (`getPrisma()`), script de extração do site original. |
| `packages/erp-adapter` | Contrato `ErpAdapter`, `MockErpAdapter` (desenvolvimento/testes) e `SolidusReadOnlyAdapter`. |
| `packages/sync` | Sincronização com o ERP: `pnpm sync:stock` lê estoque de cada loja (um token do Sólidus por loja) e preços, e grava no banco só o que mudou (ver ERP_INTEGRATION.md). |
| `apps/worker` *(etapa 6)* | Filas BullMQ: estoque/preço do ERP, expiração de reservas, envio de pedidos, reconciliação. |
| `packages/payment-providers` *(etapa 8)* | Contrato de pagamento + Mercado Pago. |

## Decisões

1. **Pasta `ecommerce/` no mesmo repositório.** O GitHub Pages publica a raiz do branch `main` e os workflows de estoque/Instagram gravam na raiz. Colocar o monorepo numa subpasta mantém o site original funcionando sem nenhuma mudança até a troca. Na Vercel, o projeto aponta para `ecommerce/apps/web` como *Root Directory*.
2. **Catálogo atrás de uma interface (`CatalogRepository`).** Duas implementações, escolhidas por `CATALOG_SOURCE`: `StaticCatalogRepository` (padrão), que lê `packages/database/data/legacy-catalog.json` (gerado de `index.html` + `estoque.js` por `pnpm legacy:extract` e validado com Zod), e `PrismaCatalogRepository` (`database`), que lê o PostgreSQL inteiro e guarda por 1 minuto, mantendo a última leitura boa se o banco falhar. As páginas não mudam.
3. **Preço sempre do servidor.** O navegador só envia `{ slug, color, qty }`. `POST /api/cart/quote` recalcula nome, foto, preço e disponibilidade a partir do catálogo oficial, valida com Zod, limita quantidades e ignora qualquer preço enviado. O checkout (etapa 7) seguirá a mesma regra, com reserva no ERP antes do pagamento.
4. **Dinheiro em centavos inteiros** no código (`Cents`) e no banco (`Int`). Nenhum `Float` em valores financeiros.
5. **Server Components por padrão.** Client Components apenas em: carrinho, galeria, seleção de cor/quantidade, carrossel, menu de departamentos, linhas roláveis. Filtros de busca são formulários `GET` (funcionam sem JavaScript e geram URLs compartilháveis).
6. **Páginas estáticas com revalidação.** Produtos, departamentos e políticas são pré-gerados no build (`generateStaticParams`) e revalidados a cada hora. A cor escolhida no cartão (`?cor=N`) é lida no navegador para não perder a página estática.
7. **Imagens** via `next/image` (AVIF/WebP, tamanhos responsivos, `lazy`, dimensões fixas contra mudança de layout). Enquanto não há Cloudinary/S3, `scripts/sync-legacy-images.mjs` copia `img/` do site original para `public/img` no `dev`/`build` (sem duplicar arquivos no Git).
8. **Links antigos.** `#produto-<id>~<cor>` → `/produto/<id>?cor=<cor>`; `#catalogo` → `/busca`; `#conta` → `/conta` (feito no navegador, pois o `#` não chega ao servidor). Os slugs dos produtos são os mesmos ids do site original.
9. **Políticas.** O texto jurídico continua vindo das páginas `.html` do site original (lido no build), com os links convertidos. Uma única versão revisada até o conteúdo ir para o painel.
10. **Indexação controlada.** `robots.txt` e `<meta robots>` bloqueiam indexação, a menos que `NEXT_PUBLIC_ALLOW_INDEXING=true` (só em produção). Homologação nunca vai para o Google.
11. **Nada simulado como real.** Conta do cliente mostra "em construção"; frete mostra "cálculo automático chega com o checkout"; Sólidus responde `NOT_SUPPORTED` para reserva e pedido; o adaptador simulado se chama `mock` e não é usado em produção.

## Segurança já aplicada

- Validação Zod em toda entrada (query string, corpo da API).
- Cabeçalhos: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; `X-Powered-By` desligado.
- Sem `innerHTML` com dados; JSON-LD escapado (`<` → `<`). Único `dangerouslySetInnerHTML` de conteúdo é o texto jurídico, que vem de arquivos do próprio repositório.
- Segredos só por variável de ambiente (`.env.example` sem valores reais).

Pendentes (etapas 7–11): CSP com Mercado Pago, rate limiting nas rotas sensíveis, Auth.js com cookies `Secure/HttpOnly/SameSite`, autorização por papel e filial no servidor, Sentry, logs de auditoria em `audit_logs`, backups do banco.

## Comandos

Ver [README.md](README.md).
