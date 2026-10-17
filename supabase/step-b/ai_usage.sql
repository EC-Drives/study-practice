-- Study Practice, STEP B ONLY. Do not run this in Step A.
-- Run it in the SQL editor when the Step B edge functions are deployed (after the two files in
-- supabase/migrations/). It adds a daily allowance per account for the Claude features, so a
-- signed-in account can never run up an unlimited Anthropic bill.

create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  feature text not null check (feature in ('ask', 'handwriting', 'generate')),
  calls integer not null default 0,
  primary key (user_id, day, feature)
);

alter table public.ai_usage enable row level security;

-- each account can see its own counts (for a "3 of 20 left today" note); nobody writes from the app
create policy ai_usage_select on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.ai_usage from public, anon, authenticated;
grant select on table public.ai_usage to authenticated;

-- Take one call from today's allowance. True if allowed. Only the edge functions (service role).
create function public.ai_take(p_user uuid, p_feature text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.ai_usage (user_id, day, feature, calls)
  values (p_user, current_date, p_feature, 1)
  on conflict (user_id, day, feature) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n <= p_limit;
end;
$$;

revoke execute on function public.ai_take(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ai_take(uuid, text, integer) to service_role;
