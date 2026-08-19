(function(){
  'use strict';
  function init(){
    var pill=document.querySelector('.b2-beta-pill');
    if(pill)pill.textContent='BETA 2.5 · 253';
    document.documentElement.dataset.design='mobile-dispatch-25';
    document.title='LabelOnZeWay Beta 2.5 · Mobile Dispatch';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
