(()=>{
  const PRINTER_IP='192.168.100.73';
  const PRINTER_PORT=9100;
  const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  const toast=(m,t='ok')=>{try{window.toast?.(m,t)}catch(_e){console.log(m)}};

  function labelText(){
    const node=document.querySelector('#pv-sheet');
    return (node?.innerText||node?.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
  }

  function payload(){
    return {
      host:PRINTER_IP,
      port:PRINTER_PORT,
      widthMm:72,
      cut:true,
      text:labelText(),
      title:'LabelOnZeWay'
    };
  }

  function directPrint(){
    const p=payload();
    if(!p.text){toast('Create or select a label before printing','err');return;}

    // Native LabelOnZeWay iOS wrapper/helper: preferred path.
    const mh=window.webkit?.messageHandlers?.pos80c;
    if(mh){
      try{mh.postMessage(p);toast('Sent to iPhone POS80C helper','ok');return}catch(_e){}
    }

    // Standalone helper app handoff from Safari/PWA.
    const url='labelonzewayprint://print?host='+encodeURIComponent(p.host)+
      '&port='+p.port+'&width=72&cut=1&text='+encodeURIComponent(p.text);
    window.location.href=url;
    setTimeout(()=>toast('If the print helper is not installed, use System Print or the Mac Bridge','err'),1200);
  }

  function addButton(){
    if(!isIOS())return;
    const actions=document.querySelector('#parcel-actions');
    if(!actions||document.querySelector('#v7-ios-direct-print'))return;
    const b=document.createElement('button');
    b.type='button';
    b.id='v7-ios-direct-print';
    b.className='btn dark';
    b.style.flex='1';
    b.textContent='📲 DIRECT IPHONE POS';
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();directPrint();});
    actions.appendChild(b);
  }

  window.LabelOnZeWayIOSPrint={directPrint,payload};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(addButton,300),{once:true});
  else setTimeout(addButton,300);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v7="label"],.v7-new'))setTimeout(addButton,200)},true);
})();
