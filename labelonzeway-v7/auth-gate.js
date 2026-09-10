(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q);
let gate=null,host=null,loginOriginalParent=null,loginOriginalNext=null;
let bootTimer=null,loginTimer=null,installed=false;

function cloudStatus(){
  try{return window.LabelOnZeWayCloud?.getStatus?.()||null}catch(_e){return null}
}
function isSignedIn(){
  const s=cloudStatus();
  if(s&&s.signedIn===true)return true;
  const pill=$('#cloud-sync-pill');
  if(!pill)return false;
  const t=(pill.textContent||'').toUpperCase();
  return !t.includes('SIGN IN')&&(pill.classList.contains('ok')||t.includes('SYNCED')||t.includes('PENDING'));
}
function ensureGate(){
  if(gate&&gate.isConnected)return gate;
  gate=document.createElement('div');
  gate.id='v7-auth-gate';
  gate.setAttribute('role','dialog');
  gate.setAttribute('aria-modal','true');
  gate.setAttribute('aria-label','LabelOnZeWay sign in');
  gate.innerHTML='<div id="v7-auth-card"><div id="v7-auth-brand"><div class="mark">LZ</div><div><b>LabelOnZeWay</b><small>SHIP · TRACK · DELIVER</small></div></div><h1 id="v7-auth-title">Sign in to continue</h1><p id="v7-auth-note">Use your company user account. The same login is used on iPhone, Android and Mac.</p><div id="v7-auth-host"></div><div id="v7-auth-wait">Preparing secure sign in…</div><div id="v7-auth-meta">Secure company workspace</div></div>';
  document.body.appendChild(gate);
  host=$('#v7-auth-host',gate);
  return gate;
}
function mountLogin(){
  ensureGate();
  const login=$('#cloud-login');
  if(!login)return false;
  if(login.parentElement===host)return true;
  if(!loginOriginalParent){loginOriginalParent=login.parentNode;loginOriginalNext=login.nextSibling;}
  host.appendChild(login);
  return true;
}
function restoreLogin(){
  const login=$('#cloud-login');
  if(login&&login.parentElement===host&&loginOriginalParent&&loginOriginalParent.isConnected){
    try{loginOriginalParent.insertBefore(login,loginOriginalNext&&loginOriginalNext.parentNode===loginOriginalParent?loginOriginalNext:null)}catch(_e){}
  }
}
function showGate(){
  ensureGate();
  const mounted=mountLogin();
  gate.classList.add('open');
  gate.classList.toggle('waiting',!mounted);
  document.body.classList.add('v7-auth-locked');
}
function hideGate(){
  if(!gate)return;
  gate.classList.remove('open','waiting');
  document.body.classList.remove('v7-auth-locked');
  restoreLogin();
  try{window.LabelOnZeWayV7ShowView?.('home')}catch(_e){}
}
function sync(){
  if(isSignedIn())hideGate();
  else showGate();
}
function stopLoginWatch(){if(loginTimer){clearInterval(loginTimer);loginTimer=null;}}
function watchLoginResult(){
  stopLoginWatch();
  let checks=0;
  loginTimer=setInterval(()=>{
    checks++;
    if(isSignedIn()){
      stopLoginWatch();
      hideGate();
      return;
    }
    if(checks>=32){stopLoginWatch();sync();}
  },250);
}
function startBootChecks(){
  if(bootTimer)return;
  let checks=0;
  bootTimer=setInterval(()=>{
    checks++;
    mountLogin();
    if(isSignedIn()){
      clearInterval(bootTimer);bootTimer=null;hideGate();return;
    }
    showGate();
    if(checks>=40){clearInterval(bootTimer);bootTimer=null;}
  },250);
}
function install(){
  if(installed)return;installed=true;
  ensureGate();
  showGate();
  startBootChecks();
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#cloud-sign-in'))watchLoginResult();
    if(e.target.closest?.('#cloud-sign-out'))setTimeout(showGate,0);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&gate?.classList.contains('open')&&e.target.closest?.('#cloud-login'))watchLoginResult();
  },true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
  window.addEventListener('pageshow',sync);
  window.addEventListener('online',sync);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
