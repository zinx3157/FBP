(function(){
  'use strict';
  document.documentElement.dataset.uatDesign='ios-dispatch';
  document.title='LabelOnZeWay UAT · iOS Dispatch';
  var h=document.getElementById('ops-home-title');if(h)h.textContent='Photo to label. One clean flow.';
  var p=document.getElementById('ops-shop-name');if(p)p.textContent='Capture the parcel, confirm the customer and amount, then print, share or add it to today’s manifest.';
  var brand=document.querySelector('.brand h1');if(brand&&!document.querySelector('.uat-design-pill'))brand.insertAdjacentHTML('afterend','<span class="b2-beta-pill uat-design-pill">UAT B · iOS DISPATCH</span>');
  var customer=document.querySelector('#card-recipient .card-head h2');if(customer)customer.textContent='CUSTOMER';
  var parcel=document.querySelector('#card-parcel .card-head h2');if(parcel)parcel.textContent='SCAN & CREATE LABEL';
  var summary=document.querySelector('#photo-tools>summary');if(summary)summary.firstChild.textContent='📷 CAPTURE / PHOTO INBOX ';
})();
