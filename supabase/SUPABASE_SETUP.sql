-- LabelOnZeWay shared-workspace synchronization schema
-- Run this entire file once in the Supabase SQL Editor.
-- Client apps use only the project URL and PUBLIC anon/publishable key.
-- Never place the service_role key in LabelOnZeWay.

begin;

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('admin', 'staff', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.sync_entities (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null check (char_length(profile_id) between 1 and 160),
  entity_type text not null check (entity_type in (
    'profile', 'profile_settings', 'customer', 'parcel_active', 'archive_day', 'label_copy', 'counter_state'
  )),
  entity_id text not null check (char_length(entity_id) between 1 and 220),
  payload jsonb not null default '{}'::jsonb,
  modified_at timestamptz not null,
  deleted_at timestamptz,
  device_id text not null check (char_length(device_id) between 1 and 160),
  server_received_at timestamptz not null default now(),
  primary key (workspace_id, profile_id, entity_type, entity_id),
  check (octet_length(payload::text) <= 8388608)
);

-- Named constraints are recreated so rerunning this file also upgrades and hardens an older draft.
-- PostgreSQL names an inline check on entity_type sync_entities_entity_type_check.
-- Drop both the old automatic name and this script's durable name before recreating it.
alter table public.sync_entities drop constraint if exists sync_entities_entity_type_check;
alter table public.sync_entities drop constraint if exists sync_entities_entity_type_allowed_check;
alter table public.sync_entities add constraint sync_entities_entity_type_allowed_check
  check (entity_type in (
    'profile', 'profile_settings', 'customer', 'parcel_active', 'archive_day', 'label_copy', 'counter_state'
  ));
alter table public.sync_entities drop constraint if exists sync_entities_safe_keys_check;
alter table public.sync_entities add constraint sync_entities_safe_keys_check
  check (position('|' in profile_id) = 0 and position('|' in entity_id) = 0 and position('|' in device_id) = 0);
alter table public.sync_entities drop constraint if exists sync_entities_payload_object_check;
alter table public.sync_entities add constraint sync_entities_payload_object_check
  check (jsonb_typeof(payload) = 'object');

create index if not exists sync_entities_workspace_modified_idx
  on public.sync_entities (workspace_id, modified_at);
create index if not exists sync_entities_workspace_profile_idx
  on public.sync_entities (workspace_id, profile_id, entity_type);

create table if not exists public.order_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null check (char_length(profile_id) between 1 and 160),
  next_number bigint not null default 1 check (next_number >= 1),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);
alter table public.order_counters drop constraint if exists order_counters_safe_profile_check;
alter table public.order_counters add constraint order_counters_safe_profile_check
  check (position('|' in profile_id) = 0 and next_number between 1 and 9000000000000000);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.sync_entities enable row level security;
alter table public.order_counters enable row level security;

