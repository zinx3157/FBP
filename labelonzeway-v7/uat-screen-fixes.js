(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q);
const $$=(q,r=document)=>[...r.querySelectorAll(q)];

function clickAct(act){const b=$(`[data-act="${act}"]`);if(b){b.click();return true}return false}
function mkButton(label,act){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.dataset.v7HelperAct=act;b.addEventListener('click',()=>{if(!clickAct(act))alert('This print/export action is not available on the current screen.');});return b}

function ensureManifestPrintHelper(){
  const card=$('#card-manifest'); if(!card||$('#v7-manifest-print-helper',card))return;
  const helper=document.createElement('div'); helper.id='v7-manifest-print-helper'; helper.className='v7-print-helper';
  helper.appendChild(Object.assign(document.createElement('strong'),{textContent:'PRINT / EXPORT MANIFEST'}));
  helper.appendChild(mkButton('Print 80 mm','printManifest'));
  helper.appendChild(mkButton('Print A4 / Save PDF','printA4'));
  helper.appendChild(mkButton('Export CSV','exportCSV'));
  const head=$('.card-head',card); if(head&&head.nextSibling)card.insertBefore(helper,head.nextSibling); else card.prepend(helper);
}

function triggerVisiblePrint(root,patterns){
  const buttons=$$('button,[role="button"]',root).filter(b=>!b.closest('.v7-print-helper'));
  for(const re of patterns){const found=buttons.find(b=>re.test((b.textContent||'').trim()));if(found){found.click();return true}}
  return false;
}

function ensureArchivePrintHelper(){
  const modal=$('#m-arch'); if(!modal)return;
  const box=$('.modal-box',modal)||modal; if($('#v7-archive-print-helper',box))return;
  const h=box.querySelector('h3');
  const helper=document.createElement('div');helper.id='v7-archive-print-helper';helper.className='v7-print-helper';
  helper.appendChild(Object.assign(document.createElement('strong'),{textContent:'ARCHIVE PRINT / EXPORT'}));
  const p=document.createElement('button');p.type='button';p.className='btn';p.textContent='Print selected / visible archive';p.onclick=()=>{if(!triggerVisiblePrint(box,[/print/i,/80\s*mm/i,/a4/i]))alert('Open an archived day first, then use its Print control.');};
  helper.appendChild(p);
  if(h&&h.nextSibling)box.insertBefore(helper,h.nextSibling); else box.prepend(helper);
}

function ensureReconPrintHelper(){
  const modal=$('#m-recon'); if(!modal)return;
  const box=$('.modal-box',modal)||modal; if($('#v7-recon-print-helper',box))return;
  const h=box.querySelector('h3');
  const helper=document.createElement('div');helper.id='v7-recon-print-helper';helper.className='v7-print-helper';
  helper.appendChild(Object.assign(document.createElement('strong'),{textContent:'RECONCILIATION PRINT'}));
  const p=document.createElement('button');p.type='button';p.className='btn';p.textContent='Print reconciliation';p.onclick=()=>{if(!triggerVisiblePrint(box,[/print/i,/pdf/i]))window.print();};
  helper.appendChild(p);
  if(h&&h.nextSibling)box.insertBefore(helper,h.nextSibling); else box.prepend(helper);
}

function reinforceMobileNav(){
  if(!matchMedia('(max-width:900px)').matches)return;
  const rail=$('#v7-rail'); if(!rail)return;
  rail.hidden=false; rail.removeAttribute('aria-hidden');
  const valid=['home','label','manifest','batch','more'];
  $$('.v7-nav button[data-v7]',rail).forEach(b=>{
    if(valid.includes(b.dataset.v7))b.hidden=false;
  });
}

function install(){ensureManifestPrintHelper();ensureArchivePrintHelper();ensureReconPrintHelper();reinforceMobileNav()}
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-v7="manifest"],#v7-manifest-toggle,[data-act="openArch"],[data-v7="archive"],[data-act="openRecon"],#m-arch,#m-recon'))setTimeout(install,80);
},true);
window.addEventListener('resize',reinforceMobileNav,{passive:true});
window.addEventListener('pageshow',()=>setTimeout(install,0));
const boot=()=>{install();let n=0;const t=setInterval(()=>{install();if(++n>20)clearInterval(t)},250)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
