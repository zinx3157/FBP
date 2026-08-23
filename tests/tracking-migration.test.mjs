import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20260823120000_beta3_tracking_tokens.sql',import.meta.url),'utf8');
const legacy=await readFile(new URL('../supabase/beta3_tracking_migration.sql',import.meta.url),'utf8');
const functions=[
  'upsert_parcel_tracking_projection(uuid,text,text,text,text)',
  'generate_parcel_tracking_token(uuid,text,text,text,text)',
  'revoke_parcel_tracking_token(uuid,text,text,text)',
  'public_parcel_tracking(uuid)',
];
assert.equal(legacy,sql,'legacy tracking SQL must remain byte-identical documentation');
assert.equal((sql.match(/security definer set search_path=''/g)||[]).length,4,'all SECURITY DEFINER functions must use an empty search path');
assert(!/security definer set search_path=public/i.test(sql),'SECURITY DEFINER functions must not search public implicitly');
for(const text of[
  "expires_at timestamptz not null default (now() + interval '7 days')",
  'expires_at>now()',
  'revoked_at is null',
  'parcel_tracking_tokens_expiry_idx',
  'where token=p_token',
  'coalesce(public.workspace_role(p_workspace_id)',
  'insert into public.parcel_tracking_projection(',
  'delete from public.parcel_tracking_tokens',
  'insert into public.parcel_tracking_tokens(',
  'returning public.parcel_tracking_tokens.token,public.parcel_tracking_tokens.expires_at',
  'update public.parcel_tracking_tokens',
  'from public.parcel_tracking_tokens where token=p_token',
  'join public.parcel_tracking_projection p',
  'perform public.upsert_parcel_tracking_projection(',
])assert(sql.includes(text),`missing fully qualified or required reference: ${text}`);
for(const signature of functions)assert(sql.includes(`revoke all on function public.${signature} from public;`),`missing PUBLIC revocation for ${signature}`);
assert.deepEqual(sql.match(/grant [^;]+;/g),[
  'grant execute on function public.upsert_parcel_tracking_projection(uuid,text,text,text,text) to authenticated;',
  'grant execute on function public.generate_parcel_tracking_token(uuid,text,text,text,text) to authenticated;',
  'grant execute on function public.revoke_parcel_tracking_token(uuid,text,text,text) to authenticated;',
  'grant execute on function public.public_parcel_tracking(uuid) to anon,authenticated;',
],'only intended function grants are allowed');
assert(!/service[_-]?role/i.test(sql),'migration must not use a service-role key');
const publicTracking=sql.match(/create or replace function public\.public_parcel_tracking[\s\S]*?\$\$;/)?.[0]||'';
assert(!/phone|address|cod|notes|profile data/i.test(publicTracking.replace(/order_number|status|updated_at|link_state/gi,'')),'public projection leaks private column');
console.log('tracking migration static audit passed');
