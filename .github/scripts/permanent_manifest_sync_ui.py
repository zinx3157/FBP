from pathlib import Path
import re, shutil
ROOT=Path('.')
WEB=ROOT/'labelonzeway'
ANDROID=ROOT/'labelonzeway-android/app/src/main/assets/labelonzeway'
idx=(WEB/'index.html').read_text()
cloud=(WEB/'cloud-sync.js').read_text()
marker='/* LZ_SINGLE_MANIFEST_STORE_V1 */'
if marker not in cloud:
    old='if (changed) refreshApp();'
    new="if (changed) { refreshApp(); try { window.dispatchEvent(new CustomEvent('lz:manifest-updated',{detail:{source:'cloud'}})); } catch(e) {} }"
    if old not in cloud: raise SystemExit('applyRemote refresh anchor missing')
    cloud=cloud.replace(old,new,1)
    cloud=cloud.replace('function refreshApp() {',marker+'\n  function refreshApp() {',1)
listener='/* LZ_MANIFEST_RECONCILE_LISTENER_V1 */'
if listener not in idx:
    anchor='function renderTrackingView(){'
    pos=idx.find(anchor)
    if pos<0: raise SystemExit('renderTrackingView missing')
    inject="""/* LZ_MANIFEST_RECONCILE_LISTENER_V1 */
window.addEventListener('lz:manifest-updated',function(){
  try{renderManifest()}catch(e){}
  try{renderStats()}catch(e){}
  try{renderOperationsDeck()}catch(e){}
  try{renderTrackingView()}catch(e){}
});
"""
    idx=idx[:pos]+inject+idx[pos:]
# Desktop modal shell: fixed viewport, internal scrolling, navigation always visible.
css_marker='/* LZ_DESKTOP_MODAL_SHELL_V1 */'
if css_marker not in idx:
    css="""\n/* LZ_DESKTOP_MODAL_SHELL_V1 */
@media (min-width: 760px){
  .modal.open{overflow:hidden!important;padding:24px!important;align-items:center!important;justify-content:center!important}
  .modal.open>.modal-box{width:min(1180px,calc(100vw - 48px))!important;max-width:1180px!important;height:min(820px,calc(100vh - 48px))!important;max-height:calc(100vh - 48px)!important;overflow:auto!important;position:relative!important}
  .lz-tracking-sticky-nav,.settings-sticky-nav,.label-vault-sticky-nav{position:sticky!important;top:0!important;z-index:80!important}
}
"""
    idx=idx.replace('</style>',css+'\n</style>',1)
# Ensure tracking modal has explicit navigation using existing close semantics.
if 'LZ_TRACKING_BACK_NAV_V2' not in idx:
    p=idx.find('LZ_PRODUCTION_TRACKING_VIEW_V1')
    if p<0: raise SystemExit('tracking modal marker missing')
    box=idx.find('class="modal-box',max(0,p-2500),p+3000)
    if box<0: box=idx.rfind('class="modal-box',0,p)
    if box<0: raise SystemExit('tracking modal box missing')
    gt=idx.find('>',box)
    nav='''\n<!-- LZ_TRACKING_BACK_NAV_V2 --><div class="lz-tracking-sticky-nav"><button type="button" data-close="m-tracking-view" class="btn">← BACK TO OPERATIONS</button><strong>TRACKING VIEW</strong><button type="button" data-close="m-tracking-view" class="btn">✕ CLOSE</button></div>\n'''
    idx=idx[:gt+1]+nav+idx[gt+1:]
sw=(WEB/'service-worker.js').read_text()
sw=re.sub(r'labelonzeway-v2\.0\.1-[A-Za-z0-9._-]+','labelonzeway-v2.0.1-production-single-store-20260907-1',sw,count=1)
(WEB/'index.html').write_text(idx)
(WEB/'cloud-sync.js').write_text(cloud)
(WEB/'service-worker.js').write_text(sw)
ANDROID.mkdir(parents=True,exist_ok=True)
for name in ['index.html','cloud-sync.js','service-worker.js','sync-config.json','manifest.webmanifest','icon.svg']:
    src=WEB/name
    if src.exists():(ANDROID/name).write_bytes(src.read_bytes())
for sub in ['tracking','tracking-dashboard']:
    src=WEB/sub; dst=ANDROID/sub
    if src.exists():
        if dst.exists():shutil.rmtree(dst)
        shutil.copytree(src,dst)
assert marker in cloud
assert listener in idx
assert 'LZ_DESKTOP_MODAL_SHELL_V1' in idx
assert 'LZ_TRACKING_BACK_NAV_V2' in idx
assert (WEB/'index.html').read_bytes()==(ANDROID/'index.html').read_bytes()
assert (WEB/'cloud-sync.js').read_bytes()==(ANDROID/'cloud-sync.js').read_bytes()
print('Permanent manifest reconciliation + desktop modal repair: PASS')
