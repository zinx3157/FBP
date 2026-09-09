(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  let installedPanel=null;
  let opening=false;

  function openAddressBook(mode='search',term=''){
    if(opening)return;
    opening=true;
    try{
      if(typeof window.openAddrModal==='function') window.openAddrModal();
      else {
        const modal=$('#m-addr');
        if(modal) modal.classList.add('open');
        if(typeof window.renderAmList==='function') window.renderAmList();
      }
      requestAnimationFrame(()=>{
        const modal=$('#m-addr');
        if(!modal){opening=false;return;}
        modal.classList.add('open');
        const search=$('#am-search',modal);
        if(mode==='search' && search){
          if(term && search.value!==term){
            search.value=term;
            search.dispatchEvent(new Event('input',{bubbles:true}));
          }
          setTimeout(()=>{try{search.focus()}catch(_e){} opening=false;},40);
        } else {
          const name=$('#am-name',modal);
          setTimeout(()=>{try{name?.focus()}catch(_e){} opening=false;},40);
        }
      });
    }catch(_e){opening=false;}
  }

  function install(){
    const panel=$('.v7-customer-panel');
    if(!panel || panel===installedPanel)return;
    installedPanel=panel;

    const titleBtn=$('#v7-new-customer',panel);
    if(titleBtn) titleBtn.onclick=e=>{e.preventDefault();e.stopPropagation();openAddressBook('add');};

    const tabs=$('.v7-customer-tabs',panel);
    if(tabs){
      tabs.innerHTML='<button type="button" class="active" data-customer-tab="search">Search Existing</button><button type="button" data-customer-tab="add">Add New</button>';
      $('[data-customer-tab="search"]',tabs).onclick=e=>{e.preventDefault();openAddressBook('search');};
      $('[data-customer-tab="add"]',tabs).onclick=e=>{e.preventDefault();openAddressBook('add');};
    }

    const fake=$('.v7-customer-search',panel);
    if(fake){
      const wrap=document.createElement('div');
      wrap.className='v7-customer-search-wrap';
      wrap.innerHTML='<input id="v7-customer-search-input" type="search" autocomplete="off" placeholder="Search saved customers by name, phone or area…"><button type="button" id="v7-open-saved-customers">Saved customers</button>';
      fake.replaceWith(wrap);
      const input=$('#v7-customer-search-input',wrap);
      input.onfocus=()=>openAddressBook('search',input.value.trim());
      $('#v7-open-saved-customers',wrap).onclick=e=>{e.preventDefault();openAddressBook('search',input.value.trim());};
    }
  }

  document.addEventListener('click',e=>{
    const change=e.target.closest?.('#v7-change-customer,#v7-choose-customer');
    if(change){e.preventDefault();e.stopPropagation();openAddressBook('search');return;}
    const start=e.target.closest?.('[data-act="startNewLabel"],.v7-new');
    if(start) setTimeout(()=>{install();openAddressBook('search');},80);
  },true);

  // Install only at startup and after explicit V7 navigation. No subtree observer:
  // the previous observer could repeatedly reinstall while the modal rendered.
  const boot=()=>{install();document.addEventListener('v7:viewchange',()=>setTimeout(install,0));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
