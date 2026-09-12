(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const mobile=()=>matchMedia('(max-width:900px), (orientation:landscape) and (max-height:650px) and (max-width:1200px)').matches;
const landscape=()=>matchMedia('(orientation:landscape)').matches&&mobile();
let scheduled=false;
let currentView='';
let savedStep='customer';
let rotationLabelLockUntil=0;
function force(el,prop,val){if(el)el.style.setProperty(prop,val,'important')}
function bodyStep(){
  return ['customer','details','preview'].find(s=>document.body.classList.contains('v7-mobile-step-'+s))||savedStep||'customer';
}
function labelIsActive(){
  const raw=document.body.dataset.mobileView;
  return currentView==='label'||raw==='label'||raw==='new'||
    $('#v7-label-grid')?.classList.contains('mobile-view-active')||
    $('#v7-label-grid')?.classList.contains('v7-active')||
    $('#v7-label-stepbar')?.classList.contains('mobile-view-active')||
    $('#v7-label-stepbar')?.classList.contains('v7-active')||
    $('#v7-rail button[data-v7="label"]')?.classList.contains('active');
}
function rotationRestoreActive(){return Date.now()<rotationLabelLockUntil}
function markActive(el){if(el)el.classList.add('mobile-view-active','v7-active')}
function restoreLabelIdentity(){
  if(!mobile())return;
  document.body.dataset.mobileView='new';
  const grid=$('#v7-label-grid'),bar=$('#v7-label-stepbar');
  markActive(grid);markActive(bar);
  $$('#v7-rail button[data-v7],.v7-nav button[data-v7]').forEach(btn=>btn.classList.toggle('active',btn.dataset.v7==='label'));
}
function enforceLayout(){
  scheduled=false;
  const shouldRestore=rotationRestoreActive();
  if(!mobile()||(!labelIsActive()&&!shouldRestore))return;
  if(shouldRestore)restoreLabelIdentity();
  const steps=['customer','details','preview'];
  const active=bodyStep();savedStep=active;
  steps.forEach(s=>document.body.classList.toggle('v7-mobile-step-'+s,s===active));
  const hero=$('#v7-label-hero');if(hero)hero.classList.add('v7-active');force(hero,'display','none');force(hero,'visibility','hidden');force(hero,'pointer-events','none');
  const bar=$('#v7-label-stepbar');markActive(bar);force(bar,'display','grid');force(bar,'visibility','visible');force(bar,'pointer-events','auto');force(bar,'grid-template-columns','repeat(3,minmax(0,1fr))');force(bar,'gap',landscape()?'5px':'6px');force(bar,'margin','0 0 8px');force(bar,'position','sticky');force(bar,'top',landscape()?'52px':'66px');force(bar,'z-index','40');
  const grid=$('#v7-label-grid');markActive(grid);force(grid,'display','block');force(grid,'visibility','visible');force(grid,'pointer-events','auto');force(grid,'grid-template-columns','1fr');force(grid,'width','100%');force(grid,'max-width','none');force(grid,'margin','0');
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
function beginRotationRestore(){
  if(currentView==='label'||labelIsActive()){
    savedStep=bodyStep();
    rotationLabelLockUntil=Date.now()+900;
    [0,40,90,150,210,280,400,650,850].forEach(ms=>setTimeout(()=>{if(rotationRestoreActive())enforceLayout()},ms));
  }
}
function install(){
  currentView=(document.body.dataset.mobileView==='new'?'label':document.body.dataset.mobileView)||'';
  savedStep=bodyStep();schedule();
  document.addEventListener('v7:viewchange',e=>{
    const view=e.detail?.view||'';currentView=view;
    if(view==='label'){
      savedStep=bodyStep();rotationLabelLockUntil=Date.now()+300;setTimeout(schedule,0);
    }else if(view){rotationLabelLockUntil=0;}
  });
  document.addEventListener('v7:stepchange',()=>{savedStep=bodyStep();schedule()});
  document.addEventListener('click',e=>{if(e.target.closest?.('#v7-label-stepbar .v7-step[data-step],#v7-rail button[data-v7="label"],.v7-new,[data-act="startNewLabel"]'))setTimeout(schedule,0)},true);
  const bodyObserver=new MutationObserver(()=>{if(labelIsActive())savedStep=bodyStep();schedule()});bodyObserver.observe(document.body,{attributes:true,attributeFilter:['data-mobile-view','class']});
  const rootObserver=new MutationObserver(schedule);['v7-label-grid','v7-label-stepbar'].forEach(id=>{const el=$('#'+id);if(el)rootObserver.observe(el,{attributes:true,attributeFilter:['class','style']})});
  window.addEventListener('orientationchange',beginRotationRestore,{passive:true});
  window.addEventListener('resize',beginRotationRestore,{passive:true});
  window.visualViewport?.addEventListener('resize',beginRotationRestore,{passive:true});
  [50,150,350,700,1200,2200,4000].forEach(ms=>setTimeout(schedule,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.LabelOnZeWayEnforceMobileLabel=enforceLayout;
})();