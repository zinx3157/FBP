(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];

  function closeManifestToolsAfterAction(){
    const menu=$('#manifest-action-menu');
    if(!menu)return;
    menu.addEventListener('click',e=>{
      const btn=e.target.closest('button');
      if(!btn)return;
      setTimeout(()=>{try{menu.open=false}catch(_e){}},80);
    });
  }

  function markAddressFormContainer(){
    const title=$('#am-form-title');
    if(!title)return;
    const host=title.parentElement;
    if(host)host.classList.add('v7-address-form-block');
  }

  function syncAddressMode(){
    const modal=$('#m-addr');
    if(!modal)return;
    markAddressFormContainer();
    const searchMode=modal.classList.contains('v7-customer-picker');
    const block=$('.v7-address-form-block',modal);
    if(block)block.hidden=searchMode;
    const list=$('#am-list',modal);
    if(list){
      list.style.maxHeight=searchMode?'none':'';
      list.style.overflow=searchMode?'visible':'';
    }
  }

  function compactNewLabelActions(){
    const stepbar=$('#v7-label-stepbar');
    if(!stepbar)return;
    const print=$('.v7-step-actions .print',stepbar);
    if(print){
      const preview=document.body.classList.contains('v7-mobile-step-preview');
      print.disabled=!preview;
      print.setAttribute('aria-disabled',String(!preview));
    }
  }

  function install(){
    closeManifestToolsAfterAction();
    syncAddressMode();
    compactNewLabelActions();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#v7-new-customer,[data-customer-tab="add"]')){
      setTimeout(()=>{
        const modal=$('#m-addr');
        if(modal)modal.classList.remove('v7-customer-picker');
        syncAddressMode();
      },40);
    }
    if(e.target.closest('[data-customer-tab="search"],#v7-open-saved-customers,#v7-change-customer,#v7-choose-customer')){
      setTimeout(()=>{
        const modal=$('#m-addr');
        if(modal)modal.classList.add('v7-customer-picker');
        syncAddressMode();
      },40);
    }
    if(e.target.closest('.v7-step'))setTimeout(compactNewLabelActions,0);
  },true);

  document.addEventListener('v7:viewchange',()=>setTimeout(install,0));
  window.addEventListener('pageshow',()=>setTimeout(install,0));

  const boot=()=>{
    install();
    let tries=0;
    const timer=setInterval(()=>{
      install();
      if(++tries>=16)clearInterval(timer);
    },250);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
