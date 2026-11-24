-- Tally calendar link. Paste into Supabase → SQL Editor → New query → Run.

-- One secret token per person; the calendar link contains it.
create table if not exists public.feed_tokens (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  token text not null unique,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);
alter table public.feed_tokens enable row level security;
drop policy if exists "own token" on public.feed_tokens;
create policy "own token" on public.feed_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on table public.feed_tokens to authenticated;

-- Returns only what a calendar needs, and only for a valid token.
create or replace function public.feed_items(p_token text)
returns table (kind text, data jsonb)
language sql
security definer
set search_path = public
stable
as $$
  with f as (select user_id, tz from public.feed_tokens where token = p_token and length(p_token) >= 24)
  select 'meta'::text, jsonb_build_object('tz', f.tz) from f
  union all
  select i.kind, i.data
  from public.items i join f on f.user_id = i.user_id
  where not i.deleted
    and (i.kind in ('list', 'group')
         or (i.kind = 'task' and i.data ? 'due' and i.data->>'due' is not null
             and coalesce((i.data->>'done')::boolean, false) = false));
$$;
revoke all on function public.feed_items(text) from public;
grant execute on function public.feed_items(text) to anon, authenticated;
