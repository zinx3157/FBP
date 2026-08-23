import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const pagesOrigin='https://zinx3157.github.io';
const allowed=new Set([pagesOrigin,'http://127.0.0.1:8765','http://localhost:8765','http://192.168.100.14:8765',...(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean)]);
const headers=(origin:string|null)=>{const h:Record<string,string>={'Content-Type':'application/json','Vary':'Origin'};if(origin&&allowed.has(origin)){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Headers']='authorization, content-type';h['Access-Control-Allow-Methods']='POST, OPTIONS'}return h};
const json=(body:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});

Deno.serve(async req=>{const origin=req.headers.get('origin');if(origin&&!allowed.has(origin))return json({error:'origin_not_allowed'},403,origin);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});if(req.method!=='POST')return json({error:'method_not_allowed'},405,origin);
 const bearer=req.headers.get('authorization');if(!bearer?.startsWith('Bearer '))return json({error:'authentication_required'},401,origin);
 let body:Record<string,unknown>;try{body=await req.json()}catch{return json({error:'invalid_json'},400,origin)}
 const workspace_id=String(body.workspace_id||''),profile_id=String(body.profile_id||''),parcel_id=String(body.parcel_id||''),order_number=String(body.order_number||''),status=String(body.status||'');
 if(!workspace_id||!profile_id||!parcel_id||!order_number||!['ready','in_transit','delivered','exception'].includes(status))return json({error:'invalid_share_request'},400,origin);
 const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'';if(!url||!anon)return json({error:'server_configuration_error'},500,origin);
 const client=createClient(url,anon,{global:{headers:{Authorization:bearer}}});const{data:{user},error:userError}=await client.auth.getUser();if(userError||!user)return json({error:'authentication_required'},401,origin);
 const{data,error}=await client.rpc('generate_parcel_tracking_token',{p_workspace_id:workspace_id,p_profile_id:profile_id,p_parcel_id:parcel_id,p_order_number:order_number,p_status:status});
 if(error){const message=String(error.message||'');if(/authorized|permission|role/i.test(message))return json({error:'forbidden'},403,origin);if(/not found/i.test(message))return json({error:'parcel_not_found'},404,origin);return json({error:'share_generation_failed'},500,origin)}
 const row=Array.isArray(data)?data[0]:data;if(!row?.token||!row?.expires_at)return json({error:'share_generation_failed'},500,origin);
 const publicUrl=`${pagesOrigin}/FBP/labelonzeway-beta3/tracking/?token=${encodeURIComponent(row.token)}`;return json({url:publicUrl,expires_at:row.expires_at,token:row.token},200,origin);
});
