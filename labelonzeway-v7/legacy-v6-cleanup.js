(()=>{
'use strict';
const LEGACY_SELECTORS=[
  '#lz-command-v6',
  '#lz-command-v6-js',
  '.v6-desktop',
  '.v6-mobile',
  '.v6-bottomnav',
  '#v6-dashboard',
  '#v6-mobile-home'
];
let cleaning=false;
function cleanLegacyV6(){
  if(cleaning)return;
  cleaning=true;
  try{
    document.body?.classList.remove('v6-work');
    LEGACY_SELECTORS.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.remove()));
    document.querySelectorAll('[class*="v6-"]').forEach(el=>{
      if(el.id==='app')return;
      if(el.matches('.v6-desktop,.v6-mobile,.v6-bottomnav,#v6-dashboard,#v6-mobile-home'))el.remove();
    });
  }finally{cleaning=false}
}
function install(){
  cleanLegacyV6();
  const root=document.documentElement;
  const observer=new MutationObserver(mutations=>{
    let hit=false;
    for(const m of mutations){
      if(m.type==='attributes'&&m.target===document.body&&document.body.classList.contains('v6-work')){hit=true;break}
      for(const n of m.addedNodes||[]){
        if(!(n instanceof Element))continue;
        if(LEGACY_SELECTORS.some(sel=>n.matches?.(sel)||n.querySelector?.(sel))){hit=true;break}
      }
      if(hit)break;
    }
    if(hit)queueMicrotask(cleanLegacyV6);
  });
  observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  [0,50,150,400,900,1800,3500].forEach(ms=>setTimeout(cleanLegacyV6,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.LabelOnZeWayCleanLegacyV6=cleanLegacyV6;
})();
