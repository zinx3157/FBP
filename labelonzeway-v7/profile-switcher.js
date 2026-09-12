(()=>{
  const $=(q,r=document)=>r.querySelector(q);
  const $$=(q,r=document)=>[...r.querySelectorAll(q)];
  const PROFILE_KEYS=['lzb2.profiles','lz.profiles','sd.profiles'];
  const ACTIVE_KEYS=['lzb2.profile','lz.profile','sd.profile'];
  const BUILTIN_PROFILES=[{
    id:'LUZDM',
    name:'LUZDM',
    company:'LUZDM S.L.',
    description:'Consultoría fabricación aditiva e impresión 3D.',
    address:'Calle CARGA, 101, 41008 Sevilla, España',
    email:'hola@luzdm.com',
    phone:'+34 622 37 39 17',
    website:'https://luzdm.com/',
    linkedin:'https://www.linkedin.com/company/luzdm/',
    instagram:'https://www.instagram.com/luzdm/',
    facebook:'https://www.facebook.com/luzdmes',
    twitter:'https://x.com/luzdm',
    logoUrl:'https://labelontheway.com/wp-content/uploads/2025/01/cropped-LOGO-LUZDM-2-2.png',
    coverUrl:'https://labelontheway.com/wp-content/uploads/2025/01/3-1024x300.png'
  }];
  function nativeSelector(){return $('#profile-sel')}
  function readProfilesFromStore(){
    for(const key of PROFILE_KEYS){
      try{
        const value=JSON.parse(localStorage.getItem(key)||'null');
        if(Array.isArray(value)&&value.length)return value;
      }catch(_e){}
    }
    return [];
  }
  function writeActive(id){ACTIVE_KEYS.forEach(key=>localStorage.setItem(key,String(id)))}
  function writeProfiles(list){const json=JSON.stringify(list);PROFILE_KEYS.forEach(key=>localStorage.setItem(key,json))}
  function isMacWrapper(){
    try{return new URLSearchParams(location.search).get('app')==='mac-final'}catch(_e){return false}
  }
  function ensureBuiltinProfiles(){
    const fromWindow=Array.isArray(window.PROFILES)?window.PROFILES.filter(Boolean):[];
    const fromStore=readProfilesFromStore();
    const source=fromWindow.length?fromWindow:fromStore;
    const wasPlaceholderOnly=source.length===1&&String(source[0]?.id||'')==='P1'&&String(source[0]?.name||'').trim().toLowerCase()==='company 1';
    const merged=source.slice();
    for(const builtin of BUILTIN_PROFILES){
      const exists=merged.some(p=>p&&(String(p.id)===builtin.id||String(p.name||'').trim().toLowerCase()===builtin.name.toLowerCase()));
      if(!exists)merged.push({...builtin});
    }
    if(!merged.length)BUILTIN_PROFILES.forEach(p=>merged.push({...p}));
    window.PROFILES=merged;
    writeProfiles(merged);

    const stored=ACTIVE_KEYS.map(k=>localStorage.getItem(k)).find(Boolean)||'';
    if(isMacWrapper()&&(wasPlaceholderOnly||!stored)){
      window.PID='LUZDM';
      writeActive('LUZDM');
      if(sessionStorage.getItem('v7.mac.luzdm.seeded')!=='1'){
        sessionStorage.setItem('v7.mac.luzdm.seeded','1');
        setTimeout(()=>location.reload(),40);
      }
    }
    return merged;
  }
  function profiles(){
    const fromWindow=Array.isArray(window.PROFILES)&&window.PROFILES.length?window.PROFILES:null;
    return (fromWindow||readProfilesFromStore()).filter(p=>p&&p.id);
  }
  function readStoredActive(){
    for(const key of ACTIVE_KEYS){const value=localStorage.getItem(key);if(value)return String(value)}
    return '';
  }
  function activeId(){
    const sel=nativeSelector();
    if(sel&&sel.value)return String(sel.value);
    if(window.PID)return String(window.PID);
    return readStoredActive();
  }
  function activeProfile(){
    const id=activeId(), list=profiles();
    return list.find(p=>String(p.id)===id)||null;
  }
  function activeName(){
    const sel=nativeSelector();
    if(sel&&sel.value&&sel.selectedOptions?.[0]){
      const t=String(sel.selectedOptions[0].textContent||'').trim();
      if(t)return t;
    }
    const p=activeProfile(), id=activeId();
    return String(p?.name||id||'No profile');
  }
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
  function settingsHost(){
    return $$('.modal-box,[role="dialog"],.modal-content,.settings-modal').find(el=>/\bSETTINGS\b/i.test((el.textContent||'').slice(0,5000)));
  }
  function syncNativeSelector(){
    const sel=nativeSelector(); if(!sel)return;
    const current=readStoredActive()||String(window.PID||'');
    for(const p of profiles()){
      if(![...sel.options].some(o=>String(o.value)===String(p.id))){
        const opt=document.createElement('option');
        opt.value=String(p.id); opt.textContent=String(p.name||p.id); sel.appendChild(opt);
      }
    }
    if(current&&[...sel.options].some(o=>String(o.value)===current))sel.value=current;
  }
  function syncShell(){
    syncNativeSelector();
    const name=activeName();
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
    if(ws){const small=ws.querySelector('small');if(small)small.textContent='Profile: '+name}
    const hero=$('.ops-hero p,.ops-hero-copy p,.ops-hero-sub');
    if(hero)hero.textContent=String(hero.textContent||'').replace(/^.*? · Create a label/i,name+' · Create a label');
    document.body.dataset.activeProfile=name;
  }
  function switchProfile(id,button){
    const idStr=String(id), list=profiles();
    if(!list.some(p=>String(p.id)===idStr))return;
    if(button){button.disabled=true;button.textContent='SWITCHING…'}
    const sel=nativeSelector();
    if(sel&&[...sel.options].some(o=>String(o.value)===idStr)){
      sel.value=idStr;
      sel.dispatchEvent(new Event('input',{bubbles:true}));
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
    try{window.PID=idStr}catch(_e){}
    writeActive(idStr);
    if(localStorage.getItem('lzb2.profile')!==idStr){
      if(button){button.disabled=false;button.textContent='OPEN / SWITCH'}
      alert('Profile switch could not be saved. Please retry.');
      return;
    }
    syncShell();
    setTimeout(()=>location.reload(),140);
  }
  function deleteProfile(id){
    const idStr=String(id), current=activeId();
    if(BUILTIN_PROFILES.some(p=>p.id===idStr)){alert('The built-in LUZDM company profile cannot be deleted.');return}
    if(idStr===current){alert('The active profile cannot be deleted. Switch to another profile first.');return}
    const list=profiles(); const p=list.find(x=>String(x.id)===idStr); if(!p)return;
    if(!confirm('Delete company profile “'+String(p.name||p.id)+'” from the profile list?'))return;
    const next=list.filter(x=>String(x.id)!==idStr);
    writeProfiles(next);
    try{window.PROFILES=next}catch(_e){}
    render(); syncShell();
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
    box.innerHTML=`<div class="v7-prof-head"><div><small>COMPANY WORKSPACE</small><h3>Existing Company Profiles</h3></div><span class="v7-prof-current">Active: ${esc(currentProfile?.name||activeName()||current||'None')}</span></div>
      <div class="v7-prof-grid">${list.length?list.map(p=>{const on=String(p.id)===current;const builtin=BUILTIN_PROFILES.some(x=>x.id===String(p.id));return `<article class="v7-prof-card ${on?'active':''}" data-profile-id="${esc(p.id)}"><div><b>${esc(p.name||p.id)}</b><small>${on?'Current workspace':builtin?'Built-in company profile':'Saved company profile'}</small></div><div class="v7-prof-actions">${on?'<span class="v7-prof-active">ACTIVE</span>':`<button type="button" data-v7-profile-open="${esc(p.id)}">OPEN / SWITCH</button>${builtin?'':'<button type="button" class="danger" data-v7-profile-delete="'+esc(p.id)+'">DELETE</button>'}`}</div></article>`}).join(''):'<div class="v7-prof-empty">No saved company profiles found on this device.</div>'}</div>
      <p class="v7-prof-note">Opening a profile switches the whole operational workspace to that company and reloads its saved data.</p>`;
    $$('[data-v7-profile-open]',box).forEach(b=>b.onclick=()=>switchProfile(b.dataset.v7ProfileOpen,b));
    $$('[data-v7-profile-delete]',box).forEach(b=>b.onclick=()=>deleteProfile(b.dataset.v7ProfileDelete));
  }
  function bindNativeSelector(){
    syncNativeSelector();
    const sel=nativeSelector(); if(!sel||sel.dataset.v7ProfileBound)return;
    sel.dataset.v7ProfileBound='1';
    sel.addEventListener('change',()=>{const value=String(sel.value||'');if(value)writeActive(value);setTimeout(()=>{syncShell();render()},0)});
  }
  function watch(){
    ensureBuiltinProfiles();
    bindNativeSelector(); syncShell(); render();
    new MutationObserver(()=>{
      bindNativeSelector();
      if(settingsHost()&&!$('#v7-existing-profiles',settingsHost()))render();
      if(!$('#v7-active-profile-badge'))syncShell();
    }).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-act="openSettings"],#top-settings-btn,[data-v7="settings"]'))setTimeout(render,80)},true);
    window.addEventListener('storage',e=>{if(ACTIVE_KEYS.includes(e.key)||PROFILE_KEYS.includes(e.key)){ensureBuiltinProfiles();syncShell();render()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();