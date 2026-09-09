(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];
  let installedPanel=null;
  let opening=false;
  let openingTimer=null;

  function toast(m,t='ok'){try{window.toast?.(m,t)}catch(_e){console.log(m)}}

  function selectCustomer(id){
    const sel=$('#rec-select');
    if(!sel||!id){toast('Customer selector unavailable','err');return;}
    sel.value=id;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    if(typeof window.onRecChange==='function'){
      try{window.onRecChange(false)}catch(_e){}
    }
    if(typeof window.closeModal==='function')window.closeModal('m-addr');
    else $('#m-addr')?.classList.remove('open');
    setTimeout(()=>{
      document.body.classList.remove('v7-mobile-step-customer');
      document.body.classList.add('v7-mobile-step-details');
      document.querySelector('.v7-step[data-step="details"]')?.click();
      toast('Customer selected · continue with label details','ok');
    },40);
  }

  function rowCustomerId(row){
    const cb=$('.am-check',row);
    const raw=cb?.getAttribute('onchange')||'';
    const m=raw.match(/toggleAddressSelection\(['\"]([^'\"]+)/);
    return m?.[1]||'';
  }

  function decorateAddressRows(){
    const box=$('#am-list');
    if(!box)return;
    $$('.ab-item',box).forEach(row=>{
      if($('.v7-use-customer',row))return;
      const id=rowCustomerId(row);
      if(!id)return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='v7-use-customer';
      btn.textContent='USE CUSTOMER';
      btn.setAttribute('aria-label','Use this customer on the current label');
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();selectCustomer(id);};
      row.appendChild(btn);
    });
  }

  function wrapAddressRenderer(){
    if(typeof window.renderAmList!=='function'||window.renderAmList.__v7Wrapped)return;
    const original=window.renderAmList;
    const wrapped=function(){
      const out=original.apply(this,arguments);
      requestAnimationFrame(decorateAddressRows);
      return out;
    };
    wrapped.__v7Wrapped=true;
    window.renderAmList=wrapped;
  }

  function releaseOpening(){
    opening=false;
    if(openingTimer){clearTimeout(openingTimer);openingTimer=null;}
  }

  function openAddressBook(mode='search',term=''){
    // A prior modal close or WebKit focus transition must never make these
    // controls inert. If a stale opening guard exists, clear it and reopen.
    if(opening)releaseOpening();
    opening=true;
    openingTimer=setTimeout(releaseOpening,450);
    try{
      wrapAddressRenderer();
      if(typeof window.openAddrModal==='function') window.openAddrModal();
      else {
        const modal=$('#m-addr');
        if(modal) modal.classList.add('open');
        if(typeof window.renderAmList==='function') window.renderAmList();
      }
      requestAnimationFrame(()=>{
        decorateAddressRows();
        const modal=$('#m-addr');
        if(!modal){releaseOpening();return;}
        modal.classList.add('open');
        modal.classList.toggle('v7-customer-picker',mode!=='manage');
        const search=$('#am-search',modal);
        if(mode==='search' && search){
          if(term && search.value!==term){search.value=term;search.dispatchEvent(new Event('input',{bubbles:true}));}
          setTimeout(()=>{try{search.focus()}catch(_e){} releaseOpening();},40);
        } else if(mode==='add') {
          const name=$('#am-name',modal);
          setTimeout(()=>{try{name?.focus()}catch(_e){} releaseOpening();},40);
        } else releaseOpening();
      });
    }catch(_e){releaseOpening();}
  }

  function install(){
    wrapAddressRenderer();
    const panel=$('.v7-customer-panel');
    if(!panel || panel===installedPanel)return;
    installedPanel=panel;

    const titleBtn=$('#v7-new-customer',panel);
    if(titleBtn) titleBtn.onclick=e=>{e.preventDefault();e.stopPropagation();openAddressBook('add');};

    const tabs=$('.v7-customer-tabs',panel);
    if(tabs){
      tabs.innerHTML='<button type="button" class="active" data-customer-tab="search">Search Existing</button><button type="button" data-customer-tab="add">Add New</button>';
      $('[data-customer-tab="search"]',tabs).onclick=e=>{e.preventDefault();e.stopPropagation();openAddressBook('search');};
      $('[data-customer-tab="add"]',tabs).onclick=e=>{e.preventDefault();e.stopPropagation();openAddressBook('add');};
    }

    const fake=$('.v7-customer-search',panel);
    if(fake){
      const wrap=document.createElement('div');
      wrap.className='v7-customer-search-wrap';
      wrap.innerHTML='<input id="v7-customer-search-input" type="search" autocomplete="off" placeholder="Search saved customers by name, phone or area…"><button type="button" id="v7-open-saved-customers">Saved customers</button>';
      fake.replaceWith(wrap);
      const input=$('#v7-customer-search-input',wrap);
      input.onfocus=()=>openAddressBook('search',input.value.trim());
      $('#v7-open-saved-customers',wrap).onclick=e=>{e.preventDefault();e.stopPropagation();releaseOpening();openAddressBook('search',input.value.trim());};
    }
  }

  document.addEventListener('click',e=>{
    const change=e.target.closest?.('#v7-change-customer,#v7-choose-customer');
    if(change){e.preventDefault();e.stopPropagation();releaseOpening();openAddressBook('search');return;}
    const start=e.target.closest?.('[data-act="startNewLabel"],.v7-new');
    if(start) setTimeout(()=>{install();releaseOpening();openAddressBook('search');},80);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#m-addr [data-close],#m-addr .modal-x'))setTimeout(releaseOpening,0);
  });

  const boot=()=>{install();decorateAddressRows();document.addEventListener('v7:viewchange',()=>setTimeout(install,0));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
