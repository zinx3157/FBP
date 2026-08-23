-- Beta 3 secure public tracking. Review and execute manually only after approval.
create table if not exists public.parcel_tracking_tokens (
  token uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  parcel_id text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique (workspace_id, profile_id, parcel_id)
);
alter table public.parcel_tracking_tokens add column if not exists expires_at timestamptz;
update public.parcel_tracking_tokens set expires_at=created_at + interval '7 days' where expires_at is null;
alter table public.parcel_tracking_tokens alter column expires_at set default (now() + interval '7 days');
alter table public.parcel_tracking_tokens alter column expires_at set not null;
create index if not exists parcel_tracking_tokens_expiry_idx on public.parcel_tracking_tokens(expires_at);
create index if not exists parcel_tracking_tokens_parcel_idx on public.parcel_tracking_tokens(workspace_id,profile_id,parcel_id);

create table if not exists public.parcel_tracking_projection (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null, parcel_id text not null, order_number text not null,
  status text not null check (status in ('ready','in_transit','delivered','exception')),
  updated_at timestamptz not null default now(), primary key (workspace_id,profile_id,parcel_id)
);
alter table public.parcel_tracking_tokens enable row level security;
alter table public.parcel_tracking_projection enable row level security;
drop policy if exists "tracking tokens are workspace staff only" on public.parcel_tracking_tokens;
drop policy if exists "tracking projections are workspace staff only" on public.parcel_tracking_projection;
create policy "tracking tokens are workspace staff only" on public.parcel_tracking_tokens for all to authenticated using (public.workspace_role(workspace_id) in ('admin','staff')) with check (public.workspace_role(workspace_id) in ('admin','staff'));
create policy "tracking projections are workspace staff only" on public.parcel_tracking_projection for all to authenticated using (public.workspace_role(workspace_id) in ('admin','staff')) with check (public.workspace_role(workspace_id) in ('admin','staff'));

create or replace function public.upsert_parcel_tracking_projection(p_workspace_id uuid,p_profile_id text,p_parcel_id text,p_order_number text,p_status text)
returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or coalesce(public.workspace_role(p_workspace_id),'') not in ('admin','staff') then raise exception 'not authorized'; end if;
 if p_status not in ('ready','in_transit','delivered','exception') then raise exception 'invalid status'; end if;
 insert into public.parcel_tracking_projection(workspace_id,profile_id,parcel_id,order_number,status,updated_at) values(p_workspace_id,p_profile_id,p_parcel_id,p_order_number,p_status,now()) on conflict(workspace_id,profile_id,parcel_id) do update set order_number=excluded.order_number,status=excluded.status,updated_at=excluded.updated_at;
end $$;

create or replace function public.generate_parcel_tracking_token(p_workspace_id uuid,p_profile_id text,p_parcel_id text,p_order_number text,p_status text)
returns table(token uuid,expires_at timestamptz) language plpgsql security definer set search_path='' as $$ begin
 perform public.upsert_parcel_tracking_projection(p_workspace_id,p_profile_id,p_parcel_id,p_order_number,p_status);
 -- A fresh token replaces the old token; expired/revoked rows are never reactivated.
 delete from public.parcel_tracking_tokens where workspace_id=p_workspace_id and profile_id=p_profile_id and parcel_id=p_parcel_id;
 return query insert into public.parcel_tracking_tokens(workspace_id,profile_id,parcel_id) values(p_workspace_id,p_profile_id,p_parcel_id) returning public.parcel_tracking_tokens.token,public.parcel_tracking_tokens.expires_at;
end $$;

create or replace function public.revoke_parcel_tracking_token(p_workspace_id uuid,p_profile_id text,p_parcel_id text)
returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or coalesce(public.workspace_role(p_workspace_id),'') not in ('admin','staff') then raise exception 'not authorized'; end if;
 update public.parcel_tracking_tokens set revoked_at=now() where workspace_id=p_workspace_id and profile_id=p_profile_id and parcel_id=p_parcel_id and revoked_at is null;
end $$;

create or replace function public.public_parcel_tracking(p_token uuid)
returns table(order_number text,status text,updated_at timestamptz,link_state text) language sql security definer set search_path='' as $$
 with token_row as (select workspace_id,profile_id,parcel_id,revoked_at,expires_at from public.parcel_tracking_tokens where token=p_token)
 select p.order_number,p.status,p.updated_at,case when t.revoked_at is not null then 'revoked' when t.expires_at<=now() then 'expired' else 'active' end
 from token_row t join public.parcel_tracking_projection p using(workspace_id,profile_id,parcel_id)
 where t.revoked_at is null and t.expires_at>now()
 union all select null::text,null::text,null::timestamptz,case when exists(select 1 from token_row where revoked_at is not null) then 'revoked' when exists(select 1 from token_row where expires_at<=now()) then 'expired' else 'not_found' end
 where not exists(select 1 from token_row where revoked_at is null and expires_at>now());
$$;
revoke all on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) from public;
revoke all on function public.generate_parcel_tracking_token(uuid,text,text,text,text) from public;
revoke all on function public.revoke_parcel_tracking_token(uuid,text,text,text) from public;
revoke all on function public.public_parcel_tracking(uuid) from public;
grant execute on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) to authenticated;
grant execute on function public.generate_parcel_tracking_token(uuid,text,text,text,text) to authenticated;
grant execute on function public.revoke_parcel_tracking_token(uuid,text,text,text) to authenticated;
grant execute on function public.public_parcel_tracking(uuid) to anon,authenticated;
