-- Cadastro de clientes da nova loja (Supabase São Paulo). Pode rodar várias vezes.
-- Aplicado pelo workflow "E-commerce (banco Supabase)". NÃO apaga dados.
--
-- * public.clientes: um registro por conta do Supabase Auth (auth.users).
-- * O registro nasce sozinho no cadastro, com os dados enviados no signUp (metadata).
-- * RLS: cada cliente só lê e altera o próprio registro; visitante sem login não vê nada.
-- * CPF não pode ser alterado pelo cliente (só pela loja, no painel do Supabase).

create table if not exists public.clientes (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null check (char_length(nome) between 5 and 120),
  cpf           char(11) not null unique check (cpf ~ '^[0-9]{11}$'),
  celular       text not null check (celular ~ '^[0-9]{10,11}$'),
  cep           char(8) not null check (cep ~ '^[0-9]{8}$'),
  rua           text not null check (char_length(rua) between 2 and 150),
  numero        text not null check (char_length(numero) between 1 and 20),
  complemento   text check (complemento is null or char_length(complemento) <= 100),
  bairro        text not null check (char_length(bairro) between 2 and 80),
  -- Vende online só para as cidades onde há loja
  cidade        text not null check (cidade in ('Codó', 'Timbiras', 'Pio XII', 'Dom Pedro', 'Gonçalves Dias', 'Coroatá', 'Alto Alegre do Maranhão')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.clientes enable row level security;

drop policy if exists "cliente le o proprio cadastro" on public.clientes;
create policy "cliente le o proprio cadastro" on public.clientes
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "cliente altera o proprio cadastro" on public.clientes;
create policy "cliente altera o proprio cadastro" on public.clientes
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Sem INSERT/DELETE pela API: o registro nasce no cadastro e a exclusão é pedida à loja (LGPD)
revoke all on public.clientes from anon, authenticated;
grant select on public.clientes to authenticated;
grant update (nome, celular, cep, rua, numero, complemento, bairro, cidade) on public.clientes to authenticated;

create or replace function public.clientes_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists clientes_atualizado_em on public.clientes;
create trigger clientes_atualizado_em before update on public.clientes
  for each row execute function public.clientes_atualizado_em();

-- Cria o cadastro a partir dos dados do signUp. Dados inválidos barram a criação da conta
-- (o site mostra "confira os dados"). Contas criadas sem esses dados (ex.: pelo painel) são ignoradas.
create or replace function public.criar_cliente_no_cadastro() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if m ? 'cpf' then
    insert into public.clientes (id, nome, cpf, celular, cep, rua, numero, complemento, bairro, cidade)
    values (
      new.id,
      m ->> 'nome',
      m ->> 'cpf',
      m ->> 'celular',
      m ->> 'cep',
      m ->> 'rua',
      m ->> 'numero',
      nullif(m ->> 'complemento', ''),
      m ->> 'bairro',
      m ->> 'cidade'
    );
  end if;
  return new;
end $$;

revoke execute on function public.criar_cliente_no_cadastro() from public, anon, authenticated;

drop trigger if exists criar_cliente_no_cadastro on auth.users;
create trigger criar_cliente_no_cadastro after insert on auth.users
  for each row execute function public.criar_cliente_no_cadastro();
