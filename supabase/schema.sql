-- FoodStory Portal — schema inicial (Postgres / Supabase)
-- Gerado a partir de "FoodStory Portal - Especificacao Tecnica.md"
-- Convenção: PK bigint identity, timestamps timestamptz, moeda numeric(12,2).
-- Este ficheiro é o ponto de partida. Falta ainda: RLS policies, triggers de log_alteracoes,
-- e as views de cálculo dos campos derivados do Pipeline (proveito, margem, etc.).

-- ============================================================
-- 1. CATÁLOGOS / CONFIGURAÇÃO
-- ============================================================

create table segmentos (
  id bigint generated always as identity primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table categorias_espaco (
  id bigint generated always as identity primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table espacos (
  id bigint generated always as identity primary key,
  nome text not null unique,
  cat_espaco_id bigint references categorias_espaco(id),
  criado_em timestamptz not null default now()
);

create table sources (
  id bigint generated always as identity primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table tipos_material (
  id bigint generated always as identity primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table unidades_medida (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  descricao text,
  fator_conversao numeric(12,4)
);

create table grupos_compra (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  descricao text
);

create table codigos_iva (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  taxa_pct numeric(5,2) not null,
  descricao text,
  motivo_isencao text,
  ativo boolean not null default true
);

create table centros_custo (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  responsavel_id bigint,
  ativo boolean not null default true
);

create table tipos_responsabilidade (
  id bigint generated always as identity primary key,
  nome text not null unique
);

create table perfis (
  id bigint generated always as identity primary key,
  nome text not null unique
);

-- ============================================================
-- 2. UTILIZADORES E AUTENTICAÇÃO
-- ============================================================

-- Autenticação delegada no Supabase Auth (convite por email + reset de password
-- geridos por auth.users / supabase.auth.admin.*) — auth_user_id liga o registo
-- de negócio ao utilizador de auth. Não guardamos password aqui.
create table utilizadores (
  id bigint generated always as identity primary key,
  auth_user_id uuid unique references auth.users(id),
  nome text not null,
  email text not null unique,
  username text unique,
  perfil_id bigint references perfis(id),
  estado_conta text not null default 'Convidado' check (estado_conta in ('Convidado','Ativo','Bloqueado')),
  ativo boolean not null default true,
  ultimo_login timestamptz,
  convite_enviado_em timestamptz,
  password_definida_em timestamptz,
  criado_em timestamptz not null default now()
);

create table permissoes (
  id bigint generated always as identity primary key,
  perfil_id bigint not null references perfis(id) on delete cascade,
  modulo text not null,
  acao text not null check (acao in ('ver','criar','editar','eliminar','aprovar'))
);

create table utilizadores_responsabilidades (
  id bigint generated always as identity primary key,
  utilizador_id bigint not null references utilizadores(id) on delete cascade,
  tipo_responsabilidade_id bigint not null references tipos_responsabilidade(id) on delete cascade,
  unique (utilizador_id, tipo_responsabilidade_id)
);

create table pessoas_logistica (
  id bigint generated always as identity primary key,
  nome text not null,
  contacto text,
  email text,
  ativo boolean not null default true
);

create table pessoas_sala (
  id bigint generated always as identity primary key,
  nome text not null,
  contacto text,
  email text,
  chefe boolean not null default false,
  ativo boolean not null default true
);

-- ============================================================
-- 3. CLIENTES E FORNECEDORES
-- ============================================================

create table clientes (
  id bigint generated always as identity primary key,
  bc_no text unique,
  nome text not null,
  nome_2 text,
  morada text,
  morada_2 text,
  codigo_postal text,
  localidade text,
  pais text default 'PT',
  nif text,
  pessoa_contacto text,
  telefone text,
  email text,
  tipo text check (tipo in ('Directo','Agência','Final')),
  grupo_posting_iva text,
  grupo_posting_cliente text,
  termos_pagamento text,
  metodo_pagamento text,
  moeda text default 'EUR',
  comercial_id bigint references utilizadores(id),
  limite_credito numeric(12,2),
  bloqueado text default 'Nenhum' check (bloqueado in ('Nenhum','Faturação','Encomenda','Tudo')),
  ativo boolean not null default true,
  origem text not null default 'Importado BC' check (origem in ('Importado BC','Criado na App')),
  estado_sincronizacao text not null default 'Pendente' check (estado_sincronizacao in ('Sincronizado','Pendente','Erro')),
  sincronizado_em timestamptz
);

create table fornecedores (
  id bigint generated always as identity primary key,
  bc_no text unique,
  nome text not null,
  nome_2 text,
  morada text,
  morada_2 text,
  codigo_postal text,
  localidade text,
  pais text default 'PT',
  nif text,
  pessoa_contacto text,
  telefone text,
  email text,
  grupo_posting_iva text,
  grupo_posting_fornecedor text,
  termos_pagamento text,
  metodo_pagamento text,
  moeda text default 'EUR',
  comprador_id bigint references utilizadores(id),
  bloqueado text default 'Nenhum' check (bloqueado in ('Nenhum','Pagamento','Tudo')),
  ativo boolean not null default true,
  origem text not null default 'Importado BC' check (origem in ('Importado BC','Criado na App')),
  estado_sincronizacao text not null default 'Pendente' check (estado_sincronizacao in ('Sincronizado','Pendente','Erro')),
  sincronizado_em timestamptz
);

-- ============================================================
-- 4. LOGÍSTICA — base (armazéns, materiais)
-- ============================================================

create table armazens (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  morada text,
  responsavel_id bigint references pessoas_logistica(id),
  ativo boolean not null default true
);

create table materiais (
  id bigint generated always as identity primary key,
  codigo text unique,
  descricao text not null,
  tipo_material_id bigint references tipos_material(id),
  unidade_medida_base_id bigint not null references unidades_medida(id),
  reutilizavel boolean not null default false,
  grupo_compra_id bigint references grupos_compra(id),
  fornecedor_preferido_id bigint references fornecedores(id),
  codigo_no_fornecedor text,
  preco_custo_standard numeric(12,2),
  codigo_iva_id bigint references codigos_iva(id),
  armazem_padrao_id bigint references armazens(id),
  stock_minimo numeric(12,2),
  ativo boolean not null default true
);

-- ============================================================
-- 5. PIPELINE
-- ============================================================

create table pipeline (
  id bigint generated always as identity primary key,
  n_evento bigint generated always as identity,
  status text not null default 'Em análise' check (status in ('Ganho','Boa possibilidade','Em análise','Perdido')),
  data date not null,
  n_fatura text,
  cs_versao text,
  cliente_direto_id bigint references clientes(id),
  cliente_final_id bigint references clientes(id),
  segmento_id bigint references segmentos(id),
  cat_espaco_id bigint references categorias_espaco(id),
  espaco text,
  tipo_servico text,
  n_pax integer not null,
  fb numeric(12,2) not null default 0,
  fatura numeric(12,2),
  operacao text,
  bebidas_confirmadas boolean not null default false,

  -- custos detalhados (input) — bloco 1
  custo_decoracao numeric(12,2) default 0,
  custo_seguranca numeric(12,2) default 0,
  custo_animacao numeric(12,2) default 0,
  custo_aluguer_espacos numeric(12,2) default 0,
  custo_staff numeric(12,2) default 0,
  custo_taxa_logistica numeric(12,2) default 0,
  custo_limpeza numeric(12,2) default 0,
  custo_outros numeric(12,2) default 0,

  -- custos detalhados (input) — bloco 2 (produção)
  producao_decoracao numeric(12,2) default 0,
  producao_seguranca numeric(12,2) default 0,
  producao_animacao numeric(12,2) default 0,
  producao_aluguer_espacos numeric(12,2) default 0,
  producao_limpeza numeric(12,2) default 0,
  producao_outros numeric(12,2) default 0,

  criado_por bigint references utilizadores(id),
  criado_em timestamptz not null default now()
);

-- Campos calculados (proveito, v_pax, dif, total_receita, staff, producao, total_custo,
-- margem_eur, margem_pct, margem_fb_eur/%, margem_producao_eur/%, sala_pct):
-- ficam como view (v_pipeline_calculado) ou colunas geradas — a implementar depois de
-- confirmar as fórmulas linha a linha com o Excel (secção 2.2 do documento).

create table pipeline_comerciais (
  id bigint generated always as identity primary key,
  pipeline_id bigint not null references pipeline(id) on delete cascade,
  utilizador_id bigint not null references utilizadores(id),
  unique (pipeline_id, utilizador_id)
);

create table documentos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('CS','Lista de Material')),
  pipeline_id bigint not null references pipeline(id) on delete cascade,
  nome_ficheiro text not null,
  caminho_storage text not null,
  versao text,
  carregado_por bigint references utilizadores(id),
  data_upload timestamptz not null default now()
);

-- ============================================================
-- 6. LOGÍSTICA — compras, listas de material, stock
-- ============================================================

create table pedidos_compra (
  id bigint generated always as identity primary key,
  numero text not null unique,
  fornecedor_id bigint not null references fornecedores(id),
  pipeline_id bigint references pipeline(id),
  centro_custo_id bigint references centros_custo(id),
  data_documento date not null default current_date,
  data_entrega_esperada date,
  armazem_id bigint references armazens(id),
  grupo_compra_id bigint references grupos_compra(id),
  moeda text default 'EUR',
  termos_pagamento text,
  estado text not null default 'Rascunho' check (estado in ('Rascunho','Enviado','Aprovado','Recebido Parcial','Recebido','Cancelado')),
  criado_por bigint references utilizadores(id),
  criado_em timestamptz not null default now(),
  aprovado_por bigint references utilizadores(id),
  data_aprovacao timestamptz,
  notas text,
  constraint chk_evento_xor_centro_custo check (
    (pipeline_id is not null and centro_custo_id is null) or
    (pipeline_id is null and centro_custo_id is not null)
  )
);

create table pedidos_compra_linhas (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos_compra(id) on delete cascade,
  numero_linha integer not null,
  material_id bigint references materiais(id),
  descricao text,
  quantidade numeric(12,2) not null,
  unidade_medida_id bigint references unidades_medida(id),
  preco_unitario numeric(12,2) not null default 0,
  desconto_pct numeric(5,2) default 0,
  codigo_iva_id bigint references codigos_iva(id),
  quantidade_recebida numeric(12,2) not null default 0
);

create table listas_material (
  id bigint generated always as identity primary key,
  pipeline_id bigint not null references pipeline(id) on delete cascade,
  estado text not null default 'Rascunho' check (estado in ('Rascunho','Confirmada','Em separação','Entregue','Devolvida')),
  criado_por bigint references utilizadores(id),
  data_criacao timestamptz not null default now()
);

create table listas_material_linhas (
  id bigint generated always as identity primary key,
  lista_material_id bigint not null references listas_material(id) on delete cascade,
  material_id bigint not null references materiais(id),
  quantidade_planeada numeric(12,2) not null,
  quantidade_separada numeric(12,2) default 0,
  quantidade_devolvida numeric(12,2) default 0,
  armazem_id bigint references armazens(id)
);

create table stock_saldos (
  material_id bigint not null references materiais(id),
  armazem_id bigint not null references armazens(id),
  quantidade_disponivel numeric(12,2) not null default 0,
  quantidade_reservada numeric(12,2) not null default 0,
  quantidade_em_transito numeric(12,2) not null default 0,
  primary key (material_id, armazem_id)
);

create table stock_movimentos (
  id bigint generated always as identity primary key,
  material_id bigint not null references materiais(id),
  armazem_id bigint not null references armazens(id),
  armazem_destino_id bigint references armazens(id),
  tipo_movimento text not null check (tipo_movimento in (
    'Entrada Compra','Saída Evento','Devolução Evento',
    'Transferência Saída','Transferência Entrada','Quebra','Sobra','Ajuste Inventário'
  )),
  quantidade numeric(12,2) not null,
  data timestamptz not null default now(),
  documento_origem_tipo text,
  documento_origem_id bigint,
  motivo text,
  utilizador_id bigint references utilizadores(id),
  criado_em timestamptz not null default now()
);

create table rececoes_compra (
  id bigint generated always as identity primary key,
  numero text not null unique,
  pedido_compra_id bigint not null references pedidos_compra(id),
  armazem_id bigint not null references armazens(id),
  data_rececao date not null default current_date,
  estado text not null default 'Parcial' check (estado in ('Parcial','Completa')),
  recebido_por bigint references utilizadores(id)
);

create table rececoes_compra_linhas (
  id bigint generated always as identity primary key,
  rececao_id bigint not null references rececoes_compra(id) on delete cascade,
  pedido_compra_linha_id bigint not null references pedidos_compra_linhas(id),
  material_id bigint not null references materiais(id),
  quantidade_esperada numeric(12,2) not null,
  quantidade_recebida numeric(12,2) not null default 0
);

create table transferencias_armazem (
  id bigint generated always as identity primary key,
  numero text not null unique,
  armazem_origem_id bigint not null references armazens(id),
  armazem_destino_id bigint not null references armazens(id),
  data date not null default current_date,
  estado text not null default 'Em trânsito' check (estado in ('Em trânsito','Concluída')),
  criado_por bigint references utilizadores(id)
);

create table transferencias_armazem_linhas (
  id bigint generated always as identity primary key,
  transferencia_id bigint not null references transferencias_armazem(id) on delete cascade,
  material_id bigint not null references materiais(id),
  quantidade numeric(12,2) not null
);

create table inventarios (
  id bigint generated always as identity primary key,
  armazem_id bigint not null references armazens(id),
  data date not null default current_date,
  estado text not null default 'Em curso' check (estado in ('Em curso','Fechado')),
  responsavel_id bigint references utilizadores(id)
);

create table inventarios_linhas (
  id bigint generated always as identity primary key,
  inventario_id bigint not null references inventarios(id) on delete cascade,
  material_id bigint not null references materiais(id),
  quantidade_sistema numeric(12,2) not null,
  quantidade_contada numeric(12,2),
  ajustado boolean not null default false
);

-- ============================================================
-- 7. FINANCEIRA
-- ============================================================

create table faturas_clientes (
  id bigint generated always as identity primary key,
  numero text not null unique,
  pipeline_id bigint references pipeline(id),
  sell_to_cliente_id bigint not null references clientes(id),
  bill_to_cliente_id bigint not null references clientes(id),
  numero_fatura_externo text,
  data_documento date not null default current_date,
  data_vencimento date,
  termos_pagamento text,
  moeda text default 'EUR',
  comercial_id bigint references utilizadores(id),
  estado text not null default 'Rascunho' check (estado in ('Rascunho','Registada','Paga Parcial','Paga','Vencida')),
  notas text
);

create table faturas_clientes_linhas (
  id bigint generated always as identity primary key,
  fatura_id bigint not null references faturas_clientes(id) on delete cascade,
  tipo text not null default 'Item' check (tipo in ('Item','Serviço','Texto')),
  descricao text not null,
  quantidade numeric(12,2) not null default 1,
  preco_unitario numeric(12,2) not null default 0,
  desconto_pct numeric(5,2) default 0,
  codigo_iva_id bigint references codigos_iva(id)
);

-- ============================================================
-- 8. TAREFAS
-- ============================================================

create table regras_tarefas_automaticas (
  id bigint generated always as identity primary key,
  nome text not null,
  condicao text not null,
  tipo_responsabilidade_id bigint not null references tipos_responsabilidade(id),
  titulo_tarefa text not null,
  ativo boolean not null default true
);

create table tarefas (
  id bigint generated always as identity primary key,
  titulo text not null,
  descricao text,
  pipeline_id bigint references pipeline(id),
  responsavel_id bigint not null references utilizadores(id),
  prazo date,
  estado text not null default 'Pendente' check (estado in ('Pendente','Concluída','Cancelada')),
  origem text not null default 'Manual' check (origem in ('Manual','Automática')),
  regra_origem_id bigint references regras_tarefas_automaticas(id),
  criado_em timestamptz not null default now(),
  concluido_em timestamptz,
  concluido_por bigint references utilizadores(id)
);

-- ============================================================
-- 9. BACK OFFICE — auditoria, erros, integrações
-- ============================================================

create table log_alteracoes (
  id bigint generated always as identity primary key,
  tabela text not null,
  registo_id bigint not null,
  campo text,
  valor_anterior text,
  valor_novo text,
  tipo_acao text not null check (tipo_acao in ('Criação','Modificação','Eliminação')),
  utilizador_id bigint references utilizadores(id),
  data_hora timestamptz not null default now()
);

create table erros_avisos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('Erro','Aviso')),
  modulo text not null,
  mensagem text not null,
  entidade_referencia text,
  utilizador_id bigint references utilizadores(id),
  data_hora timestamptz not null default now(),
  resolvido boolean not null default false,
  resolvido_por bigint references utilizadores(id),
  data_resolucao timestamptz
);

create table integracoes_config (
  id bigint generated always as identity primary key,
  sistema text not null,
  endpoint_api text,
  tipo_autenticacao text,
  ativo boolean not null default true,
  ultima_sincronizacao timestamptz
);

create table integracoes_log (
  id bigint generated always as identity primary key,
  sistema text not null,
  entidade text not null,
  entidade_id bigint,
  direcao text not null check (direcao in ('Enviado','Recebido')),
  estado text not null check (estado in ('Sucesso','Erro')),
  mensagem text,
  data_hora timestamptz not null default now()
);

-- ============================================================
-- Índices úteis
-- ============================================================

create index idx_pipeline_data on pipeline(data);
create index idx_pipeline_status on pipeline(status);
create index idx_stock_movimentos_material on stock_movimentos(material_id, armazem_id);
create index idx_tarefas_responsavel on tarefas(responsavel_id, estado);

-- ============================================================
-- 10. Row Level Security
-- ============================================================
-- Baseline: qualquer utilizador autenticado pode ler/escrever.
-- Regras mais finas por perfil (tabela `permissoes`) ficam para depois,
-- aplicadas na aplicação e, se necessário, como policies adicionais aqui.
-- service_role (backend/admin) ignora sempre o RLS.

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
