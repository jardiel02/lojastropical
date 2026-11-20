import "server-only";

/**
 * Credenciais do Mercado Pago: só no servidor, só por variável de ambiente (secrets).
 * Fora de produção use SEMPRE as credenciais de TESTE da aplicação.
 */
export const mpAccessToken = () => process.env.MP_ACCESS_TOKEN?.trim() ?? "";
export const mpWebhookSecret = () => process.env.MP_WEBHOOK_SECRET?.trim() ?? "";
/** Endereço público da loja (para onde o cliente volta depois de pagar). */
export const appUrl = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
/** Pagamento online só funciona com token do Mercado Pago e banco de pedidos configurados. */
export const onlinePaymentReady = () => Boolean(mpAccessToken() && process.env.DATABASE_URL);
