import { chromium, webkit } from 'playwright';

const base='http://127.0.0.1:4173/labelonzeway-v7/?audit=1';
const failures=[];
const engines=[['chromium',chromium],['webkit',webkit]];
const profiles=[
  {name:'desktop-1440',width:1440,height:900,mobile:false},
  {name:'desktop-1280',width:1280,height:800,mobile:false},
  {name:'iphone15pro-393',width:393,height:852,mobile:true},
  {name:'iphone-390',width:390,height:844,mobile:true},
  {name:'galaxy-s20plus-384',width:384,height:854,mobile:true},
  {name:'android-412',width:412,height:915,mobile:true},
  {name:'phone-430',width:430,height:932,mobile:true},
  {name:'iphone-375',width:375,height:812,mobile:true},
];
function fail(engine,profile,msg){failures.push(`${engine}/${profile}: ${msg}`)}
async function heartbeat(page){const t=Date.now();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return Date.now()-t}
async function assertResponsive(page,engine,profile,label){
  try{
    let elapsed=await heartbeat(page);
    const isWebKitColdStart=engine==='webkit'&&label==='initial load';
    if(elapsed>2800&&isWebKitColdStart){
      await page.waitForTimeout(500);
      const retryElapsed=await heartbeat(page);
      if(retryElapsed>2800)fail(engine,profile,`${label} UI heartbeat slow after retry: first ${elapsed}ms, retry ${retryElapsed}ms`);
      return;
    }
    if(elapsed>2800)fail(engine,profile,`${label} UI heartbeat slow: ${elapsed}ms`)
  }catch(e){fail(engine,profile,`${label} UI heartbeat failed: ${e.message.split('\n')[0]}`)}
}

