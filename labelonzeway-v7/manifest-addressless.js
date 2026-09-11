(()=>{
'use strict';
const $$=(q,r=document)=>[...r.querySelectorAll(q)];
function markAddressFields(){
  $$('.mobile-manifest-edit .mobile-field').forEach(f=>{
    const l=f.querySelector('label');
    if(l&&String(l.textContent||'').trim().toUpperCase()==='ADDRESS')f.classList.add('mf-address-field');
  });
}
function install(){markAddressFields();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
new MutationObserver(()=>requestAnimationFrame(markAddressFields)).observe(document.documentElement,{subtree:true,childList:true});
})();
