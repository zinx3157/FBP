(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];
  const PROFILE_KEY='sd.profiles', ACTIVE_KEY='sd.profile';
  function profiles(){
    try{
      const fromWindow=Array.isArray(window.PROFILES)&&window.PROFILES.length?window.PROFILES:null;
      const fromStore=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
      return (fromWindow||fromStore||[]).filter(p=>p&&p.id);
    }catch(_e){return Array.isArray(window.PROFILES)?window.PROFILES:[]}
  }
  function activeId(){return String(window.PID||localStorage.getItem(ACTIVE_KEY)||'')}
  function activeProfile(){
    const id=activeId(), list=profiles();
    return list.find(p=>String(p.id)===id)||null;
  }
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function settingsHost(){
    return $$('.modal-box,[role="dialog"],.modal-content,.settings-modal').find(el=>/\bSETTINGS\b/i.test((el.textContent||'').slice(0,5000)));
  }
  function renderActiveProfileBadge(){
    const p=activeProfile(), id=activeId(), name=String(p?.name||id||'No profile');
    let badge=$('#v7-active-profile-badge');
    const tools=$('.v7-tools')||$('#v7-shell');
    if(!tools)return;
    if(!badge){
      badge=document.createElement('button');
      badge.id='v7-active-profile-badge';
      badge.type='button';
      badge.className='v7-active-profile-badge';
      badge.setAttribute('aria-label','Open company profile settings');
      const anchor=$('.v7-workspace',tools)||$('.v7-new',tools);
      if(anchor)tools.insertBefore(badge,anchor); else tools.prepend(badge);
      badge.addEventListener('click',()=>{try{window.openSettings?.()}catch(_e){const b=$('[data-act="openSettings"],#top-settings-btn,[data-v7="settings"]');b?.click()}});
    }
    badge.innerHTML=`<small>ACTIVE PROFILE</small><b>${esc(name)}</b>`;
    badge.title='Current company profile: '+name;
    const ws=$('.v7-workspace');
    if(ws){
      const small=ws.querySelector('small');
      if(small)small.textContent='Profile: '+name;
    }
    document.body.dataset.activeProfile=name;
  }
  function switchProfile(id){
    const list=profiles(); if(!list.some(p=>String(p.id)===String(id)))return;
    localStorage.setItem(ACTIVE_KEY,String(id));
    try{window.PID=String(id)}catch(_e){}
    location.reload();
  }
  function deleteProfile(id){
    const idStr=String(id), current=activeId();
    if(idStr===current){alert('The active profile cannot be deleted. Switch to another profile first.');return}
    const list=profiles(); const p=list.find(x=>String(x.id)===idStr); if(!p)return;
    if(!confirm('Delete company profile “'+String(p.name||p.id)+'” from the profile list?'))return;
    const next=list.filter(x=>String(x.id)!==idStr);
    localStorage.setItem(PROFILE_KEY,JSON.stringify(next));
    try{window.PROFILES=next}catch(_e){}
    render();
    renderActiveProfileBadge();
  }
  function render(){
    const host=settingsHost(); if(!host)return;
    let box=$('#v7-existing-profiles',host);
    if(!box){
      box=document.createElement('section'); box.id='v7-existing-profiles'; box.className='v7-existing-profiles';
      const header=host.querySelector('.modal-head,.settings-head,header');
      if(header&&header.nextSibling)header.parentNode.insertBefore(box,header.nextSibling); else host.prepend(box);
    }
    const list=profiles(), current=activeId();
    const currentProfile=list.find(p=>String(p.id)===current);
    box.innerHTML=`<div class="v7-prof-head"><div><small>COMPANY WORKSPACE</small><h3>Existing Company Profiles</h3></div><span class="v7-prof-current">Active: ${esc(currentProfile?.name||current||'None')}</span></div>
      <div class="v7-prof-grid">${list.length?list.map(p=>{const on=String(p.id)===current;return `<article class="v7-prof-card ${on?'active':''}" data-profile-id="${esc(p.id)}"><div><b>${esc(p.name||p.id)}</b><small>${on?'Current workspace':'Saved company profile'}</small></div><div class="v7-prof-actions">${on?'<span class="v7-prof-active">ACTIVE</span>':`<button type="button" data-v7-profile-open="${esc(p.id)}">OPEN / SWITCH</button><button type="button" class="danger" data-v7-profile-delete="${esc(p.id)}">DELETE</button>`}</div></article>`}).join(''):'<div class="v7-prof-empty">No saved company profiles found on this device.</div>'}</div>
      <p class="v7-prof-note">Opening a profile switches the whole operational workspace to that company and reloads its saved data.</p>`;
    $$('[data-v7-profile-open]',box).forEach(b=>b.onclick=()=>switchProfile(b.dataset.v7ProfileOpen));
    $$('[data-v7-profile-delete]',box).forEach(b=>b.onclick=()=>deleteProfile(b.dataset.v7ProfileDelete));
  }
  function watch(){
    renderActiveProfileBadge();
    render();
    new MutationObserver(()=>{
      if(settingsHost()&&!$('#v7-existing-profiles',settingsHost()))render();
      if(!$('#v7-active-profile-badge'))renderActiveProfileBadge();
    }).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-act="openSettings"],#top-settings-btn,[data-v7="settings"]'))setTimeout(render,80)},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();