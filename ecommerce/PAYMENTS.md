# Pagamentos — Mercado Pago (Checkout Pro)

> **Situação: pronto em modo TESTE (etapa 8).** Nenhuma venda real passa pela nova plataforma.
> O botão só aparece com `NEXT_PUBLIC_MP_CHECKOUT_ENABLED=true` e só funciona com
> `MP_ACCESS_TOKEN` e `DATABASE_URL` configurados. Antes de vender de verdade faltam: hospedagem
> (Vercel), webhook registrado, reserva de estoque no ERP (o Sólidus não tem API de reserva),
> SMTP próprio no Supabase, `/mp-review` e a troca para as credenciais de produção da conta CNPJ.

## Por que Checkout Pro

- Decisão do Jardiel em 15/11/2026, mantida em 17/11/2026.
- O cliente paga na página do Mercado Pago (Pix ou cartão em até 12x). **Nenhum dado de cartão
  passa pelo nosso servidor** (sem escopo PCI), e é a integração mais simples de manter.
- Boleto e lotérica ficam de fora (`excluded_payment_types: ticket, atm`), como a loja decidiu.
- Parcelamento **sem juros** em 12x é configurado na conta do Mercado Pago (custos de
  parcelamento), não no código. O código só limita a 12 parcelas.
- Mais tarde dá para trocar por pagamento dentro do site (Checkout Transparente) sem mudar os
  pedidos: a tabela `payment_intents` já guarda o método real (PIX ou CREDIT_CARD).

## Fluxo

1. **Carrinho** (`components/cart/mercado-pago-button.tsx`): o botão "Pagar com Mercado Pago"
   manda ao servidor só os itens, o login (token do Supabase) e uma chave de idempotência
   (a mesma enquanto o carrinho não muda).
2. **`POST /api/checkout/mercadopago`** (`modules/payments/checkout.ts`):
   - confere o login no Supabase e lê o cadastro do próprio cliente (RLS, sem chave secreta);
   - exige CPF, celular e endereço completos e cidade com loja (Matriz em Codó);
   - recalcula o carrinho no servidor; recusa item sem preço, esgotado ou com preço diferente
     do banco (o cliente confere de novo);
   - cria `users`/`customers` (id = id do Supabase Auth), o pedido (`orders`, status PLACED,
     entrega grátis), os itens e o `payment_intent` (método `MERCADO_PAGO_CHECKOUT`);
   - cria a preferência (`modules/payments/preference.ts`) com `external_reference` = id do
     pedido e `X-Idempotency-Key` = chave do `payment_intent`;
   - devolve `init_point` e o navegador vai para o Mercado Pago.
   - Clique repetido com a mesma chave devolve o mesmo link (evento `mp_preference_created`).
3. **Volta** em `/pedido/retorno`: o servidor consulta o pagamento **na API do Mercado Pago**
   e mostra a situação do pedido gravada no banco (aprovado, em processamento ou recusado).
   Os parâmetros da URL só dizem qual pagamento consultar.
4. **Webhook** `POST /api/webhooks/mercadopago`:
   - confere `x-signature` (HMAC-SHA256 de `id:{data.id};request-id:{x-request-id};ts:{ts};`
     com `MP_WEBHOOK_SECRET`, comparação em tempo constante) antes de tudo;
   - responde 200 na hora e consulta o pagamento depois (`after`);
   - `modules/payments/sync.ts` grava cada situação em `payment_transactions` com
     `provider_event_id` único (aviso repetido não muda nada) e atualiza `payment_intents` e
     `orders.payment_status`.
   - Valor menor que o pedido ou moeda diferente de BRL **não** marca como pago (evento
     `payment_amount_mismatch`). Um segundo pagamento aprovado vira `payment_duplicate` para
     a loja estornar. Outra tentativa recusada não desfaz um pagamento aprovado.

## Variáveis

| Nome | Onde | Público? |
|---|---|---|
| `MP_ACCESS_TOKEN` | servidor (secrets do GitHub/Vercel) | Não |
| `MP_WEBHOOK_SECRET` | servidor (painel > Webhooks > Assinatura secreta) | Não |
| `APP_URL` | servidor; vazio usa `NEXT_PUBLIC_SITE_URL` | Sim |
| `NEXT_PUBLIC_MP_CHECKOUT_ENABLED` | mostra o botão no carrinho | Sim |

Em `localhost` a preferência vai sem `auto_return` e sem `notification_url` (o Mercado Pago
recusa endereço local). Com `APP_URL` público em HTTPS os dois são ligados sozinhos.

## Como testar (sem dinheiro de verdade)

1. Painel do Mercado Pago > [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)
   > Criar aplicação (Checkout Pro). Para testar, pode ser a conta pessoa física do Jardiel;
   para vender, a aplicação da conta CNPJ da loja (troca só o token).
2. **Credenciais de teste** > Access Token no secret `MP_ACCESS_TOKEN`. Nunca no chat.
3. **Contas de teste** > criar uma conta **Comprador** (com saldo). Ela é o cliente que entra
   na página do Mercado Pago na hora de pagar. Usuário e senha ficam com quem testa.
4. Com a loja no ar (Vercel): Webhooks > URL `https://<loja>/api/webhooks/mercadopago`,
   evento **Pagamentos**; a assinatura secreta vai em `MP_WEBHOOK_SECRET`.
5. Comprar com a conta Comprador e um cartão de teste (nome do titular decide o resultado):
   - Visa `4235 6477 2802 5682`, CVV `123`, validade `11/30`, CPF `12345678909`
   - Mastercard `5031 4332 1540 6351`, CVV `123`, validade `11/30`
   - Titular `APRO` = aprovado; `OTHE` = recusado; `CONT` = pendente; `FUND` = saldo insuficiente.
6. Conferir `orders.payment_status` e `payment_transactions` no banco.
7. Antes de produção: `/mp-review` (checklist de qualidade do Mercado Pago) e credenciais de
   produção da conta CNPJ.

## Regras

- Credenciais só em variáveis de ambiente; em desenvolvimento e testes, **apenas credenciais de teste**.
- Nenhum pagamento real em testes automatizados.
- Sempre `init_point` (o Mercado Pago não tem ambiente separado; teste = credenciais de teste).
- Estornos e cancelamentos registrados em `payment_transactions` e `order_events`.
- Conciliação diária (a fazer): pagamentos aprovados × pedidos.
- Desconto no Pix ainda depende de decisão da loja.
