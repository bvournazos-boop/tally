-- Tally sync table. Paste into Supabase → SQL Editor → New query → Run.
-- One row per group, list or task. Each person can only see and change their own rows.

create table if not exists public.items (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,                 -- e.g. "task:abc123", "list:inbox"
  kind text not null,               -- task | list | group
  data jsonb,                       -- the item itself (null when deleted)
  deleted boolean not null default false,
  server_updated timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists items_user_updated on public.items (user_id, server_updated);

-- Server stamps every change so devices with different clocks still sync in order
create or replace function public.items_touch() returns trigger
language plpgsql as $$
begin
  new.server_updated = clock_timestamp();
  return new;
end $$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items
for each row execute function public.items_touch();

-- Only you can read or write your rows
alter table public.items enable row level security;
drop policy if exists "own rows" on public.items;
create policy "own rows" on public.items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Live updates between your computers
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;

-- Newer Supabase projects don't give signed-in users access to new tables automatically
grant select, insert, update, delete on table public.items to authenticated;
