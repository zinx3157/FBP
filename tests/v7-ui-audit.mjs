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
  try{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const elapsed=Date.now()-t;if(elapsed>1200)fail(engine,profile,`${label} UI heartbeat slow: ${elapsed}ms`)}catch(e){fail(engine,profile,`${label} UI heartbeat failed: ${e.message.split('\n')[0]}`)}
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

      const contracts=await page.evaluate(async()=>{
        const all=[...document.querySelectorAll('button,a,[role="button"]')];
        const actions=[...new Set([...document.querySelectorAll('[data-act]')].map(el=>el.getAttribute('data-act')).filter(Boolean))];
        const missingActions=actions.filter(a=>!window.ACTIONS||typeof window.ACTIONS[a]!=='function');
        const hrefs=[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(Boolean))];
        const badHrefSyntax=hrefs.filter(h=>/^javascript:/i.test(h)||h.trim()==='#');
        const knownCustom=el=>el.matches('.v7-nav button[data-v7],.v7-mobile-nav button[data-v7],.v7-new,.v7-step[data-step],.v7-admin-users-nav,#v7-pod-open,.v7-pod-btn,.v7-pod-close,#v7-manifest-toggle,.ops-recent-row,[data-close]');
        const orphanButtons=[...document.querySelectorAll('button')].filter(el=>!el.disabled&&!el.hasAttribute('data-act')&&!el.hasAttribute('onclick')&&!knownCustom(el)).map(el=>({id:el.id,cls:el.className,text:(el.textContent||'').trim().slice(0,40)}));
        const sameOrigin=hrefs.map(h=>{try{return new URL(h,location.href)}catch{return null}}).filter(u=>u&&u.origin===location.origin&&u.protocol.startsWith('http'));
        const broken=[];
        for(const u of sameOrigin){try{const r=await fetch(u.href,{method:'GET',cache:'no-store'});if(r.status===404)broken.push(u.pathname)}catch(e){broken.push(u.pathname+': '+e.message)}}
        return {actions,missingActions,badHrefSyntax,orphanButtons:orphanButtons.slice(0,30),broken};
      });
      if(contracts.missingActions.length)fail(engineName,p.name,`data-act without ACTIONS handler: ${contracts.missingActions.join(', ')}`);
      if(contracts.badHrefSyntax.length)fail(engineName,p.name,`invalid links: ${contracts.badHrefSyntax.join(', ')}`);
      if(contracts.broken.length)fail(engineName,p.name,`broken same-origin links: ${contracts.broken.join(', ')}`);
      if(contracts.orphanButtons.length)fail(engineName,p.name,`buttons without action contract: ${JSON.stringify(contracts.orphanButtons)}`);

      const geometry=await page.evaluate(()=>{const vw=document.documentElement.clientWidth,sw=document.documentElement.scrollWidth;const visible=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')].filter(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0});const small=visible.filter(el=>{const r=el.getBoundingClientRect();return matchMedia('(max-width:900px)').matches&&!el.disabled&&(r.width<40||r.height<40)}).map(el=>({tag:el.tagName,id:el.id,w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));return {vw,sw,small:small.slice(0,20),controlCount:visible.length}});
      if(geometry.sw>geometry.vw+2)fail(engineName,p.name,`horizontal overflow ${geometry.sw}>${geometry.vw}`);
      if(p.mobile&&geometry.small.length)fail(engineName,p.name,`touch targets below 40px ${JSON.stringify(geometry.small)}`);
      if(geometry.controlCount<5)fail(engineName,p.name,`low visible control count ${geometry.controlCount}`);

      for(let i=0;i<12;i++)for(const item of ['manifest','batch','home']){const sel=`.v7-nav button[data-v7="${item}"]`;if(p.mobile)await page.locator(sel).tap();else await page.locator(sel).click();await page.waitForTimeout(25);const active=await page.locator(sel).evaluate(el=>el.classList.contains('active'));if(!active)fail(engineName,p.name,`${item} did not activate on stress cycle ${i+1}`);const cardId={manifest:'#card-manifest',batch:'#card-batch',home:'#card-home'}[item];const visible=await page.locator(cardId).evaluate(el=>getComputedStyle(el).display!=='none'&&el.classList.contains('v7-active'));if(!visible)fail(engineName,p.name,`${item} card not visibly active on cycle ${i+1}`);await assertResponsive(page,engineName,p.name,`${item} cycle ${i+1}`)}

      // Recent Labels must use the exact authoritative V7 router and reveal Manifest.
      await page.evaluate(()=>{
        const recent=document.querySelector('#ops-recent-list');
        if(recent){recent.innerHTML='<div class="ops-recent-row"><span class="ops-order">#AUDIT-1</span><span class="ops-rec"><b>Audit Customer</b></span></div>';}
        const body=document.querySelector('#mani-body');
        if(body&&!body.querySelector('[data-audit-row]')){const tr=document.createElement('tr');tr.dataset.auditRow='1';tr.innerHTML='<td>#AUDIT-1</td><td>Audit Customer</td>';body.appendChild(tr);}
      });
      await page.waitForTimeout(120);
      const recent=page.locator('#ops-recent-list .ops-recent-row').first();
      if(await recent.count()){if(p.mobile)await recent.tap();else await recent.click();await page.waitForTimeout(180);const manifestShown=await page.locator('#card-manifest').evaluate(el=>getComputedStyle(el).display!=='none'&&el.classList.contains('v7-active'));if(!manifestShown)fail(engineName,p.name,'Recent Labels click did not open Manifest');}

      const manifest='.v7-nav button[data-v7="manifest"]';if(p.mobile)await page.locator(manifest).tap();else await page.locator(manifest).click();await page.waitForTimeout(80);if(await page.locator('#v7-manifest-toggle').count())for(let i=0;i<4;i++){await page.locator('#v7-manifest-toggle').click();await assertResponsive(page,engineName,p.name,`manifest toggle ${i+1}`)}

      await page.evaluate(()=>{document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';document.body.style.position='fixed';document.body.style.height='100%';document.body.classList.add('modal-open','no-scroll','lz-mobile-focus')});
      const home='.v7-nav button[data-v7="home"]';if(p.mobile)await page.locator(home).tap();else await page.locator(home).click();await page.waitForTimeout(100);const lock=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflow,body:getComputedStyle(document.body).overflow,pos:getComputedStyle(document.body).position,classes:document.body.className}));if(lock.html==='hidden'||lock.body==='hidden'||lock.pos==='fixed'||/modal-open|no-scroll|lz-mobile-focus/.test(lock.classes))fail(engineName,p.name,`scroll lock remained after navigation ${JSON.stringify(lock)}`);

      const customer='.v7-nav button[data-v7="customers"]';if(p.mobile)await page.locator(customer).tap();else await page.locator(customer).click();await page.waitForTimeout(100);await assertResponsive(page,engineName,p.name,'customer modal open');const modal=page.locator('#m-addr');if(await modal.count()){const open=await modal.evaluate(el=>el.classList.contains('open'));if(!open)fail(engineName,p.name,'customer modal did not open');await page.evaluate(()=>document.querySelector('#m-addr')?.classList.remove('open'))}

      if(consoleErrors.length)fail(engineName,p.name,`console errors: ${consoleErrors.slice(0,5).join(' | ')}`);
    }catch(e){fail(engineName,p.name,`fatal interaction failure: ${e.message.split('\n')[0]}`)}
    await page.close();
  }
  await browser.close();
}
if(failures.length){console.error(`V7 CROSS-BROWSER CONTROL AUDIT FAILED (${failures.length})`);failures.forEach(x=>console.error(`- ${x}`));process.exit(1)}
console.log('V7 CROSS-BROWSER CONTROL AUDIT PASS: Chromium + WebKit; desktop + iPhone; all data-act handlers mapped; buttons action-contracted; links validated; Recent Labels opens Manifest; 12-cycle navigation stress; modal, scroll, overflow and touch checks.');
