-- Saved snippets per user — replaces backend saved_code + users tables
-- Run in Supabase SQL Editor (Singapore ap-southeast-1) or via Supabase CLI

-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists public.saved_snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  source_code text not null check (char_length(source_code) between 1 and 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_snippets_user_updated
  on public.saved_snippets(user_id, updated_at desc);

-- Keep updated_at fresh (like Earthquake-Recovery push.sql:34 touch_updated_at)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_saved_snippets_updated_at on public.saved_snippets;
create trigger trg_saved_snippets_updated_at
  before update on public.saved_snippets
  for each row execute function public.handle_updated_at();

-- RLS: users can only see/modify their own rows
alter table public.saved_snippets enable row level security;

drop policy if exists "own rows select" on public.saved_snippets;
create policy "own rows select" on public.saved_snippets
  for select using (auth.uid() = user_id);

drop policy if exists "own rows insert" on public.saved_snippets;
create policy "own rows insert" on public.saved_snippets
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows update" on public.saved_snippets;
create policy "own rows update" on public.saved_snippets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows delete" on public.saved_snippets;
create policy "own rows delete" on public.saved_snippets
  for delete using (auth.uid() = user_id);
