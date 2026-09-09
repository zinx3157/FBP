(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];

  function openAddressBook(mode='search',term=''){
    // Current production runtime exposes openAddrModal(editId). Use it directly.
    if(typeof window.openAddrModal==='function'){
      window.openAddrModal();
    }else{
      const modal=$('#m-addr');
      if(modal) modal.classList.add('open');
      if(typeof window.renderAmList==='function') window.renderAmList();
    }

    requestAnimationFrame(()=>{
      const modal=$('#m-addr');
      if(!modal)return;
      modal.classList.add('open');

      const search=$('#am-search',modal);
      if(search && term){
        search.value=term;
        search.dispatchEvent(new Event('input',{bubbles:true}));
        if(typeof window.renderAmList==='function') window.renderAmList();
      }

      if(mode==='add'){
        // openAddrModal() already prepares the ADD ADDRESS form. Move focus there.
        const name=$('#am-name',modal);
        if(name){
          setTimeout(()=>{try{name.focus()}catch(_e){}},50);
          name.scrollIntoView?.({block:'center',behavior:'smooth'});
        }
      }else if(search){
        setTimeout(()=>{try{search.focus()}catch(_e){}},50);
      }
    });
  }

  function syncSearch(term){
    openAddressBook('search',term);
  }

  function goToNewLabelAndChooseCustomer(){
    const nav=$('.v7-nav button[data-v7="label"]');
    if(nav) nav.click();
    setTimeout(()=>openAddressBook('search'),40);
  }

  function install(){
    const panel=$('.v7-customer-panel');
    if(!panel||panel.dataset.customerFix==='2')return;
    panel.dataset.customerFix='2';

    const titleBtn=$('#v7-new-customer',panel);
    if(titleBtn){
      const fresh=titleBtn.cloneNode(true);
      titleBtn.replaceWith(fresh);
      fresh.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openAddressBook('add')});
    }

    const tabs=$('.v7-customer-tabs',panel);
    if(tabs){
      tabs.innerHTML='<button type="button" class="active" data-customer-tab="search">Search Existing</button><button type="button" data-customer-tab="add">Add New</button>';
      tabs.querySelector('[data-customer-tab="search"]').addEventListener('click',e=>{e.preventDefault();openAddressBook('search')});
      tabs.querySelector('[data-customer-tab="add"]').addEventListener('click',e=>{e.preventDefault();openAddressBook('add')});
    }

    const fake=$('.v7-customer-search',panel);
    if(fake){
      const wrap=document.createElement('div');
      wrap.className='v7-customer-search-wrap';
      wrap.innerHTML='<input id="v7-customer-search-input" type="search" inputmode="search" autocomplete="off" placeholder="Search saved customers by name, phone or area…"><button type="button" id="v7-open-saved-customers">Saved customers</button>';
      fake.replaceWith(wrap);
      const input=$('#v7-customer-search-input',wrap);
      let timer;
      input.addEventListener('focus',()=>openAddressBook('search',input.value.trim()));
      input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>syncSearch(input.value.trim()),160)});
      $('#v7-open-saved-customers',wrap).addEventListener('click',e=>{e.preventDefault();openAddressBook('search',input.value.trim())});
    }

    panel.addEventListener('click',e=>{
      const b=e.target.closest?.('#v7-change-customer,#v7-choose-customer');
      if(b){e.preventDefault();e.stopPropagation();openAddressBook('search')}
    },true);
  }

  // Production Home's New Label action creates a fresh draft. V7 must then show
  // the workbench and immediately open the current Address Book selector.
  document.addEventListener('click',e=>{
    const start=e.target.closest?.('[data-act="startNewLabel"]');
    if(start) setTimeout(goToNewLabelAndChooseCustomer,0);
  },true);

  // V7 top Create Label should do the same without relying on legacy navigation.
  document.addEventListener('click',e=>{
    const top=e.target.closest?.('.v7-new');
    if(top) setTimeout(()=>openAddressBook('search'),30);
  },true);

  const mo=new MutationObserver(install);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
