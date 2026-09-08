(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];
  function cellText(td){
    if(!td)return'';
    const c=td.querySelector('input,select,textarea');
    if(c)return String(c.value||'').trim();
    return String(td.textContent||'').replace(/\s+/g,' ').trim();
  }
  function refreshRows(){
    const card=$('#card-manifest'); if(!card)return;
    $$('tbody tr',card).forEach(tr=>{
      const cells=tr.children; if(cells.length<5)return;
      const nameCell=cells[2],address=cellText(cells[3]),phone=cellText(cells[4]);
      let meta=$('.v7-customer-summary',nameCell);
      if(!meta){meta=document.createElement('span');meta.className='v7-customer-summary';nameCell.appendChild(meta)}
      meta.textContent=[phone,address].filter(Boolean).join(' · ');
    });
  }
  function ensureToggle(){
    const card=$('#card-manifest'),head=card?.querySelector('.card-head'); if(!head||$('#v7-manifest-toggle'))return;
    const b=document.createElement('button');b.type='button';b.id='v7-manifest-toggle';b.className='v7-manifest-toggle';b.textContent='Edit all columns';
    b.addEventListener('click',()=>{const on=document.body.classList.toggle('v7-manifest-expanded');b.textContent=on?'Compact view':'Edit all columns';refreshRows()});
    head.appendChild(b);
  }
  function syncMode(){
    const active=$('.v7-nav button.active');
    const manifest=active?.dataset.v7==='manifest';
    document.body.classList.toggle('v7-manifest-mode',manifest);
    if(!manifest)document.body.classList.remove('v7-manifest-expanded');
    if(manifest){ensureToggle();refreshRows()}
  }
  function init(){
    ensureToggle();refreshRows();syncMode();
    const nav=$('.v7-nav'); if(nav)new MutationObserver(syncMode).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
    const card=$('#card-manifest'); if(card)new MutationObserver(refreshRows).observe(card,{subtree:true,childList:true,attributes:true,attributeFilter:['value']});
    document.addEventListener('input',e=>{if(e.target.closest?.('#card-manifest'))refreshRows()},true);
    document.addEventListener('change',e=>{if(e.target.closest?.('#card-manifest'))refreshRows()},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
