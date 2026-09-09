(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];

  function unlockScroll(){
    const openModal=$('.modal.open,.modal.show,[role="dialog"].open');
    if(openModal)return;
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('position');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('height');
    document.body.classList.remove('lz-mobile-focus','modal-open','no-scroll');
    $$('.lz-mobile-visible').forEach(el=>el.classList.remove('lz-mobile-visible'));
  }

  function setStep(step){
    document.body.classList.remove('v7-mobile-step-customer','v7-mobile-step-details','v7-mobile-step-preview');
    document.body.classList.add('v7-mobile-step-'+step);
    $$('.v7-step').forEach(el=>{
      el.classList.toggle('active',el.dataset.step===step);
      el.classList.toggle('done',(step==='details'&&el.dataset.step==='customer')||(step==='preview'&&['customer','details'].includes(el.dataset.step)));
    });
  }

  function showView(view){
    unlockScroll();
    $$('.v7-nav button').forEach(b=>b.classList.toggle('active',b.dataset.v7===view));
    if(view==='customers'){try{window.openAddrModal?.();}catch(_e){};return true;}
    if(view==='tracking'){try{window.openTrackingDashboard?.();}catch(_e){};return true;}
    if(view==='archive'){try{window.openArch?.();}catch(_e){};return true;}
    if(view==='settings'){try{window.openSettings?.();}catch(_e){};return true;}
    document.body.classList.add('v7-focus');
    const all=$$('#app>.card,#app>.v7-label-grid,#app>.v7-hero,#app>.v7-stepbar');
    all.forEach(el=>{el.classList.remove('v7-active');el.style.removeProperty('display');});
    if(view==='label'){
      ['v7-label-grid','v7-label-hero','v7-label-stepbar'].forEach(id=>$('#'+id)?.classList.add('v7-active'));
      setStep('customer');
    }else{
      const id={home:'card-home',manifest:'card-manifest',batch:'card-batch',more:'card-more'}[view];
      const card=id&&$('#'+id);
      if(card){card.classList.add('v7-active');card.style.setProperty('display','block','important');}else if(id){return false;}
      if(view==='manifest'){try{window.renderManifest?.();}catch(_e){}}
      if(view==='batch'){try{window.renderBatch?.();}catch(_e){}}
    }
    window.scrollTo(0,0);return true;
  }

  function applyTheme(theme){
    const light=theme==='light';
    document.documentElement.classList.toggle('v7-light',light);
    document.body.classList.toggle('v7-light',light);
    localStorage.setItem('lz-v7-theme',light?'light':'night');
    const b=$('#v7-theme-toggle');
    if(b){b.textContent=light?'☾ NIGHT':'☀ LIGHT';b.setAttribute('aria-label',light?'Switch to night mode':'Switch to light mode');}
  }
  function installTheme(){
    if($('#v7-theme-toggle'))return;
    const host=$('.v7-tools')||$('#v7-shell'); if(!host)return;
    const b=document.createElement('button');b.id='v7-theme-toggle';b.type='button';b.className='v7-theme-toggle';host.prepend(b);
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();applyTheme(document.documentElement.classList.contains('v7-light')?'night':'light');});
    applyTheme(localStorage.getItem('lz-v7-theme')==='light'?'light':'night');
  }

  window.LabelOnZeWayV7ShowView=showView;
  window.LabelOnZeWayV7UnlockScroll=unlockScroll;

  function install(){
    document.addEventListener('click',e=>{
      const viewAll=e.target.closest?.('.ops-panel-head [data-act="showMobileView"][data-arg="manifest"]');
      if(viewAll){e.preventDefault();e.stopImmediatePropagation();showView('manifest');return;}
      const nav=e.target.closest?.('.v7-nav button[data-v7],.v7-mobile-nav button[data-v7]');
      const create=e.target.closest?.('.v7-new');
      const step=e.target.closest?.('.v7-step[data-step]');
      if(nav){e.preventDefault();e.stopImmediatePropagation();showView(nav.dataset.v7);return;}
      if(create){e.preventDefault();e.stopImmediatePropagation();showView('label');return;}
      if(step&&matchMedia('(max-width:900px)').matches){e.preventDefault();e.stopImmediatePropagation();setStep(step.dataset.step);return;}
      if(e.target.closest?.('button,input[type="submit"],.btn'))setTimeout(unlockScroll,180);
    },true);
    installTheme();unlockScroll();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
