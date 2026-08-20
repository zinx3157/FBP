(function(){
'use strict';
var ROLE=document.documentElement.dataset.releaseRole||'command';
var LABELS={command:'COMMAND CONTROL',guided:'GUIDED LABEL',rider:'RIDER DISPATCH'};
function byId(id){return document.getElementById(id)}
function notify(message,type){if(typeof window.toast==='function')window.toast(message,type||'ok');else window.alert(message)}
function addPersistentTracking(){
  if(byId('b30-tracking'))return;
  var button=document.createElement('button');
  button.id='b30-tracking';button.type='button';button.className='b29-tracking';
  button.innerHTML='<span>◎</span><b>TRACKING</b>';
  button.setAttribute('aria-label','Open parcel tracking platform');
  button.onclick=function(){
    var existing=document.querySelector('[data-b26-tracking]');
    if(existing){existing.click();return}
    notify('Tracking module did not load. Refresh this Beta 3.0 page.','err');
  };
  document.body.appendChild(button);
}
function lockRole(){
  document.body.dataset.b28Mode=ROLE;
  localStorage.setItem('lz.beta28.mode',ROLE);
  document.querySelectorAll('[data-b28-mode]').forEach(function(button){
    button.hidden=button.dataset.b28Mode!==ROLE;
    button.setAttribute('aria-pressed',String(button.dataset.b28Mode===ROLE));
  });
  var bar=byId('b28-modebar');if(bar){bar.dataset.locked='true';bar.setAttribute('aria-label',LABELS[ROLE]+' beta')}
  var pill=document.querySelector('.b2-beta-pill');if(pill)pill.textContent='BETA 3.0 · APPROVED FRONTEND · '+LABELS[ROLE];
}
function showRole(){
  if(ROLE==='guided'&&typeof window.showMobileView==='function')window.showMobileView('new');
  if(ROLE==='rider'){
    if(typeof window.showMobileView==='function')window.showMobileView('home');
    setTimeout(function(){var open=document.querySelector('[data-b27-open="rider"]');if(open)open.click()},300);
  }
}
function installPrintFallback(){
  if(typeof window.doPrint!=='function'||window.doPrint.__b30)return;
  var original=window.doPrint;
  window.doPrint=function(mode,html,rows){
    if(mode!=='label'||!window.state||state.shop.printMode!=='direct')return original.apply(this,arguments);
    var config=typeof window.printerConfig==='function'?window.printerConfig(false):null;
    if(!config||!config.bridge||!config.ip){
      notify('Direct POS printing needs the Mac gateway and printer IP. Opening system print instead.','err');
      var saved=state.shop.printMode;state.shop.printMode='browser';
      try{return original.call(this,mode,html,rows)}finally{state.shop.printMode=saved}
    }
    var args=arguments,controller=window.AbortController?new AbortController():null,timer=controller?setTimeout(function(){controller.abort()},1800):null;
    fetch(config.bridge.replace(/\/$/,'')+'/health?printer_ip='+encodeURIComponent(config.ip)+'&printer_port='+encodeURIComponent(config.port),{cache:'no-store',signal:controller&&controller.signal}).then(function(response){
      if(!response.ok)throw new Error('gateway unavailable');return response.json();
    }).then(function(data){
      if(data.printer_ok===false)throw new Error(data.printer_error||'printer unavailable');
      original.apply(window,args);
    }).catch(function(){
      notify('POS gateway/printer not reachable. Opening system print fallback.','err');
      var saved=state.shop.printMode;state.shop.printMode='browser';
      try{original.apply(window,args)}finally{state.shop.printMode=saved}
    }).finally(function(){if(timer)clearTimeout(timer)});
  };
  window.doPrint.__b30=true;
  if(window.ACTIONS){
    ACTIONS.printRow=function(id){var row=state.manifest.find(function(item){return item.id===id});if(row)window.printLabel(row)};
  }
}
function init(){lockRole();addPersistentTracking();installPrintFallback();showRole()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0)});else setTimeout(init,0);
})();
