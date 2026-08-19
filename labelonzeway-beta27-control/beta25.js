(function(){
  'use strict';
  function init(){
    var pill=document.querySelector('.b2-beta-pill');
    if(pill)pill.textContent='BETA 2.5 · 253';
    document.documentElement.dataset.design='control-room-25';
    document.title='LabelOnZeWay Beta 2.5 · Control Room';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
