(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const mobile=()=>matchMedia('(max-width:900px), (orientation:landscape) and (max-height:650px) and (max-width:1200px)').matches;
const landscape=()=>matchMedia('(orientation:landscape)').matches&&mobile();
let scheduled=false;
function force(el,prop,val){if(el)el.style.setProperty(prop,val,'important')}
function labelIsActive(){return $('#v7-label-grid')?.classList.contains('mobile-view-active')||$('#v7-label-stepbar')?.classList.contains('mobile-view-active')}
function enforceLayout(){
  scheduled=false;if(!mobile()||!labelIsActive())return;
  const steps=['customer','details','preview'];
  const active=steps.find(s=>document.body.classList.contains('v7-mobile-step-'+s))||'customer';
  steps.forEach(s=>document.body.classList.toggle('v7-mobile-step-'+s,s===active));
  const hero=$('#v7-label-hero');force(hero,'display','none');force(hero,'visibility','hidden');force(hero,'pointer-events','none');
  const bar=$('#v7-label-stepbar');force(bar,'display','grid');force(bar,'grid-template-columns','repeat(3,minmax(0,1fr))');force(bar,'gap',landscape()?'5px':'6px');force(bar,'margin','0 0 8px');force(bar,'position','sticky');force(bar,'top',landscape()?'52px':'66px');force(bar,'z-index','40');
  const grid=$('#v7-label-grid');force(grid,'display','block');force(grid,'grid-template-columns','1fr');force(grid,'width','100%');force(grid,'max-width','none');force(grid,'margin','0');
  const customer=$('.v7-customer-panel',grid||document),parcel=$('#card-parcel'),preview=$('#card-preview');
  [customer,parcel,preview].forEach(el=>{force(el,'width','100%');force(el,'max-width','none');force(el,'margin','0')});
  const show=(el,on)=>{force(el,'display',on?'block':'none');force(el,'visibility',on?'visible':'hidden');force(el,'pointer-events',on?'auto':'none')};
  show(customer,active==='customer');show(parcel,active==='details');show(preview,active==='preview');
  const labels={customer:'Customer',details:'Label',preview:'Review'};
  $$('#v7-label-stepbar .v7-step[data-step]').forEach((el,i)=>{const s=el.dataset.step,b=$('b',el),sm=$('small',el);if(b&&labels[s])b.textContent=(i+1)+' · '+labels[s];if(sm)sm.textContent='';el.classList.toggle('active',s===active);el.classList.toggle('done',steps.indexOf(s)<steps.indexOf(active))});
  const p=$('#card-parcel .card-head h2');if(p)p.textContent='LABEL DETAILS';const r=$('#card-preview .card-head h2');if(r)r.textContent='REVIEW & PRINT';
  document.documentElement.classList.toggle('label-landscape',landscape());
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enforceLayout)}
function install(){
  schedule();document.addEventListener('v7:viewchange',e=>{if(e.detail?.view==='label')setTimeout(schedule,0)});
  document.addEventListener('click',e=>{if(e.target.closest?.('#v7-label-stepbar .v7-step[data-step],#v7-rail button[data-v7="label"],.v7-new,[data-act="startNewLabel"]'))setTimeout(schedule,0)},true);
  const mo=new MutationObserver(m=>{if(!mobile())return;if(m.some(x=>x.target===document.body||x.target===document.getElementById('v7-label-grid')||x.target===document.getElementById('v7-label-stepbar')||x.target.closest?.('#v7-label-grid,#v7-label-stepbar')))schedule()});
  mo.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','data-mobile-view']});
  const rotate=()=>{setTimeout(schedule,50);setTimeout(schedule,180);setTimeout(schedule,400)};
  window.addEventListener('orientationchange',rotate,{passive:true});window.addEventListener('resize',rotate,{passive:true});window.visualViewport?.addEventListener('resize',rotate,{passive:true});
  [50,150,350,700,1200,2200,4000].forEach(ms=>setTimeout(schedule,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.LabelOnZeWayEnforceMobileLabel=enforceLayout;
})();