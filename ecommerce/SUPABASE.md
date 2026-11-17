# Banco de dados no Supabase

A nova loja usa um projeto Supabase próprio em **São Paulo** (sa-east-1), criado em 17/11. O projeto antigo "Lojas Tropicais" (EUA) continua só com o login e o cadastro de clientes do site atual.

## Como fica organizado

- As tabelas da loja (35, ver [DATABASE.md](DATABASE.md)) ficam no esquema **`loja`**.
- O cadastro de clientes do site atual continua em `public.clientes` e no login do Supabase. Nada disso é alterado.
- O esquema `loja` **não** é exposto pela API pública do Supabase (ela só publica `public`). A chave pública que está no site não lê nem grava essas tabelas. Só o servidor da loja, com a senha do banco, acessa.
- A senha do banco nunca vai para o Git nem para o chat: fica só nos segredos do GitHub (e, na publicação, nos da Vercel).

## Passo a passo (uma vez)

1. No Supabase, abra o projeto e clique em **Connect** (no topo).
2. Em **Connection String**, escolha o tipo **URI** e o método **Session pooler**. Copie o endereço. Ele começa com `postgresql://postgres.fsfljvaxbxzcobdssgnp:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres`.
   - O "Session pooler" é necessário porque os servidores do GitHub não acessam a conexão direta do Supabase.
3. Troque `[YOUR-PASSWORD]` pela senha do banco e acrescente **`?schema=loja`** no fim.
   - Se não lembrar a senha: **Project Settings → Database → Reset database password**. Prefira uma senha só com letras e números (símbolos como `@`, `#` e `/` quebram o endereço). O site atual não usa essa senha, então trocá-la não o afeta.
4. No GitHub: repositório → **Settings → Secrets and variables → Actions → New repository secret**.
   - Nome: `SUPABASE_DATABASE_URL`
   - Valor: o endereço completo do passo 3.
5. Rode o workflow **E-commerce (banco Supabase)** (aba Actions → Run workflow, digitando `aplicar`). Ele:
   1. aplica as migrações pendentes (cria o esquema `loja` e as tabelas na primeira vez);
   2. carrega o catálogo (112 produtos, departamentos, marcas, lojas), podendo rodar de novo sem duplicar;
   3. confere que o catálogo do banco ficou idêntico ao da loja atual.

O workflow nunca apaga tabelas nem dados. Para desfazer tudo, basta apagar o esquema `loja` no Supabase (SQL: `drop schema loja cascade;`), sem afetar o site atual.

## Na publicação (etapa 11)

Na Vercel, a loja usa o **Transaction pooler** (porta 6543) com `?pgbouncer=true&schema=loja` em `DATABASE_URL` e `CATALOG_SOURCE=database`. As migrações continuam pelo workflow acima.
