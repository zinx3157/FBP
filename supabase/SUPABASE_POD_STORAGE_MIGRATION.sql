-- LabelOnZeWay private Proof of Delivery storage
-- Run once in Supabase SQL Editor for the same project used by labelonzeway/sync-config.json.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'labelonzeway-pod',
  'labelonzeway-pod',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are always:
--   <workspace_uuid>/<profile_sync_id>/<parcel_id>/<timestamp>-<filename>
-- The first folder therefore determines workspace access.

drop policy if exists labelonzeway_pod_select on storage.objects;
create policy labelonzeway_pod_select on storage.objects
for select to authenticated
using (
  bucket_id = 'labelonzeway-pod'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists labelonzeway_pod_insert on storage.objects;
create policy labelonzeway_pod_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'labelonzeway-pod'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('admin','staff')
);

drop policy if exists labelonzeway_pod_update on storage.objects;
create policy labelonzeway_pod_update on storage.objects
for update to authenticated
using (
  bucket_id = 'labelonzeway-pod'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('admin','staff')
)
with check (
  bucket_id = 'labelonzeway-pod'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('admin','staff')
);

drop policy if exists labelonzeway_pod_delete on storage.objects;
create policy labelonzeway_pod_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'labelonzeway-pod'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.workspace_role(((storage.foldername(name))[1])::uuid) in ('admin','staff')
);

commit;
