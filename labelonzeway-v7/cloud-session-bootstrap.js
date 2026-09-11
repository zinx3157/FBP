(()=>{
'use strict';
let done=false,tries=0,timer=null;
const $=(q,r=document)=>r.querySelector(q);
function status(){try{return window.LabelOnZeWayCloud?.getStatus?.()||null}catch(_e){return null}}
function updateShell(text,sub){const el=$('.v7-sync');if(!el)return;el.innerHTML=`${text}<small>${sub}</small>`}
async function bootstrap(){
  if(done)return true;
  const api=window.LabelOnZeWayCloud,s=status();
  if(!api||!s?.signedIn||!s?.workspaceId)return false;
  done=true;
  updateShell('● Cloud connected','Supabase session active');
  try{
    if(typeof api.syncNow==='function')await api.syncNow();
    const now=status()||s;
    const printReady=typeof api.enqueueCloudPrintJob==='function'&&!!now.workspaceId&&now.signedIn===true;
    updateShell(printReady?'● Cloud + Print ready':'● Cloud connected',printReady?'Supabase sync + Cloud Print':'Supabase sync active');
    document.dispatchEvent(new CustomEvent('v7:cloudready',{detail:{workspaceId:now.workspaceId||'',printReady}}));
  }catch(e){
    done=false;
    updateShell('● Cloud connected','Sync retry available');
    console.warn('V7 cloud bootstrap:',e?.message||e);
  }
  return done;
}
function start(){
  bootstrap();
  timer=setInterval(async()=>{
    tries++;
    if(await bootstrap()||tries>=30){clearInterval(timer);timer=null}
  },500);
}
document.addEventListener('v7:authsuccess',()=>{done=false;tries=0;start()});
window.addEventListener('pageshow',()=>{done=false;tries=0;start()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
