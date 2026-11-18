"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export { SUPABASE_URL, SUPABASE_KEY, accountsEnabled, type Customer } from "./config";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  });
  return client;
}

/** Para onde os links dos e-mails (confirmação, nova senha) trazem o cliente. */
export const accountReturnUrl = () => `${window.location.origin}/conta`;
