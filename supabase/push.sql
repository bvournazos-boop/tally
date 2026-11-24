-- Tally reminders when the app is closed (web push).
-- Don't paste this file by hand: open https://tally-ntqo.vercel.app/setup-push.html,
-- which adds your secret and the every-minute schedule at the end and gives you one block to copy.

-- One row per device that allows notifications. Each person sees only their own.
create table if not exists public.push_subs (
  endpoint text primary key,                  -- the device's push address
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  sub jsonb not null,                         -- what the browser gave us (address + encryption keys)
  tz text not null default 'UTC',             -- the device's time zone, so 9am means 9am there
  prefs jsonb not null default '{}'::jsonb,   -- that device's reminder settings
  device text,
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own subs" on public.push_subs;
create policy "own subs" on public.push_subs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on table public.push_subs to authenticated;

-- What was already sent, so nothing arrives twice. Only the sender can read it.
create table if not exists public.push_sent (
  endpoint text not null,
  task_id text not null,
  remind_at text not null,
  sent_at timestamptz not null default now(),
  primary key (endpoint, task_id, remind_at)
);
alter table public.push_sent enable row level security;

-- The shared secret between Supabase's timer and the sender on Vercel. Nobody can read it through the API.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  secret text not null
);
alter table public.push_config enable row level security;
revoke all on table public.push_config from anon, authenticated;
revoke all on table public.push_sent from anon, authenticated;

create or replace function public.push_ok(p_secret text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.push_config where id = 1 and secret = p_secret and length(p_secret) >= 32);
$$;
revoke all on function public.push_ok(text) from public, anon, authenticated;

-- Everything the sender needs for one run: devices, open tasks that could remind soon, and what was sent.
create or replace function public.push_work(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.push_ok(p_secret) then raise exception 'not allowed'; end if;
  delete from public.push_sent where sent_at < now() - interval '3 days';
  return jsonb_build_object(
    'subs', coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'user', s.user_id, 'sub', s.sub, 'tz', s.tz, 'prefs', s.prefs)) from public.push_subs s), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('user', i.user_id, 'data', i.data))
       from public.items i
       where i.kind = 'task' and not i.deleted
         and i.user_id in (select user_id from public.push_subs)
         and coalesce((i.data->>'done')::boolean, false) = false
         and ((i.data->>'reminder') is not null
              or (i.data->>'due') between to_char(now() - interval '2 days', 'YYYY-MM-DD') and to_char(now() + interval '2 days', 'YYYY-MM-DD'))), '[]'::jsonb),
    'sent', coalesce((select jsonb_agg(jsonb_build_array(endpoint, task_id, remind_at)) from public.push_sent where sent_at > now() - interval '2 days'), '[]'::jsonb)
  );
end $$;
revoke all on function public.push_work(text) from public;
grant execute on function public.push_work(text) to anon, authenticated;

-- After a run: remember what was sent, and forget devices that no longer accept pushes.
create or replace function public.push_done(p_secret text, p_sent jsonb, p_gone jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.push_ok(p_secret) then raise exception 'not allowed'; end if;
  insert into public.push_sent (endpoint, task_id, remind_at)
    select x->>0, x->>1, x->>2 from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x
  on conflict do nothing;
  delete from public.push_subs where endpoint in (select jsonb_array_elements_text(coalesce(p_gone, '[]'::jsonb)));
end $$;
revoke all on function public.push_done(text, jsonb, jsonb) from public;
grant execute on function public.push_done(text, jsonb, jsonb) to anon, authenticated;
