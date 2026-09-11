(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
function relabel(){
  if(!matchMedia('(min-width:901px)').matches)return;
  const card=$('#card-manifest'); if(!card)return;
  document.body.classList.add('v7-design1-mac');
  const details=$('.compact-action-menu',card); if(details)details.open=true;
  const headers=$$('thead th',card);
  const labels=['','PICK ID','CUSTOMER / CONTACT','ADDRESS','PHONE','DATE / TIME','ITEMS (Ar)','DELIVERY (Ar)','FEE','TOTAL DUE','PAYMENT','STATUS','ACTIONS'];
  headers.forEach((h,i)=>{if(i<labels.length&&labels[i])h.textContent=labels[i]});
  const toggle=$('#v7-manifest-toggle');
  if(toggle){toggle.textContent=document.body.classList.contains('v7-manifest-expanded')?'Compact':'Edit All';}
  const helper=$('#v7-manifest-print-helper'); if(helper)helper.setAttribute('aria-label','Manifest print and export tools');
}
function install(){relabel(); const card=$('#card-manifest'); if(card&&!card.dataset.design1Observer){card.dataset.design1Observer='1';new MutationObserver(()=>requestAnimationFrame(relabel)).observe(card,{subtree:true,childList:true})}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-v7="manifest"],#v7-manifest-toggle'))setTimeout(install,60)},true);
window.addEventListener('resize',install,{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,60),{once:true});else setTimeout(install,60);
})();