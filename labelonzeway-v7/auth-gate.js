(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q);
let gate=null,host=null,loginOriginalParent=null,loginOriginalNext=null,pillObserver=null,bodyObserver=null;
function isSignedIn(){const pill=$('#cloud-sync-pill');if(!pill)return false;const t=(pill.textContent||'').toUpperCase();return !t.includes('SIGN IN')&&(pill.classList.contains('ok')||t.includes('SYNC')||t.includes('PENDING'));}
function ensureGate(){if(gate)return gate;gate=document.createElement('div');gate.id='v7-auth-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-label','LabelOnZeWay sign in');gate.innerHTML='<div id="v7-auth-card"><div id="v7-auth-brand"><div class="mark">LZ</div><div><b>LabelOnZeWay</b><small>SHIP · TRACK · DELIVER</small></div></div><h1 id="v7-auth-title">Sign in to continue</h1><p id="v7-auth-note">Use your company user account. The same login is used on iPhone, Android and Mac.</p><div id="v7-auth-host"></div><div id="v7-auth-wait">Preparing secure sign in…</div><div id="v7-auth-meta">Secure company workspace</div></div>';document.body.appendChild(gate);host=$('#v7-auth-host',gate);return gate;}
function mountLogin(){ensureGate();const login=$('#cloud-login');if(!login||login.parentElement===host)return !!login;if(!loginOriginalParent){loginOriginalParent=login.parentNode;loginOriginalNext=login.nextSibling;}host.appendChild(login);return true;}
function restoreLogin(){const login=$('#cloud-login');if(login&&login.parentElement===host&&loginOriginalParent){try{loginOriginalParent.insertBefore(login,loginOriginalNext&&loginOriginalNext.parentNode===loginOriginalParent?loginOriginalNext:null)}catch(_e){}}}
function showGate(){ensureGate();mountLogin();gate.classList.add('open');gate.classList.toggle('waiting',!$('#cloud-login'));document.body.classList.add('v7-auth-locked');}
function hideGate(){if(!gate)return;gate.classList.remove('open','waiting');document.body.classList.remove('v7-auth-locked');restoreLogin();try{window.LabelOnZeWayV7ShowView?.('home')}catch(_e){}}
function sync(){if(isSignedIn())hideGate();else showGate();}
function watchPill(){const pill=$('#cloud-sync-pill');if(!pill)return false;if(!pillObserver){pillObserver=new MutationObserver(sync);}pillObserver.disconnect();pillObserver.observe(pill,{attributes:true,childList:true,characterData:true,subtree:true});sync();return true;}
function install(){ensureGate();let tries=0;const timer=setInterval(()=>{tries++;mountLogin();if(watchPill()||tries>100)clearInterval(timer);sync();},100);bodyObserver=new MutationObserver(()=>{if(!$('#cloud-sync-pill'))return;watchPill();mountLogin();});bodyObserver.observe(document.body,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});window.addEventListener('pageshow',sync);sync();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
