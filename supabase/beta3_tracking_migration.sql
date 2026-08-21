-- LabelOnZeWay Beta 3 public tracking. Run only after review in the existing
-- Supabase project; this file is deliberately not executed by the web app.
create table if not exists public.parcel_tracking_tokens (
  token uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  parcel_id text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, profile_id, parcel_id)
);

create table if not exists public.parcel_tracking_projection (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  parcel_id text not null,
  order_number text not null,
  status text not null check (status in ('ready','in_transit','delivered','exception')),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, profile_id, parcel_id)
);

alter table public.parcel_tracking_tokens enable row level security;
alter table public.parcel_tracking_projection enable row level security;

create policy "tracking tokens are workspace staff only" on public.parcel_tracking_tokens
  for all to authenticated using (public.workspace_role(workspace_id) in ('admin','staff'))
  with check (public.workspace_role(workspace_id) in ('admin','staff'));
create policy "tracking projections are workspace staff only" on public.parcel_tracking_projection
  for all to authenticated using (public.workspace_role(workspace_id) in ('admin','staff'))
  with check (public.workspace_role(workspace_id) in ('admin','staff'));

create or replace function public.upsert_parcel_tracking(
  p_workspace_id uuid,p_profile_id text,p_parcel_id text,p_order_number text,p_status text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_token uuid;
begin
  if auth.uid() is null or coalesce(public.workspace_role(p_workspace_id),'') not in ('admin','staff') then
    raise exception 'not authorized';
  end if;
  if p_status not in ('ready','in_transit','delivered','exception') then raise exception 'invalid status'; end if;
  insert into parcel_tracking_projection(workspace_id,profile_id,parcel_id,order_number,status,updated_at)
  values(p_workspace_id,p_profile_id,p_parcel_id,p_order_number,p_status,now())
  on conflict(workspace_id,profile_id,parcel_id) do update set order_number=excluded.order_number,status=excluded.status,updated_at=excluded.updated_at;
  insert into parcel_tracking_tokens(workspace_id,profile_id,parcel_id)
  values(p_workspace_id,p_profile_id,p_parcel_id)
  on conflict(workspace_id,profile_id,parcel_id) do update set revoked_at=null
  returning token into v_token;
  return v_token;
end $$;

create or replace function public.public_parcel_tracking(p_token uuid)
returns table(order_number text,status text,updated_at timestamptz) language sql security definer set search_path=public as $$
  select p.order_number,p.status,p.updated_at from parcel_tracking_tokens t
  join parcel_tracking_projection p using(workspace_id,profile_id,parcel_id)
  where t.token=p_token and t.revoked_at is null
$$;
grant execute on function public.upsert_parcel_tracking(uuid,text,text,text,text) to authenticated;
grant execute on function public.public_parcel_tracking(uuid) to anon,authenticated;
