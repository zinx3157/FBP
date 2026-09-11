(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const VIEW_IDS={home:['card-home'],label:['v7-label-hero','v7-label-stepbar','v7-label-grid'],manifest:['card-manifest'],more:['card-more']};
const ALL_VIEW_IDS=['card-home','v7-label-hero','v7-label-stepbar','v7-label-grid','card-manifest','card-more'];
let currentView='home', navReady=false, firstUnlockedHomeShown=false;
const scrollPos={home:0,label:0,manifest:0,more:0};
function isMobile(){return matchMedia('(max-width:900px)').matches}
function hardHide(el){if(!el)return;el.classList.remove('mobile-view-active','v7-active');el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');el.style.setProperty('pointer-events','none','important')}
function hardShow(el,display){if(!el)return;el.classList.add('mobile-view-active','v7-active');el.style.setProperty('display',display||'block','important');el.style.setProperty('visibility','visible','important');el.style.setProperty('pointer-events','auto','important')}
function clearViews(){ALL_VIEW_IDS.forEach(id=>hardHide($('#'+id)))}
function setActiveNav(view){$$('#v7-rail .v7-nav button[data-v7]').forEach(b=>b.classList.toggle('active',b.dataset.v7===view))}
function restoreScroll(view){requestAnimationFrame(()=>window.scrollTo({top:scrollPos[view]||0,left:0,behavior:'auto'}))}
function closeAddressBook(){const modal=$('#m-addr');if(!modal)return;try{window.closeModal?.('m-addr')}catch(_e){}modal.classList.remove('open','v7-customer-picker');modal.setAttribute('aria-hidden','true')}
function show(view){
  if(!isMobile())return;
  document.body.classList.add('mobile-reset-ready','v7-focus');
  document.body.dataset.mobileView=view;
  if(view==='customers'){
    if(VIEW_IDS[currentView])scrollPos[currentView]=window.scrollY||0;
    clearViews();
    setActiveNav('customers');
    try{window.openAddrModal?.()}catch(_e){}
    setTimeout(()=>{$('#m-addr')?.classList.add('open');repairAddressBook()},30);
    return;
  }
  closeAddressBook();
  if(VIEW_IDS[currentView])scrollPos[currentView]=window.scrollY||0;
  clearViews();
  const target=VIEW_IDS[view]||VIEW_IDS.home;
  target.forEach(id=>hardShow($('#'+id),id==='v7-label-grid'?'grid':'block'));
  currentView=VIEW_IDS[view]?view:'home';
  document.body.dataset.mobileView=currentView;
  setActiveNav(currentView);
  restoreScroll(currentView);
  document.dispatchEvent(new CustomEvent('v7:viewchange',{detail:{view:currentView}}));
}
function rebuildNavOnce(){
  if(!isMobile()||navReady)return navReady;
  const nav=$('#v7-rail .v7-nav');if(!nav)return false;
  const existing={};$$('button[data-v7]',nav).forEach(b=>{existing[b.dataset.v7]=b});
  const make=(view,label,ico)=>{const b=existing[view]||document.createElement('button');b.type='button';b.dataset.v7=view;b.innerHTML='<span class="ico">'+ico+'</span><span>'+label+'</span>';b.removeAttribute('data-act');b.removeAttribute('data-arg');return b};
  const order=[make('home','Home','⌂'),make('label','New Label','＋'),make('manifest','Manifest','▤'),make('customers','Customers','◎'),make('more','More','•••')];
  nav.replaceChildren(...order);
  order.forEach((b,i)=>b.style.setProperty('order',String(i+1),'important'));
  $$('#v7-rail .v7-nav > :not(button[data-v7])').forEach(el=>el.remove());
  navReady=true;
  return true;
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
    if(e.target.closest?.('#m-addr [data-close],#m-addr .modal-x')){closeAddressBook();setTimeout(()=>setActiveNav(currentView),20)}
  },true);
}
function repairAddressBook(){
  const modal=$('#m-addr');if(!modal)return;
  const list=$('#am-list',modal);if(list){list.style.width='100%';list.style.maxWidth='100%'}
  $$('.ab-item',modal).forEach(row=>{row.style.width='100%';row.style.maxWidth='100%';const info=$('.ab-info',row);if(info){info.style.width='100%';info.style.minWidth='0'}})
}
function ensureHome(force=false){if(!isMobile()||document.body.classList.contains('v7-auth-locked'))return;const any=$$('#app>.mobile-view-active').length;if(force||!any){show('home');firstUnlockedHomeShown=true}}
function install(){
  if(!isMobile())return;
  document.documentElement.setAttribute('data-clean-mobile',document.documentElement.getAttribute('data-clean-mobile')||document.documentElement.getAttribute('data-mobile-uat')||'1');
  rebuildNavOnce();bind();repairAddressBook();
  if(!firstUnlockedHomeShown&&!document.body.classList.contains('v7-auth-locked'))ensureHome(true);
}
const boot=()=>{install();[150,450,900,1600].forEach(ms=>setTimeout(()=>{if(!navReady)rebuildNavOnce();repairAddressBook();if(!firstUnlockedHomeShown&&!document.body.classList.contains('v7-auth-locked'))ensureHome(true)},ms))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.LabelOnZeWayMobileShow=show;
})();
