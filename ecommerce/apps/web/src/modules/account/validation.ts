/**
 * Regras do cadastro de clientes, iguais às do site original (conta.js), para os
 * dois sites aceitarem e gravarem os mesmos dados na tabela public.clientes.
 */

export const onlyDigits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export const formatCpf = (v: string | null | undefined) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const formatPhone = (v: string | null | undefined) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/^\((\d{0,2})\) ?-?$/, "$1");
};

export const formatCep = (v: string | null | undefined) =>
  onlyDigits(v)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function isValidCpf(value: string) {
  const c = onlyDigits(value);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    let r = (s * 10) % 11;
    if (r === 10) r = 0;
    if (r !== Number(c[t])) return false;
  }
  return true;
}

export const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");
export const isFullName = (s: string) => s.length >= 5 && s.includes(" ");

export type Address = { cep: string; rua: string; numero: string; complemento: string | null; bairro: string; cidade: string };

export function addressError(a: Address): string {
  if (a.cep.length !== 8) return "CEP inválido.";
  if (a.rua.length < 2) return "Informe a rua.";
  if (!a.numero) return 'Informe o número (ou "s/n").';
  if (a.bairro.length < 2) return "Informe o bairro.";
  if (!a.cidade) return "Escolha a cidade.";
  return "";
}

/** Mensagens do Supabase Auth em português, para o cliente entender o que fazer. */
export function translateAuthError(message: string | null | undefined): string {
  const m = String(message ?? "");
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(m)) return "Seu e-mail ainda não foi confirmado. Abra o link que enviamos para o seu e-mail.";
  if (/already registered|already been registered/i.test(m)) return 'Este e-mail já tem conta. Use "Entrar" ou "Esqueci minha senha".';
  if (/database error saving new user/i.test(m)) return "Não foi possível criar a conta. Confira os dados: este CPF talvez já esteja cadastrado.";
  if (/should be different/i.test(m)) return "A senha nova precisa ser diferente da atual.";
  if (/password should be at least|weak password/i.test(m)) return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
  if (/rate limit|too many|security purposes/i.test(m)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (/duplicate key.*cpf/i.test(m)) return "Este CPF já está cadastrado.";
  if (/violates check constraint/i.test(m)) return "Algum dado está em formato inválido. Confira e tente de novo.";
  if (/failed to fetch|network/i.test(m)) return "Sem conexão. Verifique sua internet e tente de novo.";
  return `Algo deu errado. Tente de novo em instantes. (${m})`;
}
