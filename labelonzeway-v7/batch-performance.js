(()=>{
  const originalHandleFiles=window.handleFiles;
  const originalMakeBatchItem=window.makeBatchItem;
  const originalProcessBatch=window.processBatch;
  let loadingBatch=false;
  let processing=false;

  function autoEnabled(){try{return !!document.getElementById('f-auto')?.checked}catch(_e){return false}}
  function safeRender(){try{window.renderBatch?.()}catch(_e){}}
  function safeRenderRow(it){try{window.renderBatchRow?.(it)}catch(_e){}}

  function makeCompactItem(file){
    return new Promise(resolve=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{
        try{
          const preview=window.scaleTo?window.scaleTo(img,320,.72):url;
          const ocr=window.scaleTo?window.scaleTo(img,820,.78):url;
          resolve({
            id:'b'+Date.now()+Math.random().toString(36).slice(2,7),
            img:preview,
            imgOCR:ocr,
            imgBig:ocr,
            fileRef:file,
            qty:1,copies:1,price:null,cod:null,ship:(window.SHIP_RATES&&window.SHIP_RATES[0])||0,
            shipManual:false,recId:'',pay:'COD',found:[],detectedContact:null,
            status:'waiting',contactDetected:false,msg:autoEnabled()?'QUEUED':'Queued',err:false
          });
        }catch(_e){resolve(null)}
        URL.revokeObjectURL(url);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);resolve(null)};
      img.src=url;
    });
  }

  async function handleFilesFast(files){
    files=[...(files||[])].filter(f=>f&&f.type&&f.type.startsWith('image/'));
    if(!files.length){try{window.toast?.('Not an image file','err')}catch(_e){};return}
    if(files.length===1){return originalHandleFiles?.(files)}
    if(loadingBatch)return;
    loadingBatch=true;
    try{
      try{window.toast?.(files.length+' photos → optimized batch','ok')}catch(_e){}
      const queue=files.slice();
      const workers=Math.min(3,queue.length);
      const created=[];
      async function loader(){
        while(queue.length){
          const file=queue.shift();
          const it=await makeCompactItem(file);
          if(it){created.push(it);window.state.batch.push(it)}
          if(created.length%3===0||!queue.length)safeRender();
        }
      }
      await Promise.all(Array.from({length:workers},loader));
      if(autoEnabled())window.processBatch?.();
    }finally{loadingBatch=false}
  }

  function captureDetectedContact(it,text){
    try{
      if(typeof window.extractContact!=='function')return;
      const c=window.extractContact(text||'');
      if(c&&(c.phone||c.address||c.name))it.detectedContact=c;
    }catch(_e){}
  }

  async function scanOne(it){
    it.status='scanning';it.found=[];it.msg='SCANNING…';safeRenderRow(it);
    const im=await window.loadImage(it.imgOCR||it.imgBig||it.img);
    let lastPaint=0;
    const out=await window.runPipeline(im,window.passesFast(im),(i,n,total)=>{
      const now=performance.now();
      it.msg='SCAN '+(i+1)+'/'+total+' — '+n;
      if(now-lastPaint>140){lastPaint=now;safeRenderRow(it)}
    });
    it.found=out.found||[];
    captureDetectedContact(it,(out.texts||[]).join('\n'));
    it.contactDetected=false;
    if(it.found.length){
      const best=window.bestOf(it.found)[0];
      it.price=best.v;
      if(it.cod===null||it.cod==='')it.cod=best.v;
      it.status='done';
      it.msg=(out.anchored?'✓ PRIX: ':'✓ ')+window.money(best.v);
    }else{
      it.status='none';it.msg='No « prix » — enter manually';
    }
  }

  async function processBatchFast(){
    if(processing)return;
    processing=true;
    try{
      let completed=0;
      while(true){
        const it=window.state?.batch?.find(b=>b.status==='waiting');
        if(!it)break;
        try{await scanOne(it)}catch(_e){it.status='error';it.msg='Scan failed — 🔁 retry';it.err=true}
        completed++;safeRenderRow(it);
        if(completed%4===0)await new Promise(r=>setTimeout(r,0));
      }
    }finally{processing=false;try{window.batchBusy=false}catch(_e){}}
  }

  function install(){
    if(typeof window.handleFiles==='function')window.handleFiles=handleFilesFast;
    if(typeof window.makeBatchItem==='function')window.makeBatchItem=makeCompactItem;
    if(typeof window.processBatch==='function')window.processBatch=processBatchFast;
    window.LabelOnZeWayBatchPerformance={installed:true,originalHandleFiles,originalMakeBatchItem,originalProcessBatch};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else setTimeout(install,0);
})();
