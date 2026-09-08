(()=>{
  const root=document;
  const qs=(q,r=root)=>r.querySelector(q);

  function activateView(view){
    const button=qs(`.v7-nav button[data-v7="${view}"]`);
    if(button){
      button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      return true;
    }
    return false;
  }

  function activateStep(step){
    const el=qs(`.v7-step[data-step="${step}"]`);
    if(el){
      el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      return true;
    }
    return false;
  }

  function runV7Control(target){
    const nav=target.closest?.('.v7-nav button[data-v7]');
    if(nav){
      nav.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      return true;
    }
    const step=target.closest?.('.v7-step[data-step]');
    if(step){
      step.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      return true;
    }
    const create=target.closest?.('.v7-new');
    if(create){return activateView('label')}
    const toggle=target.closest?.('#v7-manifest-toggle');
    if(toggle){
      toggle.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      return true;
    }
    return false;
  }

  let lastTouch=0;
  root.addEventListener('touchend',e=>{
    if(!matchMedia('(max-width:900px)').matches)return;
    const interactive=e.target.closest?.('#v7-rail button,#v7-shell button,.v7-step,#v7-manifest-toggle');
    if(!interactive)return;
    lastTouch=Date.now();
    e.preventDefault();
    e.stopPropagation();
    runV7Control(interactive);
  },{capture:true,passive:false});

  root.addEventListener('click',e=>{
    if(!matchMedia('(max-width:900px)').matches)return;
    if(Date.now()-lastTouch<650)return;
    const interactive=e.target.closest?.('#v7-rail button,#v7-shell button,.v7-step,#v7-manifest-toggle');
    if(!interactive)return;
    if(interactive.closest('#v7-rail')){
      e.stopPropagation();
    }
  },true);

  window.addEventListener('orientationchange',()=>{
    document.documentElement.style.setProperty('--v7-vw',`${window.innerWidth}px`);
  });
  document.documentElement.style.setProperty('--v7-vw',`${window.innerWidth}px`);
})();
