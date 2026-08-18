(function(){
  'use strict';
  var here=location.pathname.indexOf('beta25-mobile')>=0?'mobile':'control';
  var params=new URLSearchParams(location.search);
  var chosen=params.get('design');
  if(chosen===here){document.documentElement.dataset.uatGate='confirmed';return}
  document.documentElement.dataset.uatGate='waiting';
  function target(design){
    var base=design==='mobile'?'/labelonzeway-beta25-mobile/index.html':'/labelonzeway-beta25-control/index.html';
    return base+'?v=252&design='+design;
  }
  function mount(){
    var gate=document.createElement('div');gate.id='uat-design-gate';
    gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','uat-gate-title');
    gate.innerHTML='<main class="uat-gate-shell"><header class="uat-gate-brand"><div class="uat-gate-logo">LZ</div><div><h1>LabelOnZeWay</h1><p>Mandatory Beta 2.5 design selection · Build 252</p></div></header><section class="uat-gate-intro"><small>CHOOSE BEFORE CONTINUING</small><h2>Which interface<br>do you want to test?</h2><p>The operational screen remains locked until one design is selected. Both options use the same workflow and private UAT data.</p></section><section class="uat-gate-options"><button class="uat-gate-option" type="button" data-uat-choice="control"><span class="uat-gate-number">01</span><h3>Control Room</h3><p>Stitch-derived desktop console with customer desk left, workbench centre and preview right.</p><span class="uat-gate-tags"><span>Desktop-first</span><span>Three columns</span><span>Deep ocean</span></span><span class="uat-gate-open"><span>Select Control Room</span><b>→</b></span></button><button class="uat-gate-option" type="button" data-uat-choice="mobile"><span class="uat-gate-number">02</span><h3>Mobile Dispatch</h3><p>Stitch-derived photo-first mobile workflow with floating scan confirmation and soft themes.</p><span class="uat-gate-tags"><span>Mobile-first</span><span>Photo workflow</span><span>Soft dark</span></span><span class="uat-gate-open"><span>Select Mobile Dispatch</span><b>→</b></span></button></section><p class="uat-gate-required">A selection is required. This screen cannot be skipped.</p></main>';
    document.body.appendChild(gate);
    gate.addEventListener('click',function(e){var button=e.target.closest('[data-uat-choice]');if(button)location.href=target(button.getAttribute('data-uat-choice'))});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
