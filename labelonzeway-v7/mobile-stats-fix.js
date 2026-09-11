(()=>{
'use strict';
function localDay(v){
  if(!v)return'';
  const d=v instanceof Date?v:new Date(v);
  if(Number.isNaN(d.getTime()))return'';
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function todayKey(){return localDay(new Date())}
function manifest(){
  try{return Array.isArray(window.state?.manifest)?window.state.manifest:[]}
  catch(_e){return[]}
}
function labelsToday(){
  const today=todayKey(),seen=new Set();
  manifest().forEach(r=>{
    if(localDay(r?.addedAt)!==today)return;
    const key=String(r?.id||r?.oid||r?.pickId||r?.pickID||'').trim();
    if(key)seen.add(key);else seen.add(JSON.stringify([r?.addedAt,r?.rec?.name,r?.cod,r?.ship]));
  });
  return seen.size;
}
function apply(){
  const el=document.getElementById('stat-count');
  if(el)el.textContent=String(labelsToday());
  const home=document.getElementById('card-home');
  if(home){
    const candidates=[...home.querySelectorAll('b,strong,.value,.metric-value,.ops-stat-value')];
    const lab=candidates.find(n=>/labels?\s*today/i.test((n.parentElement?.textContent||'')));
    if(lab&&/^\d+$/.test((lab.textContent||'').trim()))lab.textContent=String(labelsToday());
  }
}
function wrapRenderStats(){
  const fn=window.renderStats;
  if(typeof fn!=='function'||fn.__mobileTodayFixed)return;
  const wrapped=function(){const out=fn.apply(this,arguments);apply();return out};
  wrapped.__mobileTodayFixed=true;
  window.renderStats=wrapped;
}
function boot(){
  wrapRenderStats();apply();
  document.addEventListener('v7:viewchange',apply);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
  [250,700,1500,3000].forEach(ms=>setTimeout(()=>{wrapRenderStats();apply()},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.LabelOnZeWayLabelsToday=labelsToday;
})();
