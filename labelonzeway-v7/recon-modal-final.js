(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
function fixRecon(){
  const modal=$('#m-recon'); if(!modal||!modal.classList.contains('open'))return;
  modal.style.setProperty('display','flex','important');
  modal.style.setProperty('align-items','center','important');
  modal.style.setProperty('justify-content','center','important');
  modal.style.setProperty('pointer-events','auto','important');
  const box=$('.modal-box',modal); if(box){box.style.setProperty('pointer-events','auto','important');box.style.setProperty('margin','auto','important')}
  $$('#m-recon button,#m-recon [role="button"],#m-recon input,#m-recon select,#m-recon textarea').forEach(el=>{el.style.setProperty('pointer-events','auto','important');el.style.setProperty('touch-action','manipulation','important')});
}
function schedule(){requestAnimationFrame(fixRecon);setTimeout(fixRecon,40);setTimeout(fixRecon,160)}
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-act="openRecon"],#recon-btn'))schedule();
  if(e.target.closest?.('#m-recon button,#m-recon [role="button"]'))setTimeout(fixRecon,0);
},true);
const mo=new MutationObserver(ms=>{if(ms.some(m=>m.target?.id==='m-recon'||m.target?.closest?.('#m-recon')))schedule()});
function install(){const modal=$('#m-recon');if(modal)mo.observe(modal,{subtree:true,attributes:true,attributeFilter:['class','style']});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.LabelOnZeWayFixReconModal=fixRecon;
})();
