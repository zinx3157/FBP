(()=>{
  const root=document;
  const qs=(q,r=root)=>r.querySelector(q);

  // Chrome on iOS uses WebKit too, but synthesised MouseEvent recursion can
  // behave differently from Safari. Let native click handlers be authoritative.
  function activateView(view){
    const button=qs(`.v7-nav button[data-v7="${view}"]`);
    if(button){ button.click(); return true; }
    return false;
  }

  function activateStep(step){
    const el=qs(`.v7-step[data-step="${step}"]`);
    if(el){ el.click(); return true; }
    return false;
  }

  function runShortcut(target){
    const create=target.closest?.('.v7-new');
    if(create)return activateView('label');
    return false;
  }

  // Do not preventDefault/stopPropagation on touchend. That was suppressing
  // Chrome iOS's native click sequence. Pointer/click is the single activation path.
  root.addEventListener('click',e=>{
    if(!matchMedia('(max-width:900px)').matches)return;
    runShortcut(e.target);
  },false);

  // Pointer-up is used only as a compatibility fallback when a browser fails
  // to emit click. It never redispatches onto the same nav/step control.
  let pointerTarget=null;
  root.addEventListener('pointerdown',e=>{
    if(!matchMedia('(max-width:900px)').matches)return;
    pointerTarget=e.target.closest?.('#v7-rail button,#v7-shell button,.v7-step,#v7-manifest-toggle')||null;
  },{passive:true});
  root.addEventListener('pointercancel',()=>{pointerTarget=null},{passive:true});
  root.addEventListener('pointerup',e=>{
    if(!matchMedia('(max-width:900px)').matches)return;
    const target=e.target.closest?.('#v7-rail button,#v7-shell button,.v7-step,#v7-manifest-toggle');
    if(target!==pointerTarget){pointerTarget=null;return;}
    pointerTarget=null;
    // Native click normally follows pointerup. No preventDefault here.
  },{passive:true});

  window.addEventListener('orientationchange',()=>{
    document.documentElement.style.setProperty('--v7-vw',`${window.innerWidth}px`);
  });
  document.documentElement.style.setProperty('--v7-vw',`${window.innerWidth}px`);
})();
