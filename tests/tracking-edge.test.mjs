import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const edge=await readFile(new URL('../supabase/functions/create-label-share/index.ts',import.meta.url),'utf8');
const adapter=await readFile(new URL('../app/tracking-adapter.js',import.meta.url),'utf8');
for(const s of['req.method!==\'POST\'','invalid_json','authentication_required','invalid_share_request','forbidden','parcel_not_found','${pagesOrigin}/FBP/labelonzeway-beta3/tracking/?token=','expires_at','Access-Control-Allow-Origin','SUPABASE_ANON_KEY','http://127.0.0.1:8765','http://localhost:8765','http://192.168.100.14:8765','origin_not_allowed','ALLOWED_ORIGINS','Vary\':\'Origin','status:204','POST, OPTIONS','https://zinx3157.github.io'])assert(edge.includes(s),`edge missing ${s}`);
const allowHeaders=edge.match(/Access-Control-Allow-Headers'\]\s*=\s*'([^']+)'/)?.[1];
assert(allowHeaders,'missing Access-Control-Allow-Headers');
const preflightHeaders=new Set(allowHeaders.split(',').map(header=>header.trim().toLowerCase()));
for(const header of['authorization','apikey','content-type','x-client-info'])assert(preflightHeaders.has(header),`Supabase JS browser preflight header not allowed: ${header}`);
assert(!/Access-Control-Allow-Origin'\]\s*=\s*['"]\*/.test(edge),'production CORS origin must not be wildcarded');
assert(!/service[_-]?role/i.test(edge),'edge must not use service role');
for(const s of['Sign in to create a secure tracking link','public_parcel_tracking','expires_at','LabelOnZeWayBetaTracking','revoked','expired'])assert(adapter.includes(s),`adapter missing ${s}`);
console.log('tracking edge/adapter static tests passed');
