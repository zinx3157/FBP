(function(){
  'use strict';
  document.documentElement.dataset.uatDesign='control-room';
  document.title='LabelOnZeWay UAT · Control Room';
  var h=document.getElementById('ops-home-title');if(h)h.textContent='Dispatch control, without the noise.';
  var p=document.getElementById('ops-shop-name');if(p)p.textContent='Customers, scanned parcels, financial control, live labels and manifest exceptions in one operational console.';
  var brand=document.querySelector('.brand h1');if(brand&&!document.querySelector('.uat-design-pill'))brand.insertAdjacentHTML('afterend','<span class="b2-beta-pill uat-design-pill">UAT A · CONTROL ROOM</span>');
  var customer=document.querySelector('#card-recipient .card-head h2');if(customer)customer.textContent='CUSTOMER DESK';
  var parcel=document.querySelector('#card-parcel .card-head h2');if(parcel)parcel.textContent='LABEL WORKBENCH';
})();
