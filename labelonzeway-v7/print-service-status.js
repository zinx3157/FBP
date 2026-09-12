(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q);
let timer=null, diagTimer=null, lastDiag=null, lastHealth=null;
const state={network:navigator.onLine,configured:false,signedIn:false,workspace:false,queue:false,relay:false,printer:false,userEmail:'',workspaceName:'',printerTarget:'',lastChecked:''};
function cloudStatus(){try{return window.LabelOnZeWayCloud?.getStatus?.()||{}}catch(_e){return{}}}
function relayApi(){return window.LabelOnZeWayRenderRelay||window.LabelOnZeWayCloud?.renderRelay||null}
function bool(v){return v===true}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function row(label,ok,detail){return `<div class="v7-print-status-row ${ok?'ok':'bad'}"><span class="dot" aria-hidden="true"></span><div><b>${esc(label)}</b><small>${esc(detail||'')}</small></div><strong>${ok?'ONLINE':'CHECK'}</strong></div>`}
function ensurePanel(){
  let panel=$('#v7-print-service-status');if(panel)return panel;
  panel=document.createElement('section');panel.id='v7-print-service-status';panel.className='v7-print-service-status';
  panel.innerHTML='<div class="v7-print-status-head"><div><small>PRINT SERVICES</small><h3>Cloud Print Readiness</h3></div><button type="button" id="v7-print-status-refresh">REFRESH</button></div><div id="v7-print-status-summary"></div><div id="v7-print-status-rows"></div><p class="v7-print-status-foot">Checks the services required before a cloud print job can reach the printer.</p>';
  const host=$('#card-more .card-body,#card-more')||$('#app')||document.body;
  host.appendChild(panel);
  $('#v7-print-status-refresh',panel)?.addEventListener('click',()=>refresh(true));
  return panel;
}
function overall(){return state.network&&state.configured&&state.signedIn&&state.workspace&&state.queue&&state.relay&&state.printer}
function render(){
  const panel=ensurePanel();
  const summary=$('#v7-print-status-summary',panel),rows=$('#v7-print-status-rows',panel);
  const ready=overall();
  summary.className='v7-print-status-summary '+(ready?'ready':'not-ready');
  summary.innerHTML=`<b>${ready?'PRINT READY':'PRINT NOT READY'}</b><span>${ready?'All required services are online and authenticated.':'One or more required services need attention.'}</span>`;
  rows.innerHTML=[
    row('Device network',state.network,state.network?'Internet connection available':'Device appears offline'),
    row('Supabase configuration',state.configured,state.configured?'Cloud endpoint configured':'Cloud configuration missing'),
    row('Supabase login',state.signedIn,state.signedIn?(state.userEmail||'Authenticated session active'):'Not signed in'),
    row('Company workspace',state.workspace,state.workspace?(state.workspaceName||'Authorized workspace selected'):'No authorized workspace'),
    row('Cloud print queue',state.queue,state.queue?'Queue API available':'Queue API unavailable'),
    row('Render print relay',state.relay,state.relay?'Relay online and authenticated':'Relay offline or not authenticated'),
    row('Printer endpoint',state.printer,state.printer?(state.printerTarget||'TCP endpoint reachable'):(state.printerTarget?state.printerTarget+' unreachable':'Printer reachability not confirmed'))
  ].join('');
  panel.dataset.printReady=ready?'1':'0';
  const sync=$('.v7-sync');if(sync){sync.dataset.printReady=ready?'1':'0';sync.setAttribute('aria-label',ready?'Print services ready':'Print services need attention')}
  document.dispatchEvent(new CustomEvent('v7:printstatus',{detail:{...state,ready}}));
}
function updateLocal(){
  const c=cloudStatus();
  state.network=navigator.onLine;
  state.configured=bool(c.configured);
  state.signedIn=bool(c.signedIn);
  state.workspace=!!c.workspaceId;
  state.userEmail=String(c.userEmail||'');
  state.workspaceName=String(c.workspaceName||'');
  state.queue=typeof window.LabelOnZeWayCloud?.enqueueCloudPrintJob==='function'&&state.signedIn&&state.workspace;
  if(lastHealth)state.relay=lastHealth.status==='ok'&&lastHealth.supabase_authenticated===true;
  if(lastDiag){
    state.printer=lastDiag.tcp_reachable===true;
    const h=lastDiag.printer_host||lastDiag.target_host||'',p=lastDiag.printer_port||lastDiag.target_port||'';
    state.printerTarget=h?(String(h)+(p?':'+String(p):'')):state.printerTarget;
  }
  state.lastChecked=new Date().toISOString();render();
}
async function refresh(forceDiag=false){
  updateLocal();
  const r=relayApi();
  if(r?.health){try{lastHealth=await r.health()}catch(_e){lastHealth={status:'offline',supabase_authenticated:false}}}
  updateLocal();
  const due=forceDiag||!lastDiag||!diagTimer;
  if(due&&r?.diagnostics){try{lastDiag=await r.diagnostics()}catch(_e){lastDiag={status:'offline',tcp_reachable:false}};updateLocal()}
}
function start(){
  ensurePanel();updateLocal();refresh(false);
  if(!timer)timer=setInterval(()=>refresh(false),30000);
  if(!diagTimer)diagTimer=setInterval(async()=>{const r=relayApi();if(!r?.diagnostics)return;try{lastDiag=await r.diagnostics()}catch(_e){lastDiag={status:'offline',tcp_reachable:false}};updateLocal()},60000);
}
window.addEventListener('online',()=>{state.network=true;refresh(false)});
window.addEventListener('offline',()=>{state.network=false;updateLocal()});
document.addEventListener('v7:cloudready',()=>refresh(true));
document.addEventListener('v7:renderrelay',e=>{lastHealth=e.detail?.health||lastHealth;updateLocal()});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-v7="more"],[data-act="openSettings"],#top-settings-btn'))setTimeout(()=>{ensurePanel();refresh(true)},80)},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.LabelOnZeWayPrintServices={refresh:()=>refresh(true),getStatus:()=>({...state,ready:overall(),health:lastHealth,diagnostics:lastDiag})};
})();