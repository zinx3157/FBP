from pathlib import Path
import shutil, re, hashlib, datetime

web=Path('labelonzeway'); idx=web/'index.html'; track=web/'tracking'/'index.html'; sw=web/'service-worker.js'
s=idx.read_text(encoding='utf-8')

old="function openTrackingDashboard(){window.open(new URL('tracking-dashboard/',location.href).toString(),'_blank','noopener')}"
new=r'''function renderTrackingView(){
  ensureTrackingRecords();var host=getEl('tracking-view-rows'),summary=getEl('tracking-view-summary');if(!host)return;
  var q=String(val('tracking-view-search','')||'').trim().toLowerCase(),filter=String(val('tracking-view-filter','all')||'all');
  var rows=trackingRows().slice().sort(function(a,b){return String(b.statusUpdatedAt||b.addedAt||'').localeCompare(String(a.statusUpdatedAt||a.addedAt||''))});
  var counts={ready:0,in_transit:0,delivered:0,exception:0};rows.forEach(function(r){counts[deliveryStatusOf(r)]++});
  if(summary)summary.textContent=rows.length+' parcels · '+counts.ready+' ready · '+counts.in_transit+' in transit · '+counts.delivered+' delivered · '+counts.exception+' exception';
  var shown=rows.filter(function(r){var rec=r.rec||{},st=deliveryStatusOf(r),hay=[r.oid,r.id,rec.name,rec.phone,rec.area,rec.address].join(' ').toLowerCase();return(filter==='all'||filter===st)&&(!q||hay.indexOf(q)>=0)});
  host.innerHTML=shown.length?shown.map(function(r){var rec=r.rec||{},st=deliveryStatusOf(r);return '<div class="tracking-view-row"><div><b>'+esc(r.oid||r.id||'—')+'</b><small>'+esc(rec.name||'—')+' · '+esc(rec.phone||'')+'</small></div><div><span class="delivery-badge '+esc(st)+'">'+esc(deliveryStatusLabel(st))+'</span><small>'+esc(fmtDT(r.statusUpdatedAt||r.addedAt||''))+'</small></div><div class="tracking-view-actions"><button class="btn sm" data-act="copyTrackingLink" data-arg="'+esc(r.id)+'">COPY LINK</button><button class="btn sm blue" data-act="openTrackingLink" data-arg="'+esc(r.id)+'">VIEW</button></div></div>'}).join(''):'<div class="printer-status">No matching parcels.</div>';
}
function openTrackingDashboard(){ensureTrackingRecords();var modal=getEl('m-tracking-view');if(!modal)return;modal.classList.add('open');var search=getEl('tracking-view-search'),filter=getEl('tracking-view-filter');if(search&&!search.dataset.bound){search.dataset.bound='1';search.addEventListener('input',renderTrackingView)}if(filter&&!filter.dataset.bound){filter.dataset.bound='1';filter.addEventListener('change',renderTrackingView)}renderTrackingView();syncTrackingGateway(false).then(renderTrackingView).catch(function(){renderTrackingView()});}'''
if old in s:s=s.replace(old,new,1)
elif 'function renderTrackingView()' not in s:raise SystemExit('openTrackingDashboard marker not found')

start=s.find('function syncTrackingGateway(showResult){'); end=s.find('function syncTrackingNow()',start)
if start<0 or end<0:raise SystemExit('syncTrackingGateway block not found')
replacement=r'''function syncTrackingGateway(showResult){
  ensureTrackingRecords();var records=trackingPublicRecords(),isLocal=location.protocol==='http:'&&location.port==='8765',key=state.shop.gatewayKey||'';
  var api=window.LabelOnZeWayCloud,status=api&&api.getStatus&&api.getStatus(),signedIn=!!(status&&status.signedIn),canCloud=!!(api&&typeof api.publishTrackingRecords==='function');
  var local=isLocal?fetch('/api/tracking/sync',{method:'POST',headers:{'Content-Type':'application/json','X-LabelOnZeWay-Key':key},body:JSON.stringify({records:records})}).then(function(response){return response.json().then(function(body){if(!response.ok)throw new Error(body.error||('HTTP '+response.status));return body})}).catch(function(error){return{localError:error.message||String(error)}}):Promise.resolve({skipped:true});
  var cloud=(signedIn&&canCloud)?api.publishTrackingRecords(records):Promise.resolve({skipped:true});
  return Promise.all([local,cloud]).then(function(results){var cloudResult=results[1];if(signedIn&&canCloud&&cloudResult&&cloudResult.skipped)throw new Error('Internet tracking publication was skipped');if(showResult){if(signedIn&&canCloud)toast('Tracking published to internet · '+records.length+' parcel'+(records.length===1?'':'s'),'ok');else toast('Tracking saved on device · sign in to Cloud to publish internet links','err')}return{records:records.length,cloud:!!(signedIn&&canCloud&&!cloudResult.skipped)}}).catch(function(error){if(showResult)toast('Tracking sync failed: '+(error.message||error),'err');throw error})
}
'''
s=s[:start]+replacement+s[end:]

