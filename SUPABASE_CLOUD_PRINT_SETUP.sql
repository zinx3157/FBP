-- LabelOnZeWay V2.0.1 Cloud Print safety migration (idempotent).
create extension if not exists pgcrypto;
create table if not exists public.cloud_print_jobs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 profile_id text not null, created_by uuid not null references auth.users(id) on delete cascade, source_device text not null default '',
 printer_ip text not null default '192.168.100.73', printer_port integer not null default 9100 check(printer_port between 1 and 65535),
 label_count integer not null default 1 check(label_count between 1 and 100), payload_base64 text not null check(length(payload_base64) between 1 and 12582912),
 status text not null default 'queued', claimed_by uuid references auth.users(id), claimed_at timestamptz, sent_at timestamptz,
 printed_at timestamptz, error_message text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.cloud_print_jobs add column if not exists idempotency_key text;
alter table public.cloud_print_jobs add column if not exists sent_at timestamptz;
update public.cloud_print_jobs set idempotency_key=id::text where idempotency_key is null;
alter table public.cloud_print_jobs alter column idempotency_key set not null;
alter table public.cloud_print_jobs drop constraint if exists cloud_print_jobs_status_check;
alter table public.cloud_print_jobs add constraint cloud_print_jobs_status_check check(status in('queued','printing','sending','printed','uncertain','failed','cancelled'));
create unique index if not exists cloud_print_jobs_idempotency_idx on public.cloud_print_jobs(workspace_id,idempotency_key);
create index if not exists cloud_print_jobs_queue_idx on public.cloud_print_jobs(workspace_id,status,created_at);
alter table public.cloud_print_jobs enable row level security;
drop policy if exists "workspace members read print jobs" on public.cloud_print_jobs;
create policy "workspace members read print jobs" on public.cloud_print_jobs for select to authenticated using(
 (created_by=auth.uid() or claimed_by=auth.uid()) and
 exists(select 1 from public.workspace_members m where m.workspace_id=cloud_print_jobs.workspace_id and m.user_id=auth.uid()));
drop policy if exists "workspace members create print jobs" on public.cloud_print_jobs;
create policy "workspace members create print jobs" on public.cloud_print_jobs for insert to authenticated with check(
 created_by=auth.uid() and status='queued' and exists(select 1 from public.workspace_members m where m.workspace_id=cloud_print_jobs.workspace_id and m.user_id=auth.uid()));
drop policy if exists "workspace members update print jobs" on public.cloud_print_jobs;
revoke update on public.cloud_print_jobs from authenticated;
grant select,insert on public.cloud_print_jobs to authenticated;

create or replace function public.claim_cloud_print_job(p_workspace_id uuid) returns setof public.cloud_print_jobs
language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=auth.uid()) then raise exception 'Not authorized'; end if;
 select id into v_id from public.cloud_print_jobs where workspace_id=p_workspace_id and status='queued' order by created_at for update skip locked limit 1;
 if v_id is null then return; end if;
 return query update public.cloud_print_jobs set status='printing',claimed_by=auth.uid(),claimed_at=now(),updated_at=now(),error_message='' where id=v_id returning *;
end $$;
create or replace function public.mark_cloud_print_sending(p_job_id uuid) returns void
language plpgsql security definer set search_path=public as $$ begin
 update public.cloud_print_jobs set status='sending',sent_at=now(),updated_at=now() where id=p_job_id and status='printing' and claimed_by=auth.uid();
 if not found then raise exception 'Print job is not claimed by this agent'; end if; end $$;
create or replace function public.complete_cloud_print_job(p_job_id uuid,p_error text default '') returns void
language plpgsql security definer set search_path=public as $$ begin
 update public.cloud_print_jobs set status='printed',printed_at=now(),updated_at=now(),error_message=left(coalesce(p_error,''),1000),payload_base64='PURGED'
 where id=p_job_id and status='sending' and claimed_by=auth.uid(); if not found then raise exception 'Print job cannot be completed'; end if; end $$;
create or replace function public.fail_cloud_print_job(p_job_id uuid,p_error text) returns void
language plpgsql security definer set search_path=public as $$ begin
 update public.cloud_print_jobs set status=case when status='sending' then 'uncertain' else 'failed' end,updated_at=now(),error_message=left(coalesce(p_error,'Unknown error'),1000)
 where id=p_job_id and status in('printing','sending') and claimed_by=auth.uid(); end $$;
create or replace function public.requeue_stale_cloud_print_jobs(p_workspace_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare v_count integer; begin
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=auth.uid()) then raise exception 'Not authorized'; end if;
 update public.cloud_print_jobs set status='queued',claimed_by=null,claimed_at=null,updated_at=now(),error_message='Recovered before printer transmission'
 where workspace_id=p_workspace_id and status='printing' and claimed_at<now()-interval '5 minutes'; get diagnostics v_count=row_count;
 update public.cloud_print_jobs set status='uncertain',updated_at=now(),error_message='Transmission may have occurred; operator review required'
 where workspace_id=p_workspace_id and status='sending' and sent_at<now()-interval '5 minutes'; return v_count; end $$;
create or replace function public.purge_old_cloud_print_jobs(p_workspace_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare v_count integer; begin
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=auth.uid()) then raise exception 'Not authorized'; end if;
 update public.cloud_print_jobs set payload_base64='PURGED',updated_at=now() where workspace_id=p_workspace_id and status in('printed','failed','cancelled')
 and created_at<now()-interval '24 hours' and payload_base64<>'PURGED'; get diagnostics v_count=row_count; return v_count; end $$;
grant execute on function public.claim_cloud_print_job(uuid) to authenticated;
grant execute on function public.mark_cloud_print_sending(uuid) to authenticated;
grant execute on function public.complete_cloud_print_job(uuid,text) to authenticated;
grant execute on function public.fail_cloud_print_job(uuid,text) to authenticated;
grant execute on function public.requeue_stale_cloud_print_jobs(uuid) to authenticated;
grant execute on function public.purge_old_cloud_print_jobs(uuid) to authenticated;
