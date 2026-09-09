(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];

  function openAddressBook(mode='search'){
    const trigger=$('[data-act="openAddressBook"]');
    if(trigger) trigger.click();
    setTimeout(()=>{
      const box=[...$$('.modal-box,.modal,[role="dialog"]')].find(el=>{
        const s=getComputedStyle(el); return s.display!=='none'&&s.visibility!=='hidden';
      })||document;
      if(mode==='add'){
        const btn=[...$$('button',box)].find(b=>/add|new|create/i.test((b.textContent||'').trim())&&/customer|contact/i.test((b.textContent||'').trim()));
        btn?.click();
      }
    },80);
  }

  function syncSearch(term){
    openAddressBook('search');
    setTimeout(()=>{
      const candidates=$$('input',document).filter(i=>{
        const s=getComputedStyle(i); if(s.display==='none'||s.visibility==='hidden') return false;
        const t=((i.placeholder||'')+' '+(i.getAttribute('aria-label')||'')).toLowerCase();
        return /search|name|phone|customer|contact|address/.test(t);
      });
      const input=candidates[0];
      if(input){
        input.focus(); input.value=term;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    },140);
  }

  function install(){
    const panel=$('.v7-customer-panel'); if(!panel||panel.dataset.customerFix==='1') return;
    panel.dataset.customerFix='1';

    const titleBtn=$('#v7-new-customer',panel);
    if(titleBtn){
      titleBtn.replaceWith(titleBtn.cloneNode(true));
      $('#v7-new-customer',panel).addEventListener('click',()=>openAddressBook('add'));
    }

    const tabs=$('.v7-customer-tabs',panel);
    if(tabs){
      tabs.innerHTML='<button type="button" class="active" data-customer-tab="search">Search Existing</button><button type="button" data-customer-tab="add">Add New</button>';
      tabs.querySelector('[data-customer-tab="search"]').addEventListener('click',()=>openAddressBook('search'));
      tabs.querySelector('[data-customer-tab="add"]').addEventListener('click',()=>openAddressBook('add'));
    }

    const fake=$('.v7-customer-search',panel);
    if(fake){
      const wrap=document.createElement('div'); wrap.className='v7-customer-search-wrap';
      wrap.innerHTML='<input id="v7-customer-search-input" type="search" inputmode="search" autocomplete="off" placeholder="Search saved customers by name, phone or area…"><button type="button" id="v7-open-saved-customers">Saved customers</button>';
      fake.replaceWith(wrap);
      const input=$('#v7-customer-search-input',wrap);
      let timer;
      input.addEventListener('focus',()=>openAddressBook('search'));
      input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>syncSearch(input.value.trim()),220)});
      $('#v7-open-saved-customers',wrap).addEventListener('click',()=>openAddressBook('search'));
    }

    panel.addEventListener('click',e=>{
      const b=e.target.closest?.('#v7-change-customer,#v7-choose-customer');
      if(b){e.preventDefault();e.stopPropagation();openAddressBook('search')}
    },true);
  }

  const mo=new MutationObserver(install);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
