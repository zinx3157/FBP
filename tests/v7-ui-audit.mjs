import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/labelonzeway-v7/?audit=1';
const loops=3;
const profiles=[
  {name:'desktop-1440',width:1440,height:900,mobile:false},
  {name:'desktop-1280',width:1280,height:800,mobile:false},
  {name:'tablet-1024',width:1024,height:768,mobile:false},
  {name:'iphone-390',width:390,height:844,mobile:true},
  {name:'iphone-375',width:375,height:812,mobile:true},
  {name:'small-360',width:360,height:800,mobile:true},
  {name:'small-320',width:320,height:740,mobile:true},
];
const nav=['home','label','manifest','batch','more'];
const failures=[];
const browser=await chromium.launch({headless:true});

function fail(profile,loop,msg){failures.push(`${profile} loop ${loop}: ${msg}`)}

for(const p of profiles){
  for(let loop=1;loop<=loops;loop++){
    const page=await browser.newPage({viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:p.mobile});
    const consoleErrors=[];
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('pageerror',e=>consoleErrors.push(`pageerror: ${e.message}`));
    await page.goto(base,{waitUntil:'networkidle',timeout:30000});
    await page.waitForSelector('#v7-shell',{timeout:15000});
    await page.waitForTimeout(300);

    const geometry=await page.evaluate(()=>{
      const vw=document.documentElement.clientWidth;
      const sw=document.documentElement.scrollWidth;
      const visible=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')].filter(el=>{
        const cs=getComputedStyle(el),r=el.getBoundingClientRect();
        return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0;
      });
      const clipped=visible.filter(el=>{const r=el.getBoundingClientRect();return r.left<-1||r.right>vw+1}).map(el=>({tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,45),left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right)}));
      const small=visible.filter(el=>{const r=el.getBoundingClientRect();return matchMedia('(max-width:900px)').matches&&(r.width<40||r.height<40)}).map(el=>({tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,45),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));
      return {vw,sw,clipped:clipped.slice(0,12),small:small.slice(0,12)};
    });
    if(geometry.sw>geometry.vw+2) fail(p.name,loop,`page horizontal overflow ${geometry.sw}>${geometry.vw}`);
    if(geometry.clipped.length) fail(p.name,loop,`clipped controls ${JSON.stringify(geometry.clipped)}`);
    if(p.mobile&&geometry.small.length) fail(p.name,loop,`touch targets below 40px ${JSON.stringify(geometry.small)}`);

    for(const item of nav){
      const sel=`.v7-nav button[data-v7="${item}"]`;
      try{
        if(p.mobile) await page.locator(sel).tap({timeout:5000}); else await page.locator(sel).click({timeout:5000});
        await page.waitForTimeout(160);
        const ok=await page.locator(sel).evaluate(el=>el.classList.contains('active'));
        if(!ok) fail(p.name,loop,`${item} nav did not activate`);
        const centerHit=await page.locator(sel).evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!(hit&&(hit===el||el.contains(hit)))});
        if(!centerHit) fail(p.name,loop,`${item} nav center is blocked by another layer`);
      }catch(e){fail(p.name,loop,`${item} nav interaction failed: ${e.message.split('\n')[0]}`)}
    }

    if(p.mobile){
      try{
        const newLabel='.v7-nav button[data-v7="label"]';
        await page.locator(newLabel).tap();
        for(const step of ['customer','details','preview']){
          const s=`.v7-step[data-step="${step}"]`;
          await page.locator(s).tap({timeout:5000});
          await page.waitForTimeout(120);
          const active=await page.locator(s).evaluate(el=>el.classList.contains('active'));
          if(!active) fail(p.name,loop,`${step} step did not activate`);
        }
      }catch(e){fail(p.name,loop,`mobile label steps failed: ${e.message.split('\n')[0]}`)}
    }

    try{
      const manifest='.v7-nav button[data-v7="manifest"]';
      if(p.mobile) await page.locator(manifest).tap(); else await page.locator(manifest).click();
      await page.waitForTimeout(180);
      const card=page.locator('#card-manifest');
      const box=await card.boundingBox();
      if(box&&box.x<0) fail(p.name,loop,'manifest begins off-screen');
      if(box&&box.x+box.width>p.width+2) fail(p.name,loop,`manifest exceeds viewport (${Math.round(box.x+box.width)}>${p.width})`);
      const toggle=page.locator('#v7-manifest-toggle');
      if(!p.mobile&&await toggle.count()){
        await toggle.click();
        const expanded=await page.locator('body').evaluate(b=>b.classList.contains('v7-manifest-expanded'));
        if(!expanded) fail(p.name,loop,'manifest expanded mode did not activate');
        await toggle.click();
      }
    }catch(e){fail(p.name,loop,`manifest interaction failed: ${e.message.split('\n')[0]}`)}

    if(consoleErrors.length) fail(p.name,loop,`console errors: ${consoleErrors.slice(0,5).join(' | ')}`);
    await page.close();
  }
}
await browser.close();

if(failures.length){
  console.error(`V7 UI AUDIT FAILED (${failures.length})`);
  failures.forEach(x=>console.error(`- ${x}`));
  process.exit(1);
}
console.log(`V7 UI AUDIT PASS: ${profiles.length} viewports × ${loops} loops; navigation, mobile steps, manifest layout, clipping, overflow and touch targets verified.`);
