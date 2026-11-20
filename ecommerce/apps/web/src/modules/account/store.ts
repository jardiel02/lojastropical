"use client";
import type { User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { accountsEnabled, supabase, type Customer } from "./client";

export type AccountState = {
  /** false até a primeira resposta do Supabase (evita piscar "Entrar" para quem já está logado). */
  ready: boolean;
  user: User | null;
  customer: Customer | null;
  /** O cliente chegou pelo link de "esqueci minha senha" e precisa escolher a nova. */
  recovering: boolean;
  /** Último evento de login (para levar à conta depois de entrar ou confirmar o e-mail). */
  lastEvent: string | null;
};

let state: AccountState = { ready: false, user: null, customer: null, recovering: false, lastEvent: null };
const listeners = new Set<() => void>();
let started = false;

const set = (patch: Partial<AccountState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

async function loadCustomer(user: User | null): Promise<Customer | null> {
  if (!user) return null;
  const { data } = await supabase().from("clientes").select("*").eq("id", user.id).maybeSingle();
  return (data as Customer | null) ?? null;
}

function start() {
  if (started || typeof window === "undefined" || !accountsEnabled) return;
  started = true;
  supabase().auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    // Fora do callback, como o Supabase recomenda
    setTimeout(async () => {
      const customer = await loadCustomer(user);
      set({
        ready: true,
        user,
        customer,
        lastEvent: event,
        recovering: event === "PASSWORD_RECOVERY" ? true : state.recovering && !!user,
      });
    }, 0);
  });
}

export const accountStore = {
  get: () => state,
  async reloadCustomer() {
    set({ customer: await loadCustomer(state.user) });
  },
  finishRecovery() {
    set({ recovering: false });
  },
};

const subscribe = (l: () => void) => {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
};
const serverState: AccountState = { ready: false, user: null, customer: null, recovering: false, lastEvent: null };

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export const firstName = (s: AccountState) => (s.customer?.nome ? s.customer.nome.split(" ")[0] : "");
