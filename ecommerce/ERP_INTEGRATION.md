# Integração com o ERP (Sólidus Smart)

## Princípios

- O ERP é a **fonte oficial** de estoque e preço. O e-commerce guarda só um retrato (`inventory_snapshots`) para mostrar disponibilidade rápida.
- Nenhuma venda online é concluída sem **reserva confirmada** no ERP (ou numa solução centralizada aprovada pela loja).
- O backend conversa só com o contrato `ErpAdapter` (`packages/erp-adapter/src/contract.ts`). Trocar de ERP = escrever um adaptador novo.

## Contrato

| Método | Uso |
|---|---|
| `getProduct(erpCode)` | Conferir cadastro/código |
| `getPrices(erpCode, data)` | Preço vigente em centavos (tabela de preço válida na data) |
| `getStock(erpCode)` | Saldo disponível por filial (`branchCode`) ou consolidado (`null`) |
| `reserveStock({ idempotencyKey, branchCode, items, ttlSeconds })` | Segurar a mercadoria enquanto o cliente paga |
| `confirmReservation(id)` / `releaseReservation(id)` | Confirmar ou devolver a reserva |
| `submitOrder({ idempotencyKey, … })` | Enviar o pedido pago para faturamento |

Cada adaptador declara `capabilities`. `canSellOnline(adapter)` só é verdadeiro com `stock.reserve` e `orders.submit`.

Erros usam `ErpError` com `code` (`UNAVAILABLE`, `NOT_SUPPORTED`, `INSUFFICIENT_STOCK`, `NOT_FOUND`, `INVALID_RESPONSE`, `UNAUTHORIZED`) e `retryable`, para o worker decidir entre tentar de novo ou abrir pendência.

## Adaptadores

| Adaptador | Situação |
|---|---|
| `MockErpAdapter` | **Simulado**, só para desenvolvimento e testes. Reserva com expiração, idempotência, consumo na venda e falhas injetáveis (`failNext`). |
| `SolidusReadOnlyAdapter` | Leitura real de produto, preço e estoque, usando as mesmas consultas que o site original já usa em produção. Reserva e pedido lançam `NOT_SUPPORTED`. |

### O que já se sabe do Sólidus (verificado em produção pelo site original)

- Consultas `GET {SOLIDUS_API_BASE_URL}{produtos|estoques|precos}?token=…&codigo=<código>`.
- Exige `User-Agent` próprio (clientes genéricos levam 403). Sem CORS: só servidor.
- Estoque: soma de `quantidade_disponivel` (o retorno usado não separa por filial).
- Preço: tabela com `validade_inicial`/`validade_final` (dd/mm/aaaa); vale a tabela vigente mais recente.
- O token fica **só** em segredo (`SOLIDUS_TOKEN`). Nunca em arquivo do repositório.

### O que falta pedir à SGI (bloqueia vendas reais)

1. Estoque **por filial** (código de cada loja).
2. API de **reserva** de estoque (criar, confirmar, liberar, expiração) ou outra forma de bloquear a venda do mesmo item na loja física.
3. API de **inclusão de pedido/venda** (com cliente, itens, forma de pagamento e filial) e consulta do status.
4. **Webhooks** ou consulta incremental ("alterados desde") para preço e estoque.
5. Regras de **parcelamento** e do **crediário** (número de parcelas, juros, entrada, elegibilidade).

Se a SGI não oferecer reserva: proposta de reserva centralizada no e-commerce (tabela `stock_reservations`) com estoque dedicado à loja online por filial e baixa manual/assistida na loja — só com aprovação da gerência.

## Sincronização (etapa 6)

Worker dedicado (`apps/worker`, BullMQ + Redis):

- `stock-sync` e `price-sync`: a cada 15–60 min (ou webhook), grava `inventory_snapshots`/preços e registra `sync_jobs`.
- `reservation-expiry`: libera reservas vencidas.
- `order-submit`: envia pedidos pagos; em falha, `erp_sync_status = FAILED` com novas tentativas (espera exponencial). Pagamento aprovado com ERP fora do ar vira `RECONCILIATION_REQUIRED` e alerta no painel.
- `reconciliation`: compara pedidos pagos × pedidos no ERP diariamente.

Toda chamada fica em `integration_events` (com `idempotency_key`).

Enquanto o worker não existe, o site original continua atualizando `estoque.js` de hora em hora e `pnpm legacy:extract` leva esse retrato para a nova vitrine.
