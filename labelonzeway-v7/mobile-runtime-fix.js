(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];

  const actionMap={
    tracking:()=>window.openTrackingDashboard?.(),
    customers:()=>window.openAddrModal?.(),
    archive:()=>window.openArch?.(),
    settings:()=>window.openSettings?.()
  };

  function clearLegacyMobileState(){
    document.body.classList.remove('lz-mobile-focus');
    $$('.lz-mobile-visible').forEach(el=>el.classList.remove('lz-mobile-visible'));
  }

  function setStep(step){
    document.body.classList.remove('v7-mobile-step-customer','v7-mobile-step-details','v7-mobile-step-preview');
    document.body.classList.add(`v7-mobile-step-${step}`);
    $$('.v7-step').forEach(el=>{
      el.classList.toggle('active',el.dataset.step===step);
      el.classList.toggle('done',(step==='details'&&el.dataset.step==='customer')||(step==='preview'&&['customer','details'].includes(el.dataset.step)));
    });
  }

  function showOnly(view){
    clearLegacyMobileState();
    document.body.classList.add('v7-focus');
    $$('.v7-nav button').forEach(b=>b.classList.toggle('active',b.dataset.v7===view));
    $$('#app>.card,#app>.v7-label-grid,#app>.v7-hero,#app>.v7-stepbar').forEach(el=>{
      el.classList.remove('v7-active');
      el.style.removeProperty('display');
    });

    if(view==='label'){
      ['v7-label-grid','v7-label-hero','v7-label-stepbar'].forEach(id=>$('#'+id)?.classList.add('v7-active'));
      setStep('customer');
    }else{
      const id={home:'card-home',manifest:'card-manifest',batch:'card-batch',more:'card-more'}[view];
      const card=id&&$('#'+id);
      if(card){
        card.classList.add('v7-active');
        // Defensive fallback for legacy engine styles that occasionally keep a card hidden.
        if(getComputedStyle(card).display==='none')card.style.setProperty('display','block','important');
      }
    }
    window.scrollTo(0,0);
    document.dispatchEvent(new CustomEvent('v7:viewchange',{detail:{view}}));
  }

  function activate(view){
    if(actionMap[view]){
      clearLegacyMobileState();
      try{actionMap[view]();}catch(_e){}
      return;
    }
    showOnly(view);
  }

  function install(){
    clearLegacyMobileState();

    // One navigation path for desktop + iPhone. Do not synthesize clicks or process
    // touchend separately; iOS was executing overlapping handlers and becoming sluggish.
    document.addEventListener('click',e=>{
      const nav=e.target.closest?.('.v7-nav button[data-v7]');
      if(nav){
        e.preventDefault();
        e.stopImmediatePropagation();
        activate(nav.dataset.v7);
        return;
      }
      const create=e.target.closest?.('.v7-new');
      if(create){
        e.preventDefault();
        e.stopImmediatePropagation();
        activate('label');
        return;
      }
      const step=e.target.closest?.('.v7-step[data-step]');
      if(step && matchMedia('(max-width:900px)').matches){
        e.preventDefault();
        e.stopImmediatePropagation();
        setStep(step.dataset.step);
      }
    },true);

    // Lightweight repair only when the body class itself changes; no subtree observer.
    new MutationObserver(()=>{
      if(document.body.classList.contains('lz-mobile-focus'))clearLegacyMobileState();
    }).observe(document.body,{attributes:true,attributeFilter:['class']});

    const active=$('.v7-nav button.active')?.dataset.v7||'home';
    activate(active);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
