"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Login dos clientes: Supabase Auth do projeto de São Paulo, o mesmo do banco da loja
 * (decisão do Jardiel em 17/11/2026). A chave é a PÚBLICA (publishable); a proteção dos
 * dados fica nas regras (RLS) da tabela public.clientes (ecommerce/supabase/clientes.sql).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://nxolrntrnlkdsleombvb.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_K8w0tzzIyrpT9dIf15O3cg_hggJ_VAA";
export const accountsEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

export type Customer = {
  id: string;
  nome: string | null;
  cpf: string | null;
  celular: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
};

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  });
  return client;
}

/** Para onde os links dos e-mails (confirmação, nova senha) trazem o cliente. */
export const accountReturnUrl = () => `${window.location.origin}/conta`;
