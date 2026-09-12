(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
function normalizeStep(){
  if(!matchMedia('(max-width:900px)').matches)return;
  if(document.body.dataset.mobileView!=='label')return;
  const steps=['customer','details','preview'];
  let active=steps.find(s=>document.body.classList.contains('v7-mobile-step-'+s));
  if(!active)active='customer';
  steps.forEach(s=>document.body.classList.toggle('v7-mobile-step-'+s,s===active));
  const labels={customer:'Customer',details:'Label',preview:'Review'};
  $$('#v7-label-stepbar .v7-step[data-step]').forEach((el,i)=>{
    const s=el.dataset.step; const b=$('b',el); const sm=$('small',el);
    if(b&&labels[s])b.textContent=(i+1)+' · '+labels[s];
    if(sm)sm.textContent='';
  });
  const p=$('#card-parcel .card-head h2'); if(p)p.textContent='LABEL DETAILS';
  const r=$('#card-preview .card-head h2'); if(r)r.textContent='REVIEW & PRINT';
}
function install(){
  normalizeStep();
  document.addEventListener('v7:viewchange',e=>{if(e.detail?.view==='label')setTimeout(normalizeStep,0)});
  document.addEventListener('click',e=>{
    const step=e.target.closest?.('#v7-label-stepbar .v7-step[data-step]');
    if(step)setTimeout(normalizeStep,0);
  },true);
  [100,300,700,1400].forEach(ms=>setTimeout(normalizeStep,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