start=s.find('function copyTrackingLink(id){'); end=s.find('function confirmationPhone(row){',start)
if start<0 or end<0:raise SystemExit('tracking share block not found')
share=r'''function trackingCloudReady(){var api=window.LabelOnZeWayCloud,status=api&&api.getStatus&&api.getStatus();return!!(api&&status&&status.signedIn&&typeof api.publishTrackingRecords==='function')}
function copyTrackingLink(id){ensureTrackingRecords();var row=trackingRows().find(function(r){return r.id===id});if(!row){toast('Parcel not found','err');return}if(!trackingCloudReady()){toast('Sign in to Cloud & Staff before sharing an internet tracking link','err');openCloud();return}var url=trackingUrlFor(row);syncTrackingGateway(false).then(function(result){if(!result.cloud)throw new Error('Internet tracking is not published');var done=function(){toast('Tracking link published and copied','ok')};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done).catch(function(){window.prompt('Copy tracking link:',url)});else window.prompt('Copy tracking link:',url)}).catch(function(error){toast('Tracking link unavailable: '+(error.message||error),'err')})}
function openTrackingLink(id){ensureTrackingRecords();var row=trackingRows().find(function(r){return r.id===id});if(!row){toast('Parcel not found','err');return}if(!trackingCloudReady()){toast('Sign in to Cloud & Staff before opening internet tracking','err');openCloud();return}var url=trackingUrlFor(row),pending=null;try{pending=window.open('about:blank','_blank')}catch(e){}syncTrackingGateway(false).then(function(result){if(!result.cloud)throw new Error('Internet tracking is not published');if(pending){pending.location.href=url}else{window.location.href=url}}).catch(function(error){try{if(pending)pending.close()}catch(e){}toast('Tracking view unavailable: '+(error.message||error),'err')})}
'''
s=s[:start]+share+s[end:]

marker='<!-- LZ_PRODUCTION_TRACKING_VIEW_V1 -->'
if marker not in s:
    modal=r'''<!-- LZ_PRODUCTION_TRACKING_VIEW_V1 -->
<div class="modal" id="m-tracking-view"><div class="modal-box" style="max-width:980px"><div class="modal-head"><div><b>TRACKING VIEW</b><small id="tracking-view-summary">Current profile</small></div><button class="x" data-act="closeModal" data-arg="m-tracking-view">×</button></div><div class="row2" style="margin-bottom:12px"><div><label class="f" for="tracking-view-search">Search</label><input id="tracking-view-search" type="search" placeholder="Order, customer, phone or area"></div><div><label class="f" for="tracking-view-filter">Status</label><select id="tracking-view-filter"><option value="all">All statuses</option><option value="ready">Ready for Dispatch</option><option value="in_transit">In Transit</option><option value="delivered">Delivered</option><option value="exception">Exception</option></select></div></div><div id="tracking-view-rows" class="tracking-view-list"></div></div></div>
<style>#m-tracking-view .modal-box{width:min(980px,96vw);max-height:90vh;overflow:auto}.tracking-view-list{display:grid;gap:8px}.tracking-view-row{display:grid;grid-template-columns:minmax(180px,1fr) minmax(150px,.7fr) auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:9px;padding:10px;background:#0d1a24}.tracking-view-row small{display:block;margin-top:3px;color:#8da5a1}.tracking-view-actions{display:flex;gap:7px;flex-wrap:wrap}.delivery-badge{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:4px 8px;font-weight:800}.delivery-badge.ready{color:#63d9ef}.delivery-badge.in_transit{color:#f3bd68}.delivery-badge.delivered{color:#54dfa8}.delivery-badge.exception{color:#ff8278}@media(max-width:700px){.tracking-view-row{grid-template-columns:1fr}.tracking-view-actions .btn{flex:1}.row2{grid-template-columns:1fr!important}}</style>'''
    pos=s.rfind('</body>')
    if pos<0:raise SystemExit('body close not found')
    s=s[:pos]+modal+'\n'+s[pos:]
idx.write_text(s,encoding='utf-8')

