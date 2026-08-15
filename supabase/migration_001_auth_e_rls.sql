-- Migração 001 — ligar utilizadores ao Supabase Auth + ativar RLS em todas as tabelas
-- Corre isto DEPOIS do schema.sql já ter sido executado com sucesso.

-- ============================================================
-- 1. Ligar `utilizadores` ao Supabase Auth (em vez de gerir password à mão)
-- ============================================================

alter table utilizadores add column if not exists auth_user_id uuid unique references auth.users(id);
alter table utilizadores drop column if exists password_hash;

-- O convite/reset de password passam a ser feitos pelo Supabase Auth
-- (supabase.auth.admin.inviteUserByEmail / supabase.auth.resetPasswordForEmail),
-- por isso esta tabela deixa de ser necessária.
drop table if exists tokens_autenticacao;

-- ============================================================
-- 2. Ativar Row Level Security em todas as tabelas + política base
-- ============================================================
-- Baseline: qualquer utilizador autenticado pode ler/escrever.
-- Regras mais finas por perfil (ver tabela `permissoes`) ficam para depois —
-- aplicadas na camada da aplicação (rotas de API) e, mais tarde, como policies
-- adicionais aqui caso se queira reforçar ao nível da base de dados.
-- Nota: pedidos feitos com a service_role key (backend/admin) ignoram sempre o RLS.

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
