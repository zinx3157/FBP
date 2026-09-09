import { chromium, webkit } from 'playwright';

const base='http://127.0.0.1:4173/labelonzeway-v7/?audit=1';
const failures=[];
const engines=[['chromium',chromium],['webkit',webkit]];
const profiles=[
  {name:'desktop-1440',width:1440,height:900,mobile:false},
  {name:'desktop-1280',width:1280,height:800,mobile:false},
  {name:'iphone-390',width:390,height:844,mobile:true},
  {name:'iphone-375',width:375,height:812,mobile:true},
];

function fail(engine,profile,msg){failures.push(`${engine}/${profile}: ${msg}`)}

async function assertResponsive(page,engine,profile,label){
  const t=Date.now();
  try{
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const elapsed=Date.now()-t;
    if(elapsed>1200)fail(engine,profile,`${label} UI heartbeat slow: ${elapsed}ms`);
  }catch(e){fail(engine,profile,`${label} UI heartbeat failed: ${e.message.split('\n')[0]}`)}
}

for(const [engineName,browserType] of engines){
  const browser=await browserType.launch({headless:true});
  for(const p of profiles){
    const page=await browser.newPage({viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:p.mobile});
    page.setDefaultTimeout(5000);
    const consoleErrors=[];
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('pageerror',e=>consoleErrors.push(`pageerror: ${e.message}`));

    try{
      await page.goto(base,{waitUntil:'networkidle',timeout:30000});
      await page.waitForSelector('#v7-shell',{timeout:15000});
      await assertResponsive(page,engineName,p.name,'initial load');

      const geometry=await page.evaluate(()=>{
        const vw=document.documentElement.clientWidth,sw=document.documentElement.scrollWidth;
        const visible=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')].filter(el=>{
          const cs=getComputedStyle(el),r=el.getBoundingClientRect();
          return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0;
        });
        const small=visible.filter(el=>{const r=el.getBoundingClientRect();return matchMedia('(max-width:900px)').matches&&!el.disabled&&(r.width<40||r.height<40)}).map(el=>({tag:el.tagName,id:el.id,w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));
        return {vw,sw,small:small.slice(0,20),controlCount:visible.length};
      });
      if(geometry.sw>geometry.vw+2)fail(engineName,p.name,`horizontal overflow ${geometry.sw}>${geometry.vw}`);
      if(p.mobile&&geometry.small.length)fail(engineName,p.name,`touch targets below 40px ${JSON.stringify(geometry.small)}`);
      if(geometry.controlCount<5)fail(engineName,p.name,`low visible control count ${geometry.controlCount}`);

      // Stress the exact paths reported as freezing/unresponsive.
      for(let i=0;i<12;i++){
        for(const item of ['manifest','batch','home']){
          const sel=`.v7-nav button[data-v7="${item}"]`;
          if(p.mobile)await page.locator(sel).tap();else await page.locator(sel).click();
          await page.waitForTimeout(25);
          const active=await page.locator(sel).evaluate(el=>el.classList.contains('active'));
          if(!active)fail(engineName,p.name,`${item} did not activate on stress cycle ${i+1}`);
          const cardId={manifest:'#card-manifest',batch:'#card-batch',home:'#card-home'}[item];
          const visible=await page.locator(cardId).evaluate(el=>getComputedStyle(el).display!=='none'&&el.classList.contains('v7-active'));
          if(!visible)fail(engineName,p.name,`${item} card not visibly active on cycle ${i+1}`);
          await assertResponsive(page,engineName,p.name,`${item} cycle ${i+1}`);
        }
      }

      // Manifest-specific render/toggle must remain responsive.
      const manifest='.v7-nav button[data-v7="manifest"]';
      if(p.mobile)await page.locator(manifest).tap();else await page.locator(manifest).click();
      await page.waitForTimeout(80);
      if(await page.locator('#v7-manifest-toggle').count()){
        for(let i=0;i<4;i++){
          await page.locator('#v7-manifest-toggle').click();
          await assertResponsive(page,engineName,p.name,`manifest toggle ${i+1}`);
        }
      }

      // Simulate stale legacy scroll locks seen after save/modal operations, then navigate.
      await page.evaluate(()=>{
        document.documentElement.style.overflow='hidden';
        document.body.style.overflow='hidden';
        document.body.style.position='fixed';
        document.body.style.height='100%';
        document.body.classList.add('modal-open','no-scroll','lz-mobile-focus');
      });
      const home='.v7-nav button[data-v7="home"]';
      if(p.mobile)await page.locator(home).tap();else await page.locator(home).click();
      await page.waitForTimeout(100);
      const lock=await page.evaluate(()=>({
        html:getComputedStyle(document.documentElement).overflow,
        body:getComputedStyle(document.body).overflow,
        pos:getComputedStyle(document.body).position,
        classes:document.body.className
      }));
      if(lock.html==='hidden'||lock.body==='hidden'||lock.pos==='fixed'||/modal-open|no-scroll|lz-mobile-focus/.test(lock.classes)){
        fail(engineName,p.name,`scroll lock remained after navigation ${JSON.stringify(lock)}`);
      }

      // Customer modal must open and close without freezing the event loop.
      const customer='.v7-nav button[data-v7="customers"]';
      if(p.mobile)await page.locator(customer).tap();else await page.locator(customer).click();
      await page.waitForTimeout(100);
      await assertResponsive(page,engineName,p.name,'customer modal open');
      const modal=page.locator('#m-addr');
      if(await modal.count()){
        const open=await modal.evaluate(el=>el.classList.contains('open'));
        if(!open)fail(engineName,p.name,'customer modal did not open');
        await page.evaluate(()=>document.querySelector('#m-addr')?.classList.remove('open'));
      }

      if(consoleErrors.length)fail(engineName,p.name,`console errors: ${consoleErrors.slice(0,5).join(' | ')}`);
    }catch(e){
      fail(engineName,p.name,`fatal interaction failure: ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
  await browser.close();
}

if(failures.length){
  console.error(`V7 CROSS-BROWSER AUDIT FAILED (${failures.length})`);
  failures.forEach(x=>console.error(`- ${x}`));
  process.exit(1);
}
console.log('V7 CROSS-BROWSER AUDIT PASS: Chromium + WebKit; desktop + iPhone; 12-cycle Manifest/Batch/Home stress; manifest toggle; customer modal responsiveness; scroll-lock recovery; overflow and touch checks.');
