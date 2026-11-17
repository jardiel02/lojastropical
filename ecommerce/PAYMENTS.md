# Pagamentos — Mercado Pago

> **Situação: não implementado (etapa 8).** Nenhum pagamento é processado pela nova plataforma hoje. As compras continuam pelo WhatsApp.

## Escopo inicial

- **Pix** e **cartão de crédito** pelo Mercado Pago (conta CNPJ da loja), com Checkout Bricks.
- Crediário próprio fica como provedor futuro (`STORE_CREDIT`), sem aprovação automática.

## Fluxo planejado

1. Checkout chama o servidor com o carrinho (só itens e quantidades).
2. Servidor recalcula preços, frete e descontos, valida estoque e **reserva no ERP**.
3. Servidor cria o pedido (`orders`, com `idempotency_key`) e o `payment_intent`.
4. Servidor cria o pagamento no Mercado Pago com `X-Idempotency-Key` igual à do `payment_intent`.
   - Pix: devolve QR Code/copia-e-cola com validade igual à da reserva.
   - Cartão: o Brick tokeniza o cartão no navegador; o servidor recebe só o token. **Número e CVV nunca passam pelo nosso servidor nem pelo banco.**
5. **Webhook** `/api/webhooks/mercadopago`: valida a assinatura (`x-signature`, HMAC com o segredo do webhook), ignora eventos repetidos (`payment_transactions.provider_event_id` único) e **consulta o pagamento na API do Mercado Pago** antes de mudar qualquer estado.
6. Aprovado → `payment_status = PAID`, confirma reserva, envia pedido ao ERP. Recusado/expirado → libera reserva.
7. A página de "obrigado" mostra o estado do servidor, nunca o que o navegador "acha".

## Regras

- Credenciais só em variáveis de ambiente; em desenvolvimento e testes, **apenas credenciais de teste**.
- Nenhum pagamento real em testes automatizados.
- Estornos e cancelamentos registrados em `payment_transactions` e `order_events`.
- Conciliação diária: pagamentos aprovados × pedidos.
- Parcelamento e desconto no Pix dependem de decisão comercial registrada (ainda pendente).
