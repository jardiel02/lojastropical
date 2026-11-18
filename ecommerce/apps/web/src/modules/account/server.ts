import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, type Customer } from "./config";

export type SignedInCustomer = { userId: string; email: string; customer: Customer };

/**
 * Confere no Supabase o login enviado pelo navegador (token de acesso) e lê o cadastro do
 * próprio cliente com esse mesmo token. Não usa chave secreta: as regras (RLS) de
 * public.clientes só deixam cada pessoa ler a própria linha.
 */
export async function customerFromAccessToken(accessToken: string): Promise<SignedInCustomer | null> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  const { data: customer } = await db
    .from("clientes")
    .select("id, nome, cpf, celular, cep, rua, numero, complemento, bairro, cidade")
    .eq("id", data.user.id)
    .maybeSingle<Customer>();
  if (!customer) return null;
  return { userId: data.user.id, email: data.user.email, customer };
}