-- SECURITY DEFINER membership helpers avoid recursive membership-policy evaluation.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select wm.role from public.workspace_members wm
  where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.workspace_role(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_role(uuid) to authenticated;

-- Recreate policies so this SQL can be safely rerun.
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
for select to authenticated using (public.is_workspace_member(id));

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
for select to authenticated using (
  user_id = auth.uid() or public.workspace_role(workspace_id) = 'admin'
);

drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin on public.workspace_members
for insert to authenticated with check (public.workspace_role(workspace_id) = 'admin');

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin on public.workspace_members
for update to authenticated using (public.workspace_role(workspace_id) = 'admin')
with check (public.workspace_role(workspace_id) = 'admin');

drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin on public.workspace_members
for delete to authenticated using (public.workspace_role(workspace_id) = 'admin');

drop policy if exists sync_entities_select_member on public.sync_entities;
create policy sync_entities_select_member on public.sync_entities
for select to authenticated using (public.is_workspace_member(workspace_id));

-- Deliberately provide no direct INSERT/UPDATE/DELETE policies on synchronized
-- records. All writes must use apply_sync_changes so role checks and deterministic
-- last-writer-wins handling cannot be bypassed (including by viewer accounts).
drop policy if exists sync_entities_insert_member on public.sync_entities;
drop policy if exists sync_entities_update_member on public.sync_entities;
drop policy if exists sync_entities_delete_member on public.sync_entities;

drop policy if exists order_counters_select_member on public.order_counters;
create policy order_counters_select_member on public.order_counters
for select to authenticated using (public.is_workspace_member(workspace_id));

-- Applies last-writer-wins changes. Equal timestamps are resolved deterministically by device ID.
create or replace function public.apply_sync_changes(
  p_workspace_id uuid,
  p_changes jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  applied integer := 0;
  v_profile_id text;
  v_entity_type text;
  v_entity_id text;
  v_device_id text;
  v_modified_at timestamptz;
  v_deleted_at timestamptz;
  v_payload jsonb;
begin
  if auth.uid() is null or coalesce(public.workspace_role(p_workspace_id), '') not in ('admin', 'staff') then
    raise exception 'Not authorized to change this workspace' using errcode = '42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 250 then
    raise exception 'Changes must be an array of at most 250 records';
  end if;
  if octet_length(p_changes::text) > 16777216 then
    raise exception 'Synchronized request is larger than the 16 MB server safety limit';
  end if;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    if coalesce((item->>'workspace_id')::uuid, p_workspace_id) <> p_workspace_id then
      raise exception 'A change targets the wrong workspace';
    end if;
    v_profile_id := item->>'profile_id';
    v_entity_type := item->>'entity_type';
    v_entity_id := item->>'entity_id';
    v_device_id := item->>'device_id';
    v_modified_at := (item->>'modified_at')::timestamptz;
    v_deleted_at := nullif(item->>'deleted_at', '')::timestamptz;
    v_payload := coalesce(item->'payload', '{}'::jsonb);

    if char_length(coalesce(v_profile_id, '')) not between 1 and 160 or position('|' in coalesce(v_profile_id, '')) > 0
       or char_length(coalesce(v_entity_id, '')) not between 1 and 220 or position('|' in coalesce(v_entity_id, '')) > 0
       or char_length(coalesce(v_device_id, '')) not between 1 and 160 or position('|' in coalesce(v_device_id, '')) > 0
       or v_entity_type not in ('profile', 'profile_settings', 'customer', 'parcel_active', 'archive_day', 'label_copy', 'counter_state')
       or v_modified_at is null
       or v_modified_at > now() + interval '10 minutes'
       or (v_deleted_at is not null and v_deleted_at <> v_modified_at)
       or jsonb_typeof(v_payload) <> 'object'
       or octet_length(v_payload::text) > 8388608 then
      raise exception 'Invalid synchronized record';
    end if;

    insert into public.sync_entities (
      workspace_id, profile_id, entity_type, entity_id, payload,
      modified_at, deleted_at, device_id, server_received_at
    ) values (
      p_workspace_id, v_profile_id, v_entity_type, v_entity_id, v_payload,
      v_modified_at, v_deleted_at, v_device_id, now()
    )
    on conflict (workspace_id, profile_id, entity_type, entity_id) do update
      set payload = excluded.payload,
          modified_at = excluded.modified_at,
          deleted_at = excluded.deleted_at,
          device_id = excluded.device_id,
          server_received_at = now()
      where excluded.modified_at > public.sync_entities.modified_at
         or (excluded.modified_at = public.sync_entities.modified_at
             and excluded.device_id > public.sync_entities.device_id);
    applied := applied + 1;
  end loop;
  return applied;
end;
$$;

-- Raises the reservation counter above imported/legacy local order numbers.
create or replace function public.ensure_order_counter_at_least(
  p_workspace_id uuid,
  p_profile_id text,
  p_minimum bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next bigint;
begin
  if auth.uid() is null or coalesce(public.workspace_role(p_workspace_id), '') not in ('admin', 'staff') then
    raise exception 'Not authorized to reserve order numbers' using errcode = '42501';
  end if;
  if char_length(coalesce(p_profile_id, '')) not between 1 and 160
     or position('|' in coalesce(p_profile_id, '')) > 0
     or p_minimum is null or p_minimum not between 0 and 8999999999999750 then
    raise exception 'Invalid counter request';
  end if;
  insert into public.order_counters (workspace_id, profile_id, next_number)
  values (p_workspace_id, p_profile_id, p_minimum + 1)
  on conflict (workspace_id, profile_id) do update
    set next_number = greatest(public.order_counters.next_number, excluded.next_number), updated_at = now()
  returning next_number into v_next;
  return v_next;
end;
$$;

-- Atomically reserves a block so label creation remains synchronous and collision-free.
create or replace function public.reserve_order_numbers(
  p_workspace_id uuid,
  p_profile_id text,
  p_block_size integer default 25
)
returns table (block_start bigint, block_end bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_after bigint;
begin
  if auth.uid() is null or coalesce(public.workspace_role(p_workspace_id), '') not in ('admin', 'staff') then
    raise exception 'Not authorized to reserve order numbers' using errcode = '42501';
  end if;
  if char_length(coalesce(p_profile_id, '')) not between 1 and 160
     or position('|' in coalesce(p_profile_id, '')) > 0
     or p_block_size is null or p_block_size not between 1 and 250 then
    raise exception 'Invalid order-number reservation';
  end if;
  if exists (
    select 1 from public.order_counters
    where workspace_id = p_workspace_id and profile_id = p_profile_id
      and next_number > 8999999999999750
  ) then
    raise exception 'Order-number counter exhausted';
  end if;
  insert into public.order_counters (workspace_id, profile_id, next_number)
  values (p_workspace_id, p_profile_id, 1)
  on conflict (workspace_id, profile_id) do nothing;

  update public.order_counters
  set next_number = next_number + p_block_size, updated_at = now()
  where workspace_id = p_workspace_id and profile_id = p_profile_id
  returning next_number into v_after;

  block_start := v_after - p_block_size;
  block_end := v_after - 1;
  return next;
end;
$$;

revoke all on function public.apply_sync_changes(uuid, jsonb) from public;
revoke all on function public.ensure_order_counter_at_least(uuid, text, bigint) from public;
revoke all on function public.reserve_order_numbers(uuid, text, integer) from public;
grant execute on function public.apply_sync_changes(uuid, jsonb) to authenticated;
grant execute on function public.ensure_order_counter_at_least(uuid, text, bigint) to authenticated;
grant execute on function public.reserve_order_numbers(uuid, text, integer) to authenticated;

-- Explicit grants make reruns repair any broader privileges from an older draft.
revoke all on public.workspaces, public.workspace_members, public.sync_entities, public.order_counters from anon;
revoke insert, update, delete on public.workspaces from authenticated;
revoke insert, update, delete on public.sync_entities from authenticated;
revoke insert, update, delete on public.order_counters from authenticated;
grant select on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select on public.sync_entities to authenticated;
grant select on public.order_counters to authenticated;

-- Supabase Realtime is optional; the app also reconciles every 20 seconds.
do $$
begin
  alter publication supabase_realtime add table public.sync_entities;
exception when duplicate_object then
  null;
end $$;

commit;

-- AFTER RUNNING THIS FILE:
-- 1. In Authentication > Users, create/invite each staff member separately.
-- 2. In SQL Editor, replace the example values and run:
--
--    insert into public.workspaces (name, created_by)
--    values ('YOUR COMPANY', 'OWNER_AUTH_USER_UUID')
--    returning id;
--
--    insert into public.workspace_members (workspace_id, user_id, role)
--    values
--      ('RETURNED_WORKSPACE_UUID', 'OWNER_AUTH_USER_UUID', 'admin'),
--      ('RETURNED_WORKSPACE_UUID', 'SECOND_STAFF_AUTH_USER_UUID', 'staff');
--
-- 3. Put only Project URL and the public anon/publishable key in sync-config.json.
