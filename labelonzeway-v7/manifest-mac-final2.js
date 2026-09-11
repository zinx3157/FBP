(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q);
function wrap(){return $('#card-manifest .tbl-wrap,#card-manifest .table-wrap,#card-manifest .manifest-table-wrap')}
function resetCompactScroll(){if(!document.body.classList.contains('v7-manifest-expanded')){const w=wrap();if(w)w.scrollLeft=0}}
function syncToggle(){const b=$('#v7-manifest-toggle');if(!b)return;const expanded=document.body.classList.contains('v7-manifest-expanded');b.textContent=expanded?'Compact':'Edit All Columns';if(!expanded)resetCompactScroll()}
document.addEventListener('click',e=>{
  const t=e.target.closest?.('#v7-manifest-toggle');
  if(t)setTimeout(()=>{syncToggle();resetCompactScroll()},0);
  if(e.target.closest?.('[data-v7="manifest"]'))setTimeout(()=>{syncToggle();resetCompactScroll()},80);
},true);
const obs=new MutationObserver(()=>{if(document.body.classList.contains('mf-manifest-active')){syncToggle();resetCompactScroll()}});
obs.observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>{if(document.body.classList.contains('mf-manifest-active'))resetCompactScroll()},{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{syncToggle();resetCompactScroll()},100),{once:true});else setTimeout(()=>{syncToggle();resetCompactScroll()},100);
})();
