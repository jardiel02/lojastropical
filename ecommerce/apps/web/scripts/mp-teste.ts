/**
 * Confere se a credencial do Mercado Pago cria uma preferência do Checkout Pro.
 * Não cobra nada: só cria o link de pagamento de um item de teste de R$ 1,00.
 * Uso (o token vem do ambiente, nunca do código): tsx scripts/mp-teste.ts
 */
import { createPreference } from "../src/modules/payments/preference";

const token = process.env.MP_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Falta o segredo MP_ACCESS_TOKEN");
  process.exit(1);
}

const ref = `teste-${Date.now()}`;
try {
  const pref = await createPreference(
    token,
    {
      orderId: ref,
      orderNumber: 0,
      items: [{ id: "teste", title: "Item de teste (não é venda)", quantity: 1, unitPriceCents: 100 }],
      payer: { email: "comprador-teste@example.com", name: null, cpf: null },
      appUrl: "http://localhost:3000",
    },
    `${ref}:mp`,
  );
  const host = new URL(pref.init_point).host;
  console.log(`OK: preferência ${pref.id} criada; link de pagamento em ${host}`);
  console.log(`Tipo de credencial: ${token.startsWith("TEST-") ? "TEST-" : token.startsWith("APP_USR-") ? "APP_USR-" : "desconhecido"}`);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(summary, `### Mercado Pago\n\nPreferência de teste criada (${pref.id}). Link em \`${host}\`.\n`);
  }
} catch (error) {
  const e = error as { message?: string; status?: number; cause?: unknown };
  console.error("Falhou ao criar a preferência:", e.status ?? "", e.message ?? JSON.stringify(e).slice(0, 500));
  process.exit(1);
}
