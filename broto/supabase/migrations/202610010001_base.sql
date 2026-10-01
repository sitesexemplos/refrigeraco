-- Execute uma vez no SQL Editor do Supabase, ou use supabase db push.
create table public.subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text unique not null,
 stripe_subscription_id text unique,
 status text not null default 'inactive',
 current_period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 event_created bigint not null default 0,
 updated_at timestamptz not null default now()
);
create table public.analyses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 result jsonb not null,
 created_at timestamptz not null default now()
);
create index analyses_user_created on public.analyses(user_id,created_at desc);
create table public.analysis_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 month date not null,
 count integer not null default 0 check(count>=0),
 primary key(user_id,month)
);
create table public.stripe_events(id text primary key,created_at timestamptz default now());
alter table public.subscriptions enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_usage enable row level security;
alter table public.stripe_events enable row level security;
revoke all on public.subscriptions, public.analyses, public.analysis_usage, public.stripe_events from anon,authenticated;
grant select on public.subscriptions,public.analyses,public.analysis_usage to authenticated;
grant delete on public.analyses to authenticated;
grant all on public.subscriptions,public.analyses,public.analysis_usage,public.stripe_events to service_role;
create policy own_subscription on public.subscriptions for select to authenticated using(auth.uid()=user_id);
create policy own_analyses on public.analyses for select to authenticated using(auth.uid()=user_id);
create policy delete_own_analyses on public.analyses for delete to authenticated using(auth.uid()=user_id);
create policy own_usage on public.analysis_usage for select to authenticated using(auth.uid()=user_id);
-- Only the server may reserve/refund quota. Atomic upsert prevents parallel bypass.
create function public.reserve_analysis(p_user uuid) returns date language plpgsql security definer set search_path=public as $$
declare m date := date_trunc('month',now() at time zone 'UTC')::date; n int;
begin
 if not exists(select 1 from subscriptions where user_id=p_user and status in ('active','trialing') and current_period_end>now()) then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 insert into analysis_usage(user_id,month,count) values(p_user,m,1)
 on conflict(user_id,month) do update set count=analysis_usage.count+1 where analysis_usage.count<30 returning count into n;
 if n is null then raise exception 'QUOTA_EXCEEDED'; end if;
 return m;
end $$;
create function public.refund_analysis(p_user uuid,p_month date) returns void language sql security definer set search_path=public as $$ update analysis_usage set count=greatest(count-1,0) where user_id=p_user and month=p_month; $$;
-- Deduplication and event ordering are committed in one transaction.
create function public.apply_stripe_event(p_event text,p_created bigint,p_user uuid,p_customer text,p_subscription text,p_status text,p_end timestamptz,p_cancel boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 insert into stripe_events(id) values(p_event) on conflict do nothing;
 if not found then return; end if;
 insert into subscriptions(user_id,stripe_customer_id,stripe_subscription_id,status,current_period_end,cancel_at_period_end,event_created)
 values(p_user,p_customer,p_subscription,p_status,p_end,p_cancel,p_created)
 on conflict(user_id) do update set stripe_subscription_id=excluded.stripe_subscription_id,status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,event_created=excluded.event_created,updated_at=now()
 where subscriptions.event_created<=excluded.event_created and subscriptions.stripe_customer_id=excluded.stripe_customer_id;
end $$;
revoke all on function public.reserve_analysis(uuid),public.refund_analysis(uuid,date),public.apply_stripe_event(text,bigint,uuid,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.reserve_analysis(uuid),public.refund_analysis(uuid,date),public.apply_stripe_event(text,bigint,uuid,text,text,text,timestamptz,boolean) to service_role;
