import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20260823120000_beta3_tracking_tokens.sql',import.meta.url),'utf8');
const legacy=await readFile(new URL('../supabase/beta3_tracking_migration.sql',import.meta.url),'utf8');
const aclFix=await readFile(new URL('../supabase/migrations/20260823140000_beta3_tracking_acl_fix.sql',import.meta.url),'utf8');
const signatureFromCreate=({name,parameters})=>`${name}(${parameters.split(',').map(parameter=>parameter.trim().split(/\s+/).at(-1)).join(',')})`;
const created=[...sql.matchAll(/create or replace function public\.(?<name>\w+)\((?<parameters>[^)]*)\)/g)].map(({groups})=>signatureFromCreate(groups));
const expectedSignatures=[
  'upsert_parcel_tracking_projection(uuid,text,text,text,text)',
  'generate_parcel_tracking_token(uuid,text,text,text,text)',
  'revoke_parcel_tracking_token(uuid,text,text)',
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
assert.deepEqual(created,expectedSignatures,'CREATE FUNCTION signatures must have the intended arity and types');
const staffSignatures=expectedSignatures.slice(0,3);
const publicLookup=expectedSignatures.at(-1);
const expectedGrantRoles=new Map([
  ...staffSignatures.map(signature=>[signature,'authenticated']),
  [publicLookup,'anon,authenticated'],
]);
const auditAcl=(source,label)=>{
  const revocations=[...source.matchAll(/revoke all on function public\.(\w+\([^)]*\)) from ([^;]+);/g)].map(match=>({signature:match[1],roles:match[2].replaceAll(' ', '')}));
  const grants=[...source.matchAll(/grant execute on function public\.(\w+\([^)]*\)) to ([^;]+);/g)].map(match=>({signature:match[1],roles:match[2].replaceAll(' ', '')}));
  assert.deepEqual(revocations.map(revocation=>revocation.signature),created,`${label}: every REVOKE signature must match CREATE FUNCTION`);
  assert.deepEqual(grants.map(grant=>grant.signature),created,`${label}: every GRANT signature must match CREATE FUNCTION`);
  assert.deepEqual(revocations.map(revocation=>revocation.roles),Array(4).fill('public,anon,authenticated,service_role'),`${label}: revoke all pre-granted client roles`);
  assert.deepEqual(grants.map(grant=>grant.roles),created.map(signature=>expectedGrantRoles.get(signature)),`${label}: restore only intended execution grants`);
  for(const grant of grants.filter(grant=>staffSignatures.includes(grant.signature))){
    assert.equal(grant.roles,'authenticated',`${label}: anon and service_role must not receive staff-function grants`);
  }
  assert.equal(grants.find(grant=>grant.signature===publicLookup)?.roles,'anon,authenticated',`${label}: only public lookup is client-public`);
};
auditAcl(sql,'original migration');
auditAcl(aclFix,'corrective ACL migration');
assert(!/\b(?:create|drop|alter|update|insert|delete|truncate)\b/i.test(aclFix),'corrective ACL migration must only change function privileges');
const publicTracking=sql.match(/create or replace function public\.public_parcel_tracking[\s\S]*?\$\$;/)?.[0]||'';
assert(!/phone|address|cod|notes|profile data/i.test(publicTracking.replace(/order_number|status|updated_at|link_state/gi,'')),'public projection leaks private column');
console.log('tracking migration static audit passed');
