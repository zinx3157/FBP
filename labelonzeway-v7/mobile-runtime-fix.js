(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];
  let lastTouchAt=0;

  const actionMap={
    tracking:'openTrackingDashboard',
    customers:'openAddressBook',
    archive:'openArch',
    settings:'openSettings'
  };

  function clearLegacyMobileState(){
    document.body.classList.remove('lz-mobile-focus');
    $$('.lz-mobile-visible').forEach(el=>el.classList.remove('lz-mobile-visible'));
  }

  function clickAction(name){
    const b=$(`[data-act="${name}"]`);
    if(!b)return false;
    b.click();
    return true;
  }

  function setStep(step){
    document.body.classList.remove('v7-mobile-step-customer','v7-mobile-step-details','v7-mobile-step-preview');
    document.body.classList.add(`v7-mobile-step-${step}`);
    $$('.v7-step').forEach(el=>{
      el.classList.toggle('active',el.dataset.step===step);
      el.classList.toggle('done',(step==='details'&&el.dataset.step==='customer')||(step==='preview'&&['customer','details'].includes(el.dataset.step)));
    });
  }

  function activate(view){
    clearLegacyMobileState();
    $$('.v7-nav button').forEach(b=>b.classList.toggle('active',b.dataset.v7===view));

    if(actionMap[view]){
      clickAction(actionMap[view]);
      return;
    }

    document.body.classList.add('v7-focus');
    $$('#app>.card,#app>.v7-label-grid,#app>.v7-hero,#app>.v7-stepbar').forEach(el=>el.classList.remove('v7-active'));

    if(view==='label'){
      ['v7-label-grid','v7-label-hero','v7-label-stepbar'].forEach(id=>$('#'+id)?.classList.add('v7-active'));
      setStep('customer');
    }else{
      const id={home:'card-home',manifest:'card-manifest',batch:'card-batch',more:'card-more'}[view];
      if(id)$('#'+id)?.classList.add('v7-active');
    }
    window.scrollTo({top:0,behavior:'auto'});
  }

  function install(){
    clearLegacyMobileState();

    // Chrome iOS: execute the V7 action directly on touchend instead of relying
    // on a browser-generated click that can be lost after injected-page rewrites.
    document.addEventListener('touchend',e=>{
      if(!matchMedia('(max-width:900px)').matches)return;
      const nav=e.target.closest?.('.v7-nav button[data-v7]');
      if(nav){
        lastTouchAt=Date.now();
        activate(nav.dataset.v7);
        return;
      }
      const step=e.target.closest?.('.v7-step[data-step]');
      if(step){
        lastTouchAt=Date.now();
        setStep(step.dataset.step);
        return;
      }
      const create=e.target.closest?.('.v7-new');
      if(create){
        lastTouchAt=Date.now();
        activate('label');
      }
    },{capture:true,passive:true});

    // Suppress only the duplicate browser click after we already processed touchend.
    document.addEventListener('click',e=>{
      if(!matchMedia('(max-width:900px)').matches)return;
      if(Date.now()-lastTouchAt>700)return;
      const duplicate=e.target.closest?.('.v7-nav button[data-v7],.v7-step[data-step],.v7-new');
      if(!duplicate)return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },true);

    // Repair legacy state whenever the production engine mutates the mobile shell.
    new MutationObserver(()=>{
      if(matchMedia('(max-width:900px)').matches && document.body.classList.contains('lz-mobile-focus')){
        clearLegacyMobileState();
      }
    }).observe(document.body,{attributes:true,attributeFilter:['class']});

    // Guarantee Home has visible content if the production dashboard is present.
    if(matchMedia('(max-width:900px)').matches){
      const active=$('.v7-nav button.active')?.dataset.v7||'home';
      activate(active);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
