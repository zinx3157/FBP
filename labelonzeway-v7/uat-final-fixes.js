(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q);
const $$=(q,r=document)=>[...r.querySelectorAll(q)];
const mobile=()=>matchMedia('(max-width:900px), (orientation:landscape) and (max-height:650px) and (max-width:1200px)').matches;

function openArchive(){
  const trigger=$('[data-act="openArch"]');
  if(trigger){trigger.click();return true}
  try{if(typeof window.openArch==='function'){window.openArch();return true}}catch(_e){}
  try{if(typeof window.ACTIONS?.openArch==='function'){window.ACTIONS.openArch();return true}}catch(_e){}
  return false;
}
function ensureArchiveAccess(){
  const more=$('#card-more');
  if(!more||$('#v7-mobile-archive-card',more))return;
  const box=document.createElement('section');
  box.id='v7-mobile-archive-card';
  box.innerHTML='<b>ARCHIVE & REPRINT</b><span>Open archived parcels, locate the original shipment and reprint its label.</span><button type="button" id="v7-mobile-archive-open">OPEN ARCHIVE</button>';
  more.appendChild(box);
  $('#v7-mobile-archive-open',box).addEventListener('click',()=>{
    if(!openArchive())alert('Archive is still starting. Please retry in a moment.');
  });
}
function unlockScrollAndNav(){
  if(document.body.classList.contains('v7-auth-locked'))return;
  document.documentElement.style.removeProperty('overflow');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('height');
  document.body.classList.remove('modal-open','no-scroll','lz-mobile-focus');
}
function setStep(step){
  const valid=['customer','details','preview'];if(!valid.includes(step))return;
  unlockScrollAndNav();
  document.body.classList.remove('v7-mobile-step-customer','v7-mobile-step-details','v7-mobile-step-preview');
  document.body.classList.add('v7-mobile-step-'+step);
  $$('.v7-step[data-step]').forEach(el=>{
    const s=el.dataset.step;
    el.classList.toggle('active',s===step);
    el.classList.toggle('done',(step==='details'&&s==='customer')||(step==='preview'&&(s==='customer'||s==='details')));
  });
  document.dispatchEvent(new CustomEvent('v7:stepchange',{detail:{step}}));
  if(mobile())setTimeout(()=>window.LabelOnZeWayEnforceMobileLabel?.(),0);
}
function showView(view){
  unlockScrollAndNav();
  if(mobile()&&typeof window.LabelOnZeWayMobileShow==='function'){
    window.LabelOnZeWayMobileShow(view);
    return true;
  }
  const action={archive:openArchive,customers:()=>window.openAddrModal?.(),tracking:()=>window.openTrackingDashboard?.(),settings:()=>window.openSettings?.()}[view];
  if(action){action();return true}
  document.body.classList.add('v7-focus');
  $$('.v7-nav button[data-v7]').forEach(b=>b.classList.toggle('active',b.dataset.v7===view));
  $$('#app>.card,#app>.v7-label-grid,#app>.v7-hero,#app>.v7-stepbar').forEach(el=>el.classList.remove('v7-active'));
  if(view==='label'){
    ['v7-label-grid','v7-label-hero','v7-label-stepbar'].forEach(id=>$('#'+id)?.classList.add('v7-active'));
    if(!document.body.classList.contains('v7-mobile-step-details')&&!document.body.classList.contains('v7-mobile-step-preview'))setStep('customer');
  }else{
    const id={home:'card-home',manifest:'card-manifest',batch:'card-batch',more:'card-more'}[view];
    if(id)$('#'+id)?.classList.add('v7-active');
  }
  window.scrollTo(0,0);
  document.dispatchEvent(new CustomEvent('v7:viewchange',{detail:{view}}));
  return true;
}
function bindNavigation(){
  if(document.documentElement.dataset.v7FinalNavBound==='1')return;
  document.documentElement.dataset.v7FinalNavBound='1';
  document.addEventListener('click',e=>{
    const step=e.target.closest?.('.v7-step[data-step]');
    if(step&&mobile()){e.preventDefault();e.stopImmediatePropagation();setStep(step.dataset.step);return}
    const nav=e.target.closest?.('.v7-nav button[data-v7]');
    if(nav){e.preventDefault();e.stopImmediatePropagation();showView(nav.dataset.v7);return}
    const create=e.target.closest?.('.v7-new');
    if(create){e.preventDefault();e.stopImmediatePropagation();showView('label');return}
  },true);
}
function install(){ensureArchiveAccess();bindNavigation();unlockScrollAndNav()}
const boot=()=>{install();[200,600,1400,2600].forEach(ms=>setTimeout(install,ms))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.LabelOnZeWayV7ShowView=showView;
window.LabelOnZeWayV7SetStep=setStep;
})();
