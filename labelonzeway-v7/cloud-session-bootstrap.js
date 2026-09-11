(()=>{
'use strict';
let done=false,tries=0,timer=null;
const $=(q,r=document)=>r.querySelector(q);
const isLocalAudit=(()=>{try{return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&new URLSearchParams(location.search).get('audit')==='1'}catch(_e){return false}})();
function status(){try{return window.LabelOnZeWayCloud?.getStatus?.()||null}catch(_e){return null}}
function updateShell(text,sub){const el=$('.v7-sync');if(!el)return;el.innerHTML=`${text}<small>${sub}</small>`}
async function bootstrap(){
  if(done)return true;
  const api=window.LabelOnZeWayCloud,s=status();
  if(!api||!s?.signedIn||!s?.workspaceId)return false;
  done=true;
  updateShell('● Cloud connected','Supabase session active');
  try{
    // syncNow performs the authenticated workspace pull first, which rehydrates
    // company profiles and operational records before the user starts work.
    if(typeof api.syncNow==='function')await api.syncNow();
    const now=status()||s;
    const printReady=typeof api.enqueueCloudPrintJob==='function'&&!!now.workspaceId&&now.signedIn===true;
    updateShell(printReady?'● Cloud + Print ready':'● Cloud connected',printReady?'Profiles synced · Cloud Print ready':'Profiles synced · Supabase active');
    document.dispatchEvent(new CustomEvent('v7:cloudready',{detail:{workspaceId:now.workspaceId||'',printReady}}));
  }catch(e){
    done=false;
    updateShell('● Cloud connected','Sync retry available');
    console.warn('V7 cloud bootstrap:',e?.message||e);
  }
  return done;
}
function start(){
  if(timer){clearInterval(timer);timer=null}
  tries=0;
  if(isLocalAudit)return;
  bootstrap();
  timer=setInterval(async()=>{
    tries++;
    if(await bootstrap()||tries>=30){clearInterval(timer);timer=null}
  },500);
}
document.addEventListener('click',e=>{if(e.target.closest?.('#v7-auth-submit,#cloud-sign-in')){done=false;setTimeout(start,150)}},true);
document.addEventListener('v7:authsuccess',()=>{done=false;start()});
window.addEventListener('pageshow',()=>{done=false;start()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
