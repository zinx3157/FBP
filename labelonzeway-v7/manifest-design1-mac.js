(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
function isDesktop(){return matchMedia('(min-width:901px)').matches}
function isManifestVisible(){const card=$('#card-manifest');return !!(card&&(card.classList.contains('v7-active')||getComputedStyle(card).display!=='none'))}
function apply(){
  if(!isDesktop())return;
  const card=$('#card-manifest');if(!card)return;
  if(isManifestVisible())document.body.classList.add('v7-design1-mac');
  card.classList.add('v7-design1-card');
  const details=$('.compact-action-menu',card);if(details)details.open=true;
  const headers=$$('thead th',card);
  const labels=['','PICK ID','CUSTOMER / CONTACT','ADDRESS','PHONE','DATE / TIME','ITEMS (Ar)','DELIVERY (Ar)','FEE','TOTAL DUE','PAYMENT','STATUS','ACTIONS'];
  headers.forEach((h,i)=>{if(i<labels.length&&labels[i]&&h.textContent!==labels[i])h.textContent=labels[i]});
  const toggle=$('#v7-manifest-toggle');if(toggle)toggle.textContent=document.body.classList.contains('v7-manifest-expanded')?'Compact':'Edit All';
}
function sync(){if(!isDesktop()){document.body.classList.remove('v7-design1-mac');return}apply()}
function boot(){sync();const app=$('#app');if(app&&!app.dataset.design1MacObs){app.dataset.design1MacObs='1';new MutationObserver(()=>requestAnimationFrame(sync)).observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']})}const nav=$('#v7-rail');if(nav&&!nav.dataset.design1MacObs){nav.dataset.design1MacObs='1';new MutationObserver(()=>requestAnimationFrame(sync)).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']})}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-v7="manifest"],#v7-manifest-toggle,#card-manifest'))setTimeout(sync,20)},true);
window.addEventListener('resize',sync,{passive:true});
window.addEventListener('pageshow',()=>setTimeout(sync,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else boot();
})();