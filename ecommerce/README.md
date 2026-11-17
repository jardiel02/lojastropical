# Lojas Tropical — plataforma de e-commerce

Nova loja online da **Lojas Tropical** ("Mania de preços baixos"), migrada do site estático da raiz deste repositório para Next.js + TypeScript + Tailwind, com PostgreSQL/Prisma e integração com o ERP Sólidus Smart.

> O site original continua no ar pelo GitHub Pages até a homologação desta plataforma. Nada aqui altera o site original.

## Estado atual

| Funciona de verdade | Ainda depende de algo |
|---|---|
| Vitrine completa: início, departamentos (com subgrupos), marcas, campanha, busca com filtros/ordenação/paginação, página de produto com cores, carrinho persistente, políticas | Catálogo lê o retrato JSON do site original; ligar ao PostgreSQL (etapa 5) depende de um banco gerenciado |
| Carrinho calculado no servidor (`POST /api/cart/quote`) e pedido enviado pelo WhatsApp, como no site original | Checkout, pagamento e pedidos online (etapas 7 e 8) |
| SEO técnico: URL por produto, metadados, canonical, sitemap, robots, JSON-LD de produto e breadcrumbs, redirecionamento dos links antigos `#produto-…` | Domínio definitivo e liberação de indexação (`NEXT_PUBLIC_ALLOW_INDEXING`) |
| Esquema do banco (35 tabelas), migração e seed testados em PostgreSQL 16 | Reserva de estoque e envio de pedidos ao Sólidus (sem API documentada) |
| Adaptador de ERP simulado e Sólidus somente leitura, com testes | Worker BullMQ/Redis, painel administrativo, Auth.js |

Detalhes e progresso: [MIGRATION_PLAN.md](MIGRATION_PLAN.md) · Arquitetura: [ARCHITECTURE.md](ARCHITECTURE.md) · Banco: [DATABASE.md](DATABASE.md) · ERP: [ERP_INTEGRATION.md](ERP_INTEGRATION.md) · Pagamentos: [PAYMENTS.md](PAYMENTS.md)

## Requisitos

- Node.js 22+ e pnpm 10 (`corepack enable`)
- Opcional: Docker (PostgreSQL e Redis locais)

## Rodar a loja

```bash
cd ecommerce
pnpm install
pnpm dev            # http://localhost:3000 (copia as fotos de ../img automaticamente)
```

Não precisa de banco para a vitrine nesta etapa.

## Atualizar o catálogo a partir do site original

```bash
pnpm legacy:extract   # lê ../index.html, ../estoque.js e ../legal.js → packages/database/data/legacy-catalog.json
```

## Banco de dados

```bash
docker compose up -d postgres
cp .env.example packages/database/.env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
```

## Testes e verificação

```bash
pnpm typecheck        # TypeScript strict em todos os pacotes
pnpm lint             # ESLint (Next.js)
pnpm test             # Vitest: dinheiro, busca, carrinho, ERP
pnpm build            # build de produção
pnpm test:e2e         # Playwright no build: desktop e celular
```

## Publicação (etapa 11)

Vercel com *Root Directory* `ecommerce/apps/web`, *Install Command* `pnpm install` e as variáveis do [.env.example](.env.example). Ambientes separados: desenvolvimento (local), homologação (preview da Vercel, sem indexação) e produção.
