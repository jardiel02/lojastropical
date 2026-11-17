# Banco de dados — PostgreSQL + Prisma

Esquema: [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma) (35 tabelas). Migrações versionadas em `packages/database/prisma/migrations/`.

## Regras

- **Dinheiro em centavos (`Int`)**: `price_cents`, `subtotal_cents`, `total_cents`… Nunca `Float`.
- **Restrições CHECK** (na migração inicial): quantidade do carrinho entre 1 e 20; item de pedido com `total = unitário × quantidade − desconto`; pedido com `total = subtotal − desconto + frete ≥ 0`; pagamento com valor positivo e 1 a 12 parcelas; cupom percentual até 100%.
- **Idempotência**: `orders.idempotency_key`, `payment_intents.idempotency_key`, `stock_reservations.idempotency_key`, `payment_transactions.provider_event_id` e `integration_events.idempotency_key` são únicos. Repetir a mesma operação não duplica pedido, cobrança, reserva ou webhook.
- **Estados separados no pedido**: `status` (pedido), `payment_status`, `erp_sync_status`, `fulfillment_status`. Toda mudança gera linha em `order_events`.
- **Exclusão lógica** (`deleted_at`) em usuários, clientes, endereços e produtos.
- **Snapshots**: o pedido copia nome, cor, preço e endereço no momento da compra (`order_items`, `orders.shipping_address`).
- **Auditoria**: `audit_logs` para ações administrativas; `order_events` para o ciclo do pedido.

## Entidades

| Grupo | Tabelas |
|---|---|
| Acesso | `users`, `roles`, `user_roles` (papel por filial), `accounts`, `sessions`, `verification_tokens` (Auth.js) |
| Clientes | `customers` (CPF opcional e único, consentimentos), `addresses` |
| Catálogo | `categories` (árvore; subgrupos com `match_pattern`), `brands`, `products` (classe logística para itens volumosos, status de publicação, índice trigram no nome), `product_variants` (cor = SKU vendável, preço), `product_images` |
| Estoque | `branches`, `inventory_snapshots` (retrato do ERP; `branch_id` nulo = saldo consolidado), `stock_reservations` (com expiração) |
| Compra | `carts`, `cart_items`, `orders`, `order_items`, `order_events` |
| Pagamento | `payment_intents`, `payment_transactions` |
| Atendimento | `shipments` (quem entregou e quando), `pickup_requests` (hash do código de retirada, quem entregou, em qual filial) |
| Marketing | `coupons`, `promotions`, `promotion_products` |
| Integração | `erp_mappings`, `integration_events`, `sync_jobs` |
| Crediário (futuro, não operacional) | `credit_applications`, `credit_decisions`, `credit_contracts` |
| Auditoria | `audit_logs` |

## Dados iniciais

`pnpm db:seed` carrega o catálogo real do site original (112 produtos, 182 variações por cor, 357 fotos, 9 departamentos + 28 subgrupos, 32 marcas, 8 lojas, papéis). Filiais começam com retirada e entrega **desligadas** até a confirmação de cada loja. O seed **não cria** clientes, pedidos ou pagamentos.

## Comandos

```bash
docker compose up -d postgres                     # ou use um PostgreSQL próprio
cp packages/database/.env.example packages/database/.env   # ajuste DATABASE_URL
pnpm db:generate     # gera o cliente Prisma
pnpm db:migrate      # aplica as migrações (prisma migrate deploy)
pnpm db:seed         # carrega o catálogo do site original
```

Para criar uma nova migração em desenvolvimento: `pnpm --filter @lojas-tropical/database db:migrate:dev --name <nome>`. Nunca rode `migrate dev` ou `migrate reset` contra o banco de produção.
