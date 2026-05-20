-- Cole este arquivo no Editor SQL do Supabase e clique em Correr.
-- Ele cria as tabelas com os nomes que o app usa e libera leitura/escrita
-- para o prototipo publicado no GitHub Pages.

create extension if not exists pgcrypto;

create table if not exists public.formacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  publico text not null default 'Diretores escolares',
  esperado integer not null default 0,
  sheet_url text not null default '',
  foto_url text not null default '',
  data_evento date,
  prazo_inscricoes date,
  prazo_recurso_inscricao date,
  prazo_recurso_credenciamento date,
  prazo_recurso date,
  created_at timestamptz not null default now()
);

alter table public.formacoes
  add column if not exists prazo_recurso_inscricao date,
  add column if not exists prazo_recurso_credenciamento date;

create table if not exists public.recursos (
  id uuid primary key default gen_random_uuid(),
  formacao_id uuid not null references public.formacoes(id) on delete cascade,
  gre text not null default '',
  tipo text not null default 'inscricao',
  justificativa text not null default '',
  escolas jsonb not null default '[]',
  status text not null default 'pendente',
  observacao text not null default '',
  criado_em timestamptz not null default now(),
  decidido_em timestamptz
);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  senha text not null,
  perfil text not null default 'regional',
  gre text not null default 'TODAS',
  created_at timestamptz not null default now()
);

create table if not exists public.formacao_dados (
  id uuid primary key default gen_random_uuid(),
  formacao_id uuid not null references public.formacoes(id) on delete cascade,
  gre text not null default '',
  inep text not null default '',
  escola text not null default '',
  nome text not null default '',
  matricula text not null default '',
  inscrito boolean not null default false,
  credenciado boolean not null default false,
  imported_at timestamptz not null default now()
);

create index if not exists formacao_dados_formacao_id_idx
  on public.formacao_dados (formacao_id);

create table if not exists public.escola_recurso (
  id uuid primary key default gen_random_uuid(),
  formacao_id uuid not null references public.formacoes(id) on delete cascade,
  inep text not null default '',
  recurso_inscricao text not null default '',
  resultado_inscricao text not null default '',
  recurso_credenciamento text not null default '',
  resultado_credenciamento text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.escola_recurso
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists formacao_id uuid references public.formacoes(id) on delete cascade,
  add column if not exists inep text not null default '',
  add column if not exists recurso_inscricao text not null default '',
  add column if not exists resultado_inscricao text not null default '',
  add column if not exists recurso_credenciamento text not null default '',
  add column if not exists resultado_credenciamento text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists escola_recurso_formacao_inep_key
  on public.escola_recurso (formacao_id, inep);

alter table public.formacoes enable row level security;
alter table public.usuarios enable row level security;
alter table public.formacao_dados enable row level security;
alter table public.escola_recurso enable row level security;

drop policy if exists "Ler formacoes publicamente" on public.formacoes;
drop policy if exists "Inserir formacoes publicamente" on public.formacoes;
drop policy if exists "Atualizar formacoes publicamente" on public.formacoes;
drop policy if exists "Excluir formacoes publicamente" on public.formacoes;

create policy "Ler formacoes publicamente" on public.formacoes for select using (true);
create policy "Inserir formacoes publicamente" on public.formacoes for insert with check (true);
create policy "Atualizar formacoes publicamente" on public.formacoes for update using (true) with check (true);
create policy "Excluir formacoes publicamente" on public.formacoes for delete using (true);

drop policy if exists "Ler usuarios publicamente" on public.usuarios;
drop policy if exists "Inserir usuarios publicamente" on public.usuarios;
drop policy if exists "Atualizar usuarios publicamente" on public.usuarios;
drop policy if exists "Excluir usuarios publicamente" on public.usuarios;

create policy "Ler usuarios publicamente" on public.usuarios for select using (true);
create policy "Inserir usuarios publicamente" on public.usuarios for insert with check (true);
create policy "Atualizar usuarios publicamente" on public.usuarios for update using (true) with check (true);
create policy "Excluir usuarios publicamente" on public.usuarios for delete using (true);

drop policy if exists "Ler dados publicamente" on public.formacao_dados;
drop policy if exists "Inserir dados publicamente" on public.formacao_dados;
drop policy if exists "Atualizar dados publicamente" on public.formacao_dados;
drop policy if exists "Excluir dados publicamente" on public.formacao_dados;

create policy "Ler dados publicamente" on public.formacao_dados for select using (true);
create policy "Inserir dados publicamente" on public.formacao_dados for insert with check (true);
create policy "Atualizar dados publicamente" on public.formacao_dados for update using (true) with check (true);
create policy "Excluir dados publicamente" on public.formacao_dados for delete using (true);

drop policy if exists "Ler recursos escola publicamente" on public.escola_recurso;
drop policy if exists "Inserir recursos escola publicamente" on public.escola_recurso;
drop policy if exists "Atualizar recursos escola publicamente" on public.escola_recurso;
drop policy if exists "Excluir recursos escola publicamente" on public.escola_recurso;

create policy "Ler recursos escola publicamente" on public.escola_recurso for select using (true);
create policy "Inserir recursos escola publicamente" on public.escola_recurso for insert with check (true);
create policy "Atualizar recursos escola publicamente" on public.escola_recurso for update using (true) with check (true);
create policy "Excluir recursos escola publicamente" on public.escola_recurso for delete using (true);

alter table public.recursos enable row level security;

drop policy if exists "Ler recursos publicamente" on public.recursos;
drop policy if exists "Inserir recursos publicamente" on public.recursos;
drop policy if exists "Atualizar recursos publicamente" on public.recursos;
drop policy if exists "Excluir recursos publicamente" on public.recursos;

create policy "Ler recursos publicamente" on public.recursos for select using (true);
create policy "Inserir recursos publicamente" on public.recursos for insert with check (true);
create policy "Atualizar recursos publicamente" on public.recursos for update using (true) with check (true);
create policy "Excluir recursos publicamente" on public.recursos for delete using (true);
