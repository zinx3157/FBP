-- LabelOnZeWay v153 Cloud Print queue
-- Run once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.cloud_print_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  source_device text not null default '',
  printer_ip text not null default '192.168.100.73',
  printer_port integer not null default 9100 check (printer_port between 1 and 65535),
  label_count integer not null default 1 check (label_count between 1 and 100),
  payload_base64 text not null check (length(payload_base64) between 1 and 12582912),
  status text not null default 'queued' check (status in ('queued','printing','printed','failed','cancelled')),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  printed_at timestamptz,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cloud_print_jobs_queue_idx
  on public.cloud_print_jobs (workspace_id, status, created_at);

alter table public.cloud_print_jobs enable row level security;

drop policy if exists "workspace members read print jobs" on public.cloud_print_jobs;
create policy "workspace members read print jobs" on public.cloud_print_jobs
for select to authenticated using (
  exists (select 1 from public.workspace_members m
          where m.workspace_id = cloud_print_jobs.workspace_id and m.user_id = auth.uid())
);

drop policy if exists "workspace members create print jobs" on public.cloud_print_jobs;
create policy "workspace members create print jobs" on public.cloud_print_jobs
for insert to authenticated with check (
  created_by = auth.uid() and
  exists (select 1 from public.workspace_members m
          where m.workspace_id = cloud_print_jobs.workspace_id and m.user_id = auth.uid())
);

drop policy if exists "workspace members update print jobs" on public.cloud_print_jobs;
create policy "workspace members update print jobs" on public.cloud_print_jobs
for update to authenticated using (
  exists (select 1 from public.workspace_members m
          where m.workspace_id = cloud_print_jobs.workspace_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.workspace_members m
          where m.workspace_id = cloud_print_jobs.workspace_id and m.user_id = auth.uid())
);

create or replace function public.claim_cloud_print_job(p_workspace_id uuid)
returns setof public.cloud_print_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.workspace_members
                 where workspace_id = p_workspace_id and user_id = auth.uid()) then
    raise exception 'Not authorized for this workspace';
  end if;

  select id into v_id from public.cloud_print_jobs
  where workspace_id = p_workspace_id and status = 'queued'
  order by created_at
  for update skip locked limit 1;

  if v_id is null then return; end if;

  return query
  update public.cloud_print_jobs
     set status='printing', claimed_by=auth.uid(), claimed_at=now(), updated_at=now(), error_message=''
   where id=v_id
   returning *;
end;
$$;

grant execute on function public.claim_cloud_print_job(uuid) to authenticated;
grant select, insert, update on public.cloud_print_jobs to authenticated;

-- Requeue a job if the Mac stopped after claiming it and before printing it.
create or replace function public.requeue_stale_cloud_print_jobs(p_workspace_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare v_count integer;
begin
  if not exists (select 1 from public.workspace_members
                 where workspace_id = p_workspace_id and user_id = auth.uid()) then
    raise exception 'Not authorized for this workspace';
  end if;
  update public.cloud_print_jobs
     set status='queued', claimed_by=null, claimed_at=null, updated_at=now(),
         error_message='Recovered after the print agent stopped'
   where workspace_id=p_workspace_id and status='printing' and claimed_at < now() - interval '5 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.requeue_stale_cloud_print_jobs(uuid) to authenticated;