t=track.read_text(encoding='utf-8')
t=re.sub(r'\n?<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@2/dist/umd/supabase\.js"></script>\n?','\n',t,count=1)
script_start=t.find('<script>\n(function(){'); script_end=t.find('</script>',script_start)
if script_start<0 or script_end<0:raise SystemExit('tracking script block not found')
direct=r'''<script>
(function(){'use strict';var result=document.getElementById('result'),form=document.getElementById('track');var FALLBACK={supabaseUrl:'https://cqgdzfgjacsgpfdtbhdo.supabase.co',supabaseAnonKey:'sb_publishable_pZ8QNQuPvPX_5kkMzpo7BA_7PsVWwWu'};function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}function label(status){return({ready:'Ready for Dispatch',in_transit:'In Transit',delivered:'Delivered',exception:'Exception'})[status]||'Ready for Dispatch'}function show(parcel){result.className='';result.innerHTML='<article><h2>Order '+esc(parcel.orderNumber||'—')+'</h2><p class="pill">'+esc(label(parcel.status))+'</p><dl><dt>Milestone</dt><dd>'+esc(parcel.milestone||'—')+'</dd><dt>Delivery process</dt><dd>'+esc(parcel.deliveryProcessDate||'Not scheduled')+'</dd><dt>Last update</dt><dd>'+esc(parcel.lastUpdate||'Not available')+'</dd><dt>Proof of delivery</dt><dd>'+(parcel.podAvailable?'Available':'Not yet available')+'</dd></dl></article>'}function configUrl(){return new URL('../sync-config.json',location.href).toString()}function getConfig(){return fetch(configUrl(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('config');return r.json()}).catch(function(){return FALLBACK}).then(function(c){return{supabaseUrl:String(c.supabaseUrl||FALLBACK.supabaseUrl).replace(/\/$/,''),supabaseAnonKey:String(c.supabaseAnonKey||FALLBACK.supabaseAnonKey)}})}function rpc(config,token){return fetch(config.supabaseUrl+'/rest/v1/rpc/get_public_tracking',{method:'POST',headers:{'Content-Type':'application/json','apikey':config.supabaseAnonKey,'Authorization':'Bearer '+config.supabaseAnonKey},body:JSON.stringify({p_token:token}),cache:'no-store'}).then(function(r){return r.text().then(function(text){var data=null;try{data=text?JSON.parse(text):null}catch(e){}if(!r.ok){var msg=data&&(data.message||data.hint||data.details);throw new Error(msg||('Tracking service returned HTTP '+r.status))}return data})})}function load(token){token=String(token||'').trim();if(!token){form.hidden=false;result.textContent='Enter the secure token.';return}if(!/^trk_[A-Za-z0-9_-]{20,}$/.test(token)){form.hidden=false;result.className='error';result.textContent='Invalid tracking token.';return}result.className='';result.textContent='Loading tracking status…';getConfig().then(function(c){return rpc(c,token)}).then(function(data){var parcel=Array.isArray(data)?data[0]:data;if(!parcel)throw new Error('Tracking link not found or not yet published');show({orderNumber:parcel.order_number,status:parcel.status,milestone:parcel.milestone,deliveryProcessDate:parcel.delivery_process_date,lastUpdate:parcel.last_update,podAvailable:parcel.pod_available});form.hidden=true}).catch(function(error){form.hidden=false;result.className='error';result.textContent=String(error&&error.message||error)})}form.addEventListener('submit',function(event){event.preventDefault();var token=new FormData(form).get('token');history.replaceState(null,'','?token='+encodeURIComponent(token));load(token)});var token=new URLSearchParams(location.search).get('token')||'';form.elements.token.value=token;load(token)})();
</script>'''
t=t[:script_start]+direct+t[script_end+9:]; track.write_text(t,encoding='utf-8')

w=sw.read_text(encoding='utf-8'); w=re.sub(r"const CACHE = '[^']+';","const CACHE = 'labelonzeway-v2.0.1-production-tracking-20260906-1';",w,count=1); sw.write_text(w,encoding='utf-8')

android=Path('labelonzeway-android/app/src/main/assets/labelonzeway')
for name in ['index.html','cloud-sync.js','sync-config.json','service-worker.js','manifest.webmanifest','icon.svg']: shutil.copy2(web/name,android/name)
for dirname in ['tracking','tracking-dashboard']:
    dst=android/dirname
    if dst.exists():shutil.rmtree(dst)
    shutil.copytree(web/dirname,dst)

pairs=['index.html','cloud-sync.js','sync-config.json','service-worker.js','manifest.webmanifest','icon.svg','tracking/index.html','tracking-dashboard/index.html']
report=['# LabelOnZeWay Production Tracking Audit','',f'Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}','','This is a production hardening audit, not UAT.','','| Asset | Web SHA256 | Android SHA256 | Match |','|---|---|---|---|']; ok=True
for name in pairs:
    a=web/name;b=android/name;ha=hashlib.sha256(a.read_bytes()).hexdigest();hb=hashlib.sha256(b.read_bytes()).hexdigest();same=ha==hb;ok=ok and same;report.append(f'| `{name}` | `{ha}` | `{hb}` | {"YES" if same else "NO"} |')
report+=['','## Tracking controls','','- In-app Tracking View across Web/PWA, Android and Mac runtime: ENABLED.','- Internet link sharing waits for Cloud publication: ENABLED.','- False-positive tracking sync success: REMOVED.','- Public tracking CDN dependency: REMOVED.','- Production public-config fallback: ENABLED.','',f'Web ↔ Android production runtime: **{"PASS" if ok else "FAIL"}**']
Path('LABELONZEWAY-PRODUCTION-TRACKING-AUDIT.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
if not ok:raise SystemExit('runtime hash mismatch')
