(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const VIEW_IDS={home:['card-home'],label:['v7-label-hero','v7-label-stepbar','v7-label-grid'],manifest:['card-manifest'],more:['card-more']};
function isMobile(){return matchMedia('(max-width:900px)').matches}
function clearViews(){
  $$('#app>.card,#app>.v7-label-grid,#app>.v7-hero,#app>.v7-stepbar').forEach(el=>el.classList.remove('mobile-view-active','v7-active'));
}
function setActiveNav(view){$$('#v7-rail .v7-nav button[data-v7]').forEach(b=>b.classList.toggle('active',b.dataset.v7===view));}
function show(view){
  if(!isMobile())return;
  if(view==='customers'){
    clearViews();setActiveNav('customers');
    try{window.openAddrModal?.()}catch(_e){}
    setTimeout(()=>$('#m-addr')?.classList.add('open'),20);
    return;
  }
  clearViews();
  (VIEW_IDS[view]||VIEW_IDS.home).forEach(id=>$('#'+id)?.classList.add('mobile-view-active'));
  setActiveNav(view);
  document.body.classList.add('mobile-reset-ready','v7-focus');
  window.scrollTo(0,0);
  document.dispatchEvent(new CustomEvent('v7:viewchange',{detail:{view}}));
}
function rebuildNav(){
  if(!isMobile())return;
  const nav=$('#v7-rail .v7-nav');if(!nav)return;
  const current={};$$('button[data-v7]',nav).forEach(b=>{current[b.dataset.v7]=b});
  const make=(view,label,ico)=>{const b=current[view]||document.createElement('button');b.type='button';b.dataset.v7=view;b.innerHTML='<span class="ico">'+ico+'</span><span>'+label+'</span>';return b};
  const order=[
    make('home','Home','⌂'),
    make('label','New Label','＋'),
    make('manifest','Manifest','▤'),
    make('customers','Customers','◎'),
    make('more','More','•••')
  ];
  nav.innerHTML='';order.forEach(b=>nav.appendChild(b));
}
function bind(){
  if(document.documentElement.dataset.mobileResetBound==='1')return;
  document.documentElement.dataset.mobileResetBound='1';
  document.addEventListener('click',e=>{
    if(!isMobile())return;
    const b=e.target.closest?.('#v7-rail .v7-nav button[data-v7]');
    if(b){e.preventDefault();e.stopImmediatePropagation();show(b.dataset.v7);return;}
    const create=e.target.closest?.('.v7-new,[data-act="startNewLabel"]');
    if(create){e.preventDefault();e.stopImmediatePropagation();show('label');return;}
  },true);
}
function repairAddressBook(){
  const modal=$('#m-addr');if(!modal)return;
  const list=$('#am-list',modal);if(list)list.style.width='100%';
}
function ensureHome(){
  if(!isMobile()||document.body.classList.contains('v7-auth-locked'))return;
  const any=$$('#app>.mobile-view-active').length;
  if(!any)show('home');
}
function install(){
  if(!isMobile())return;
  document.documentElement.setAttribute('data-clean-mobile',document.documentElement.getAttribute('data-mobile-uat')||'1');
  rebuildNav();bind();repairAddressBook();ensureHome();
}
const boot=()=>{install();[150,500,1200,2400].forEach(ms=>setTimeout(()=>{install();ensureHome()},ms));
  const mo=new MutationObserver(()=>requestAnimationFrame(()=>{rebuildNav();repairAddressBook();ensureHome()}));
  mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.LabelOnZeWayMobileShow=show;
})();
