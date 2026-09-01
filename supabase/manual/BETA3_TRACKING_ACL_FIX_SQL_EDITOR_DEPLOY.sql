begin;

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);

-- BEGIN corrective ACL migration body
revoke all on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function public.generate_parcel_tracking_token(uuid,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function public.revoke_parcel_tracking_token(uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function public.public_parcel_tracking(uuid) from public, anon, authenticated, service_role;
grant execute on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) to authenticated;
grant execute on function public.generate_parcel_tracking_token(uuid,text,text,text,text) to authenticated;
grant execute on function public.revoke_parcel_tracking_token(uuid,text,text) to authenticated;
grant execute on function public.public_parcel_tracking(uuid) to anon,authenticated;
-- END corrective ACL migration body

insert into supabase_migrations.schema_migrations(version, statements, name)
values (
  '20260823140000',
  array['Applied through Supabase SQL Editor']::text[],
  'beta3_tracking_acl_fix'
)
on conflict (version) do nothing;

commit;

-- Read-only privilege verification
with tracking_functions(signature, access_scope) as (
  values
    ('public.upsert_parcel_tracking_projection(uuid,text,text,text,text)', 'staff_only'),
    ('public.generate_parcel_tracking_token(uuid,text,text,text,text)', 'staff_only'),
    ('public.revoke_parcel_tracking_token(uuid,text,text)', 'staff_only'),
    ('public.public_parcel_tracking(uuid)', 'public_lookup')
), client_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
)
select f.signature, f.access_scope, r.role_name,
  has_function_privilege(r.role_name, f.signature, 'EXECUTE') as can_execute
from tracking_functions f
cross join client_roles r
order by f.signature, r.role_name;

select version, name
from supabase_migrations.schema_migrations
where version = '20260823140000';
