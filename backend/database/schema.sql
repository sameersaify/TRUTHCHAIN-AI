-- Supabase / PostgreSQL schema with Row Level Security.
-- Run in the Supabase SQL editor when you move from local SQLite to Supabase.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.scans (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','audio','text')),
  file_hash text not null,
  report_hash text not null,
  report_json jsonb not null,
  score_label text not null,
  is_demo boolean not null default false,
  model_name text not null,
  model_version text not null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table public.blockchain_records (
  id bigint generated always as identity primary key,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  chain_id integer, contract_address text, tx_hash text, block_number bigint,
  status text not null check (status in ('pending','confirmed','failed')),
  error text, updated_at timestamptz not null default now()
);

create table public.certificates (
  public_id text primary key,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.blockchain_records enable row level security;
alter table public.certificates enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own scans" on public.scans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own chain records" on public.blockchain_records for select
  using (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()));
create policy "own certificates" on public.certificates for select
  using (exists (select 1 from public.scans s where s.id = scan_id and s.user_id = auth.uid()));
-- Public verification goes through the backend (service-role key, server-side only),
-- which returns only intentionally public certificate fields.
