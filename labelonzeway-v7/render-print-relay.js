(()=>{
'use strict';
const BASE='https://labelonzeway-cloud-print.onrender.com';
const HEALTH=BASE+'/health';
const DIAG=BASE+'/diagnostics';
let lastHealth=null,lastDiagnostics=null,lastCheckedAt='',refreshTimer=null;
function timeoutFetch(url,ms=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(url,{cache:'no-store',signal:c.signal,headers:{Accept:'application/json'}}).then(async r=>{const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch(_e){data={raw:text}}if(!r.ok){const e=new Error((data&&data.error)||('HTTP '+r.status));e.status=r.status;e.data=data;throw e}return data}).finally(()=>clearTimeout(t))}
async function health(){try{const data=await timeoutFetch(HEALTH,12000);lastHealth=data;lastCheckedAt=new Date().toISOString();return data}catch(e){lastHealth={status:'offline',error:String(e.message||e)};lastCheckedAt=new Date().toISOString();throw e}}
async function diagnostics(){try{const data=await timeoutFetch(DIAG,12000);lastDiagnostics=data;return data}catch(e){lastDiagnostics={status:'offline',tcp_reachable:false,error:String(e.message||e)};throw e}}
function snapshot(){return{baseUrl:BASE,health:lastHealth,diagnostics:lastDiagnostics,lastCheckedAt}}
function relayReady(data){return !!(data&&data.status==='ok'&&data.supabase_authenticated===true)}
function updateShell(data){const sync=document.querySelector('#v7-shell .v7-sync,.v7-sync');if(!sync)return;sync.dataset.renderRelay=relayReady(data)?'ready':'degraded';const current=String(sync.getAttribute('title')||'').replace(/\s*·?\s*Render print relay (online|unavailable)$/,'');const suffix=relayReady(data)?'Render print relay online':'Render print relay unavailable';sync.setAttribute('title',(current?current+' · ':'')+suffix)}
async function refresh(){try{const d=await health();updateShell(d);document.dispatchEvent(new CustomEvent('v7:renderrelay',{detail:{ok:relayReady(d),health:d}}));return d}catch(e){updateShell(lastHealth);document.dispatchEvent(new CustomEvent('v7:renderrelay',{detail:{ok:false,health:lastHealth,error:String(e.message||e)}}));return lastHealth}}
function bindCloud(){const cloud=window.LabelOnZeWayCloud;if(!cloud||cloud.__renderRelayBound)return false;cloud.__renderRelayBound=true;cloud.renderRelay={baseUrl:BASE,health,diagnostics,refresh,getStatus:snapshot,isReady:()=>relayReady(lastHealth)};
  const original=typeof cloud.enqueueCloudPrintJob==='function'?cloud.enqueueCloudPrintJob.bind(cloud):null;
  if(original){cloud.enqueueCloudPrintJob=function(job){return health().catch(()=>lastHealth).then(h=>{if(h&&h.status==='offline')throw new Error('Render Cloud Print relay is offline');return original(job)}).then(result=>Object.assign({},result,{transport:'render-relay'}))}}
  return true}
function startRefreshLoop(){if(refreshTimer)return;refresh();refreshTimer=setInterval(refresh,60000)}
function scheduleRefresh(){const start=()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>{if('requestIdleCallback' in window)requestIdleCallback(startRefreshLoop,{timeout:2200});else setTimeout(startRefreshLoop,1500)}))};if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true})}
function install(){bindCloud();scheduleRefresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[700,1600,3200].forEach(ms=>setTimeout(()=>{bindCloud()},ms));
window.LabelOnZeWayRenderRelay={baseUrl:BASE,health,diagnostics,refresh,getStatus:snapshot,isReady:()=>relayReady(lastHealth)};
})();
