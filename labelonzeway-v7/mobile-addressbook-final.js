(()=>{
'use strict';
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
function directChildOf(node,parent){let n=node;while(n&&n.parentElement&&n.parentElement!==parent)n=n.parentElement;return n&&n.parentElement===parent?n:null}
function decorateRows(){
  const modal=$('#m-addr');if(!modal)return;
  $$('.ab-item',modal).forEach(row=>{
    const info=$('.ab-info',row), cb=$('.am-check',row);
    if(info)info.style.minWidth='0';
    let actions=$('.mobile-ab-actions',row);
    if(!actions){actions=document.createElement('div');actions.className='mobile-ab-actions';row.appendChild(actions)}
    [...row.children].filter(el=>el.tagName==='BUTTON'||el.classList?.contains('v7-use-customer')).forEach(el=>actions.appendChild(el));
    if(cb&&cb.parentElement===row)cb.classList.add('mobile-ab-check');
  });
}
function rearrange(){
  const modal=$('#m-addr');if(!modal)return;
  const box=$('.modal-box',modal)||modal;
  const list=$('#am-list',modal);if(!list)return;
  const toolbar=$$('.rec-toolbar',modal).find(x=>/Deep Rescue|Export/i.test(x.textContent||''));
  const selectTools=$('#am-select-tools',modal);
  let tools=$('#mobile-ab-tools',modal);
  if(!tools){tools=document.createElement('details');tools.id='mobile-ab-tools';tools.innerHTML='<summary>Address book tools <span>▾</span></summary><div class="mobile-ab-tools-body"></div>';}
  const toolsBody=$('.mobile-ab-tools-body',tools);
  if(toolbar)toolsBody.appendChild(toolbar);
  if(selectTools)toolsBody.appendChild(selectTools);

  const name=$('#am-name',modal);
  let addBlock=name?directChildOf(name,box):null;
  if(addBlock===tools||addBlock===list)addBlock=null;
  let add=$('#mobile-ab-add',modal);
  if(!add){add=document.createElement('details');add.id='mobile-ab-add';add.innerHTML='<summary>Add customer / address <span>＋</span></summary><div class="mobile-ab-add-body"></div>';}
  const addBody=$('.mobile-ab-add-body',add);
  if(addBlock&&addBlock!==add&&addBlock!==tools&&addBlock.parentElement===box)addBody.appendChild(addBlock);

  if(tools.parentElement!==box)box.appendChild(tools);else box.appendChild(tools);
  if(add.parentElement!==box)box.appendChild(add);else box.appendChild(add);
  decorateRows();
}
function boot(){
  rearrange();
  const modal=$('#m-addr');
  if(modal)new MutationObserver(()=>requestAnimationFrame(()=>{decorateRows();rearrange()})).observe(modal,{childList:true,subtree:true});
  [200,600,1400].forEach(ms=>setTimeout(rearrange,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
