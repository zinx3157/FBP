(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];

  function openManifest(){
    try{
      if(typeof window.showMobileView==='function') window.showMobileView('manifest');
      else {
        const btn=$('[data-act="showMobileView"][data-arg="manifest"], .v7-nav [data-v7="manifest"], .v7-mobile-nav [data-v7="manifest"]');
        if(btn) btn.click();
        const card=$('#card-manifest');
        if(card){ card.style.display='block'; card.scrollIntoView({behavior:'smooth',block:'start'}); }
      }
    }catch(_e){}
  }

  function locateManifestRow(orderText){
    const clean=String(orderText||'').replace(/^#/,'').trim();
    if(!clean) return null;
    const rows=$$('#mani-body tr, #card-manifest .mobile-manifest-item, #card-manifest [data-id]');
    return rows.find(row=>{
      const txt=(row.textContent||'').replace(/\s+/g,' ').trim();
      return txt.includes(clean);
    })||null;
  }

  function activateRecent(row){
    const order=$('.ops-order',row)?.textContent||'';
    openManifest();
    setTimeout(()=>{
      const target=locateManifestRow(order);
      if(target){
        const cb=$('.mani-select, input[type="checkbox"][data-id]',target);
        if(cb){
          try{ if(typeof window.setManifestSelected==='function') window.setManifestSelected(cb.getAttribute('data-id'),true); else {cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));} }catch(_e){}
        }
        target.classList.add('v7-recent-focus');
        target.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>target.classList.remove('v7-recent-focus'),1800);
      } else {
        try{window.toast?.('Opened Manifest for '+order,'ok')}catch(_e){}
      }
    },120);
  }

  function wire(){
    $$('#ops-recent-list .ops-recent-row').forEach(row=>{
      if(row.dataset.v7RecentReady==='1') return;
      row.dataset.v7RecentReady='1';
      row.setAttribute('role','button');
      row.setAttribute('tabindex','0');
      row.style.cursor='pointer';
      row.title='Open this label in Manifest';
      row.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activateRecent(row)});
      row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activateRecent(row)}});
    });
  }

  function install(){
    const style=document.createElement('style');
    style.textContent='.ops-recent-row[data-v7-recent-ready="1"]{transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.ops-recent-row[data-v7-recent-ready="1"]:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.18);border-color:#ff8a45!important}.v7-recent-focus{outline:3px solid rgba(255,138,69,.75)!important;outline-offset:2px!important}';
    document.head.appendChild(style);
    wire();
    const host=$('#ops-recent-list');
    if(host) new MutationObserver(wire).observe(host,{childList:true,subtree:true});
    const deck=$('#operations-deck')||document.body;
    new MutationObserver(wire).observe(deck,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
