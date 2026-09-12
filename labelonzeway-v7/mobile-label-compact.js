(()=>{
'use strict';
function compactLabel(){
  if(!matchMedia('(max-width:900px)').matches)return;
  const map={customer:'Customer',details:'Label',preview:'Review'};
  document.querySelectorAll('#v7-label-stepbar .v7-step[data-step]').forEach((step,i)=>{
    const key=step.dataset.step;
    const b=step.querySelector('b');
    const small=step.querySelector('small');
    if(b&&map[key])b.textContent=(i+1)+' · '+map[key];
    if(small)small.textContent='';
  });
  const parcel=document.querySelector('#card-parcel .card-head h2');
  if(parcel)parcel.textContent='LABEL DETAILS';
  const preview=document.querySelector('#card-preview .card-head h2');
  if(preview)preview.textContent='REVIEW & PRINT';
}
const boot=()=>{compactLabel();[150,500,1200].forEach(ms=>setTimeout(compactLabel,ms))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
