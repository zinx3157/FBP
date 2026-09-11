import { chromium, webkit } from 'playwright';

const base='http://127.0.0.1:4173/labelonzeway-v7/?audit=1';
const failures=[];
const engines=[['chromium',chromium],['webkit',webkit]];
const profiles=[
  {name:'iphone15pro',width:393,height:852},
  {name:'galaxy-s20plus',width:384,height:854},
  {name:'android-412',width:412,height:915}
];
function fail(e,p,m){failures.push(`${e}/${p}: ${m}`)}
for(const [engineName,browserType] of engines){
  const browser=await browserType.launch({headless:true});
  for(const p of profiles){
    const page=await browser.newPage({viewport:{width:p.width,height:p.height},isMobile:true,hasTouch:true});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    try{
      await page.goto(base,{waitUntil:'networkidle',timeout:30000});
      await page.waitForSelector('#v7-shell',{timeout:15000});
      await page.waitForTimeout(250);

      const cloudContract=await page.evaluate(()=>({
        syncNow:typeof window.LabelOnZeWayCloud?.syncNow==='function',
        cloudPrint:typeof window.LabelOnZeWayCloud?.enqueueCloudPrintJob==='function',
        status:typeof window.LabelOnZeWayCloud?.getStatus==='function',
        bootstrap:[...document.scripts].some(s=>/cloud-session-bootstrap\.js/.test(s.src))
      }));
      if(!cloudContract.syncNow||!cloudContract.cloudPrint||!cloudContract.status||!cloudContract.bootstrap)fail(engineName,p.name,`Supabase/Cloud Print contract incomplete ${JSON.stringify(cloudContract)}`);

      await page.evaluate(()=>window.LabelOnZeWayV7ShowView?.('label'));
      await page.waitForTimeout(120);
      await page.evaluate(()=>window.LabelOnZeWayV7SetStep?.('details'));
      await page.waitForTimeout(80);
      const price=await page.evaluate(()=>{
        const wrap=document.querySelector('#f-price')?.closest('.money-wrap');
        const prefix=wrap?.querySelector('span'); const input=document.querySelector('#f-price');
        if(!wrap||!input)return {missing:true};
        input.value='0'; input.dispatchEvent(new Event('input',{bubbles:true}));
        const ir=input.getBoundingClientRect(),pr=prefix?.getBoundingClientRect(),pcs=prefix?getComputedStyle(prefix):null;
        const overlap=prefix&&pcs.display!=='none'&&Math.max(0,Math.min(ir.right,pr.right)-Math.max(ir.left,pr.left))>1;
        return {missing:false,overlap,inputWidth:ir.width,prefixDisplay:pcs?.display||'none',visible:getComputedStyle(input).display!=='none'};
      });
      if(price.missing)fail(engineName,p.name,'price input or money wrapper missing');
      if(price.overlap)fail(engineName,p.name,'Ar prefix overlaps price value');
      if(!price.visible||price.inputWidth<120)fail(engineName,p.name,`visible price input too narrow ${price.inputWidth}`);

      for(const step of ['customer','details','preview']){
        const loc=page.locator(`.v7-step[data-step="${step}"]`);
        await loc.evaluate(el=>el.click()); await page.waitForTimeout(60);
        const state=await page.evaluate(s=>({body:document.body.classList.contains(`v7-mobile-step-${s}`),active:document.querySelector(`.v7-step[data-step="${s}"]`)?.classList.contains('active')}),step);
        if(!state.body||!state.active)fail(engineName,p.name,`label step navigation stuck at ${step}`);
      }
      for(const view of ['manifest','home','label','more']){
        const b=page.locator(`.v7-nav button[data-v7="${view}"]`); await b.evaluate(el=>el.click()); await page.waitForTimeout(70);
        if(view!=='label'){
          const id={manifest:'card-manifest',home:'card-home',more:'card-more'}[view];
          const ok=await page.locator('#'+id).evaluate(el=>el.classList.contains('v7-active')&&getComputedStyle(el).display!=='none');
          if(!ok)fail(engineName,p.name,`mobile nav stuck opening ${view}`);
        }
      }

      const archiveBtn=page.locator('#v7-mobile-archive-open');
      if(!(await archiveBtn.count())||!(await archiveBtn.isVisible()))fail(engineName,p.name,'mobile Archive shortcut missing');
      else{
        await archiveBtn.evaluate(el=>el.click()); await page.waitForTimeout(160);
        const open=await page.locator('#m-arch').evaluate(el=>el.classList.contains('open'));
        if(!open)fail(engineName,p.name,'Archive shortcut did not open archive modal');
        await page.evaluate(()=>document.querySelector('#m-arch')?.classList.remove('open'));
      }

      await page.evaluate(()=>window.LabelOnZeWayV7ShowView?.('label')); await page.waitForTimeout(80);
      const scroll=await page.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);return new Promise(resolve=>requestAnimationFrame(()=>resolve({y:window.scrollY,max:Math.max(0,document.documentElement.scrollHeight-innerHeight),bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow}))) });
      if(scroll.max>20&&scroll.y<scroll.max-8)fail(engineName,p.name,`cannot scroll fully to bottom y=${scroll.y} max=${scroll.max}`);
      if(scroll.bodyOverflow==='hidden'||scroll.htmlOverflow==='hidden')fail(engineName,p.name,`scroll locked body=${scroll.bodyOverflow} html=${scroll.htmlOverflow}`);
      if(errors.length)fail(engineName,p.name,`console/page errors: ${errors.slice(0,4).join(' | ')}`);
    }catch(e){fail(engineName,p.name,`fatal: ${e.message.split('\n')[0]}`)}
    await page.close();
  }
  await browser.close();
}
if(failures.length){console.error(`FINAL UAT TARGETED AUDIT FAILED (${failures.length})`);failures.forEach(x=>console.error('- '+x));process.exit(1)}
console.log('FINAL UAT TARGETED AUDIT PASS: mobile archive opens, Ariary/0 price geometry does not overlap, label steps and bottom navigation remain responsive, page reaches full scroll bottom, Supabase sync + Cloud Print API contract present in Chromium and WebKit.');