for(const [engineName,browserType] of engines){
  const browser=await browserType.launch({headless:true});
  for(const p of profiles){
    const page=await browser.newPage({viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:p.mobile});
    page.setDefaultTimeout(5000);
    await page.addInitScript(()=>{
      const orig=EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener=function(type,listener,options){
        try{if(type==='click'&&this instanceof Element)this.setAttribute('data-audit-click-bound','1')}catch(_e){}
        return orig.call(this,type,listener,options);
      };
    });
    const consoleErrors=[];
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('pageerror',e=>consoleErrors.push(`pageerror: ${e.message}`));
    try{
      await page.goto(base,{waitUntil:'networkidle',timeout:30000});
      await page.waitForSelector('#v7-shell',{timeout:15000});
      await page.waitForTimeout(250);
      await assertResponsive(page,engineName,p.name,'initial load');

      const contracts=await page.evaluate(async()=>{
        const actionable=[...document.querySelectorAll('button[data-act],a[data-act],[role="button"][data-act]')];
        const actions=[...new Set(actionable.map(el=>el.getAttribute('data-act')).filter(Boolean))];
        const missingActions=actions.filter(a=>!window.ACTIONS||typeof window.ACTIONS[a]!=='function');
        const hrefs=[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(Boolean))];
        const badHrefSyntax=hrefs.filter(h=>/^javascript:/i.test(h)||h.trim()==='#');
        const delegated=el=>el.hasAttribute('data-act')||el.hasAttribute('data-v7')||el.hasAttribute('data-close')||el.matches('.v7-new,.v7-step[data-step],.ops-recent-row,.v7-nav button,.v7-mobile-nav button');
        const wired=el=>el.disabled||typeof el.onclick==='function'||el.hasAttribute('onclick')||el.getAttribute('data-audit-click-bound')==='1'||delegated(el);
        const orphanButtons=[...document.querySelectorAll('button')].filter(el=>!wired(el)).map(el=>({id:el.id,cls:el.className,text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,55)}));
        const sameOrigin=hrefs.map(h=>{try{return new URL(h,location.href)}catch{return null}}).filter(u=>u&&u.origin===location.origin&&/^https?:$/.test(u.protocol));
        const broken=[];
        for(const u of sameOrigin){try{const r=await fetch(u.href,{method:'GET',cache:'no-store'});if(r.status===404)broken.push(u.pathname)}catch(e){broken.push(u.pathname+': '+e.message)}}
        return {actions,missingActions,badHrefSyntax,orphanButtons:orphanButtons.slice(0,40),broken,buttonCount:document.querySelectorAll('button').length,linkCount:document.querySelectorAll('a[href]').length};
      });
      if(contracts.missingActions.length)fail(engineName,p.name,`button data-act without ACTIONS handler: ${contracts.missingActions.join(', ')}`);
      if(contracts.badHrefSyntax.length)fail(engineName,p.name,`invalid links: ${contracts.badHrefSyntax.join(', ')}`);
      if(contracts.broken.length)fail(engineName,p.name,`broken same-origin links: ${contracts.broken.join(', ')}`);
      if(contracts.orphanButtons.length)fail(engineName,p.name,`buttons with no click wiring: ${JSON.stringify(contracts.orphanButtons)}`);
      if(contracts.buttonCount<20)fail(engineName,p.name,`unexpectedly low button inventory: ${contracts.buttonCount}`);

      const geometry=await page.evaluate(()=>{const vw=document.documentElement.clientWidth,sw=document.documentElement.scrollWidth;const visible=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')].filter(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0});const small=visible.filter(el=>{const r=el.getBoundingClientRect();return matchMedia('(max-width:900px)').matches&&!el.disabled&&(r.width<40||r.height<40)}).map(el=>({tag:el.tagName,id:el.id,w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));return {vw,sw,small:small.slice(0,20),controlCount:visible.length}});
      if(geometry.sw>geometry.vw+2)fail(engineName,p.name,`horizontal overflow ${geometry.sw}>${geometry.vw}`);
      if(p.mobile&&geometry.small.length)fail(engineName,p.name,`touch targets below 40px ${JSON.stringify(geometry.small)}`);
      if(geometry.controlCount<5)fail(engineName,p.name,`low visible control count ${geometry.controlCount}`);

      const stressItems=p.mobile?['manifest','label','home','more']:['manifest','batch','home'];
      for(let i=0;i<12;i++)for(const item of stressItems){
        const sel=`.v7-nav button[data-v7="${item}"]`;
        const ctl=page.locator(sel);
        if(!(await ctl.count())){fail(engineName,p.name,`${item} navigation control missing on stress cycle ${i+1}`);continue}
        await ctl.evaluate(el=>el.click());
        await page.waitForTimeout(25);
        const active=await ctl.evaluate(el=>el.classList.contains('active'));
        if(!active)fail(engineName,p.name,`${item} did not activate on stress cycle ${i+1}`);
        const cardId={manifest:'#card-manifest',batch:'#card-batch',home:'#card-home',label:'#v7-label-grid',more:'#card-more'}[item];
        const state=await page.locator(cardId).evaluate(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return {visible:cs.display!=='none'&&(el.classList.contains('v7-active')||el.classList.contains('mobile-view-active')),display:cs.display,visibility:cs.visibility,classes:el.className,style:el.getAttribute('style')||'',w:Math.round(r.width),h:Math.round(r.height),bodyView:document.body.dataset.mobileView||'',bodyClass:document.body.className,mobileShow:typeof window.LabelOnZeWayMobileShow,mobileEnforce:typeof window.LabelOnZeWayEnforceMobileView}});
        if(!state.visible)fail(engineName,p.name,`${item} card not visibly active on cycle ${i+1}${item==='label'&&i===0?' '+JSON.stringify(state):''}`);
        await assertResponsive(page,engineName,p.name,`${item} cycle ${i+1}`)
      }

      await page.evaluate(()=>{
        window.LabelOnZeWayV7ShowView?.('home');
        const recent=document.querySelector('#ops-recent-list');
        if(recent)recent.innerHTML='<div class="ops-recent-row"><span class="ops-order">#AUDIT-1</span><span class="ops-rec"><b>Audit Customer</b></span></div>';
        const body=document.querySelector('#mani-body');
        if(body&&!body.querySelector('[data-audit-row]')){const tr=document.createElement('tr');tr.dataset.auditRow='1';tr.innerHTML='<td>#AUDIT-1</td><td>Audit Customer</td>';body.appendChild(tr);}
      });
      await page.waitForTimeout(180);
      const recentCount=await page.locator('#ops-recent-list .ops-recent-row').count();
      if(!recentCount)fail(engineName,p.name,'Recent Labels row was not rendered');
      else{
        const wired=await page.locator('#ops-recent-list .ops-recent-row').first().evaluate(el=>el.dataset.v7RecentReady==='1');
        if(!wired)fail(engineName,p.name,'Recent Labels row was not wired');
        await page.locator('#ops-recent-list .ops-recent-row').first().evaluate(el=>el.click());
        await page.waitForTimeout(180);
        const manifestShown=await page.locator('#card-manifest').evaluate(el=>getComputedStyle(el).display!=='none'&&(el.classList.contains('v7-active')||el.classList.contains('mobile-view-active')));
        if(!manifestShown)fail(engineName,p.name,'Recent Labels click did not open Manifest');
      }

      await page.evaluate(()=>window.LabelOnZeWayV7ShowView?.('label'));await page.waitForTimeout(100);
      for(const sel of ['[data-customer-tab="search"]','[data-customer-tab="add"]','#v7-open-saved-customers']){
        const ctl=page.locator(sel);if(await ctl.count()){await ctl.evaluate(el=>el.click());await page.waitForTimeout(80);const modalOpen=await page.locator('#m-addr').evaluate(el=>el.classList.contains('open'));if(!modalOpen)fail(engineName,p.name,`${sel} did not open customer modal`);await page.evaluate(()=>document.querySelector('#m-addr')?.classList.remove('open'));}
      }

      const toggle=page.locator('#v7-manifest-toggle');if(await toggle.count()&&await toggle.isVisible())for(let i=0;i<4;i++){await toggle.evaluate(el=>el.click());await assertResponsive(page,engineName,p.name,`manifest toggle ${i+1}`)}

      await page.evaluate(()=>{document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';document.body.style.position='fixed';document.body.style.height='100%';document.body.classList.add('modal-open','no-scroll','lz-mobile-focus');window.LabelOnZeWayV7ShowView?.('home')});
      await page.waitForTimeout(100);const lock=await page.evaluate(()=>({html:getComputedStyle(document.documentElement).overflow,body:getComputedStyle(document.body).overflow,pos:getComputedStyle(document.body).position,classes:document.body.className}));if(lock.html==='hidden'||lock.body==='hidden'||lock.pos==='fixed'||/modal-open|no-scroll|lz-mobile-focus/.test(lock.classes))fail(engineName,p.name,`scroll lock remained after navigation ${JSON.stringify(lock)}`);

      await page.evaluate(()=>window.LabelOnZeWayV7ShowView?.('customers'));await page.waitForTimeout(100);await assertResponsive(page,engineName,p.name,'customer modal open');const modal=page.locator('#m-addr');if(await modal.count()){const open=await modal.evaluate(el=>el.classList.contains('open'));if(!open)fail(engineName,p.name,'customer modal did not open');await page.evaluate(()=>document.querySelector('#m-addr')?.classList.remove('open'))}

      if(consoleErrors.length)fail(engineName,p.name,`console errors: ${consoleErrors.slice(0,5).join(' | ')}`);
    }catch(e){fail(engineName,p.name,`fatal interaction failure: ${e.message.split('\n')[0]}`)}
    await page.close();
  }
  await browser.close();
}
if(failures.length){console.error(`V7 CROSS-BROWSER CONTROL AUDIT FAILED (${failures.length})`);failures.forEach(x=>console.error(`- ${x}`));process.exit(1)}
console.log('V7 CROSS-BROWSER CONTROL AUDIT PASS: Chromium + WebKit; desktop + current five-button mobile navigation; buttons wired; links validated; Recent Labels opens Manifest; customer controls exercised; 12-cycle navigation stress; modal, scroll, overflow and touch checks.');
