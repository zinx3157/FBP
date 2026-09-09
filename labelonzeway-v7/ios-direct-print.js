(()=>{
  const PRINTER_IP='192.168.100.73';
  const PRINTER_PORT=9100;
  const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  const toast=(m,t='ok')=>{try{window.toast?.(m,t)}catch(_e){console.log(m)}};
  let probeState='configured';

  function labelText(){
    const node=document.querySelector('#pv-sheet');
    return (node?.innerText||node?.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
  }

  function payload(){return {host:PRINTER_IP,port:PRINTER_PORT,widthMm:72,cut:true,text:labelText(),title:'LabelOnZeWay'};}

  function setProbeState(state,detail=''){
    probeState=state;
    const el=document.querySelector('#v7-pos-probe-status');
    if(!el)return;
    const map={configured:['Configured','warn'],checking:['Checking…','warn'],reachable:['Printer reachable','ok'],unreachable:['Printer unreachable','err'],helper_missing:['Helper not installed','err']};
    const [label,cls]=map[state]||map.configured;
    el.className='v7-pos-probe-status '+cls;
    el.textContent=label+(detail?' · '+detail:'');
  }

  function callbackURL(){
    const u=new URL(location.href);
    u.searchParams.set('v','20260909f');
    u.searchParams.delete('posprobe');
    u.searchParams.delete('posdetail');
    return u.toString();
  }

  function readProbeCallback(){
    const p=new URLSearchParams(location.search);
    const result=p.get('posprobe');
    if(!result)return;
    const detail=p.get('posdetail')||'';
    if(result==='ok')setProbeState('reachable',detail||PRINTER_IP+':'+PRINTER_PORT);
    else setProbeState('unreachable',detail||PRINTER_IP+':'+PRINTER_PORT);
    try{sessionStorage.setItem('lz_pos_probe',JSON.stringify({result,detail,at:Date.now()}))}catch(_e){}
    const u=new URL(location.href);u.searchParams.delete('posprobe');u.searchParams.delete('posdetail');history.replaceState(null,'',u.toString());
  }

  function probe(){
    setProbeState('checking');
    const mh=window.webkit?.messageHandlers?.pos80cProbe;
    if(mh){
      try{mh.postMessage({host:PRINTER_IP,port:PRINTER_PORT});return}catch(_e){}
    }
    const url='labelonzewayprint://probe?host='+encodeURIComponent(PRINTER_IP)+'&port='+PRINTER_PORT+'&callback='+encodeURIComponent(callbackURL());
    location.href=url;
    setTimeout(()=>{if(probeState==='checking'){setProbeState('helper_missing');toast('Install/open the LabelOnZeWay iPhone Print Helper to verify the POS80C connection','err')}},1600);
  }

  function nativeProbeResult(ok,detail=''){
    setProbeState(ok?'reachable':'unreachable',detail||PRINTER_IP+':'+PRINTER_PORT);
    toast(ok?'POS80C connection confirmed':'POS80C is not reachable from this iPhone',ok?'ok':'err');
  }

  function directPrint(){
    const p=payload();
    if(!p.text){toast('Create or select a label before printing','err');return;}
    if(probeState!=='reachable'){
      toast('Confirm the iPhone → POS80C connection first','err');
      probe();
      return;
    }
    const mh=window.webkit?.messageHandlers?.pos80c;
    if(mh){try{mh.postMessage(p);toast('Sent to iPhone POS80C helper','ok');return}catch(_e){}}
    const url='labelonzewayprint://print?host='+encodeURIComponent(p.host)+'&port='+p.port+'&width=72&cut=1&text='+encodeURIComponent(p.text)+'&callback='+encodeURIComponent(callbackURL());
    location.href=url;
  }

  function addControls(){
    if(!isIOS())return;
    const actions=document.querySelector('#parcel-actions');
    if(!actions||document.querySelector('#v7-ios-direct-print'))return;
    const wrap=document.createElement('div');
    wrap.id='v7-ios-pos-controls';
    wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:8px';
    wrap.innerHTML='<button type="button" id="v7-pos-probe" class="btn dark">🔎 TEST IPHONE → POS80C</button><button type="button" id="v7-ios-direct-print" class="btn dark">📲 DIRECT IPHONE POS</button><div id="v7-pos-probe-status" class="v7-pos-probe-status warn" style="grid-column:1/-1;font-size:11px;padding:8px 10px;border:1px solid rgba(255,255,255,.15);border-radius:8px">Configured · not verified</div>';
    actions.appendChild(wrap);
    document.querySelector('#v7-pos-probe').onclick=e=>{e.preventDefault();e.stopPropagation();probe();};
    document.querySelector('#v7-ios-direct-print').onclick=e=>{e.preventDefault();e.stopPropagation();directPrint();};
    try{
      const saved=JSON.parse(sessionStorage.getItem('lz_pos_probe')||'null');
      if(saved&&Date.now()-saved.at<300000)setProbeState(saved.result==='ok'?'reachable':'unreachable',saved.detail||'');
    }catch(_e){}
  }

  window.LabelOnZeWayIOSPrint={directPrint,payload,probe,nativeProbeResult};
  readProbeCallback();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(addControls,300),{once:true});
  else setTimeout(addControls,300);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v7="label"],.v7-new'))setTimeout(addControls,200)},true);
})();
