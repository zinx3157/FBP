from pathlib import Path

ROOT=Path('.')
WEB=ROOT/'labelonzeway'
ANDROID=ROOT/'labelonzeway-android/app/src/main/assets/labelonzeway'
idx=(WEB/'index.html').read_text()
cloud=(WEB/'cloud-sync.js').read_text()

# 1) Canonical-profile regression: customer safety count still compared canonical snapshot IDs
# against device-local profile ID. Correct it to canonical syncProfile.
old="var localCustomerCount = snapshot.filter(function (entity) { return entity.profile_id === profileId && entity.entity_type === 'customer'; }).length;"
new="var localCustomerCount = snapshot.filter(function (entity) { return entity.profile_id === syncProfile && entity.entity_type === 'customer'; }).length;"
if old in cloud:
    cloud=cloud.replace(old,new)
elif new not in cloud:
    raise SystemExit('captureProfile customer count anchor not found')

# 2) Make sync status self-recover instead of remaining visually stuck on SYNCING after an
# exception. Existing syncNow owns the syncing flag; add a watchdog around public API calls.
marker='/* LZ_SYNC_WATCHDOG_V2 */'
if marker not in cloud:
    anchor='var api = {};'
    cloud=cloud.replace(anchor, anchor+"\n  "+marker+"\n  var syncWatchdog = null;\n  function armSyncWatchdog(){ clearTimeout(syncWatchdog); syncWatchdog=setTimeout(function(){ if(syncing){ syncing=false; lastSyncError=lastSyncError||'Synchronization timed out'; updateUI(); } },30000); }\n  function disarmSyncWatchdog(){ clearTimeout(syncWatchdog); syncWatchdog=null; }")
    # Arm/disarm inside syncNow by matching stable assignments.
    cloud=cloud.replace('syncing = true; updateUI();', 'syncing = true; armSyncWatchdog(); updateUI();')
    cloud=cloud.replace('syncing = false; updateUI();', 'syncing = false; disarmSyncWatchdog(); updateUI();')

# 3) Tracking modal needs persistent Back/Close navigation on desktop/Mac too.
nav_marker='<!-- LZ_TRACKING_BACK_NAV_V2 -->'
if nav_marker not in idx:
    # Locate tracking modal by marker and inject a fixed/sticky control immediately after its modal box.
    pos=idx.find('LZ_PRODUCTION_TRACKING_VIEW_V1')
    if pos < 0: raise SystemExit('tracking marker missing')
    # Find nearest modal box opening tag after marker or before marker.
    search_start=max(0,pos-2500)
    box=idx.find('class="modal-box', search_start, pos+3000)
    if box < 0: box=idx.rfind('class="modal-box',0,pos)
    if box < 0: raise SystemExit('tracking modal box not found')
    gt=idx.find('>',box)
    nav='''\n      <!-- LZ_TRACKING_BACK_NAV_V2 -->\n      <div class="lz-tracking-sticky-nav" style="position:sticky;top:0;z-index:40;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 0;background:var(--bg,#071923)">\n        <button type="button" data-close="m-tracking-view" class="btn">← BACK TO OPERATIONS</button>\n        <strong style="text-align:center">TRACKING VIEW</strong>\n        <button type="button" data-close="m-tracking-view" class="btn">✕ CLOSE</button>\n      </div>\n'''
    idx=idx[:gt+1]+nav+idx[gt+1:]

# Bump cache so iPhone/PWA cannot remain on stale runtime.
import re
idx_marker='LZ_TRACKING_BACK_NAV_V2'
sw=(WEB/'service-worker.js').read_text()
sw=re.sub(r'labelonzeway-v2\.0\.1-[A-Za-z0-9._-]+','labelonzeway-v2.0.1-production-sync-nav-20260907-2',sw,count=1)

(WEB/'index.html').write_text(idx)
(WEB/'cloud-sync.js').write_text(cloud)
(WEB/'service-worker.js').write_text(sw)

# Canonical runtime parity.
ANDROID.mkdir(parents=True,exist_ok=True)
for name in ['index.html','cloud-sync.js','service-worker.js','sync-config.json','manifest.webmanifest','icon.svg']:
    src=WEB/name
    if src.exists(): (ANDROID/name).write_bytes(src.read_bytes())
for sub in ['tracking','tracking-dashboard']:
    src=WEB/sub
    dst=ANDROID/sub
    if src.exists():
        import shutil
        if dst.exists(): shutil.rmtree(dst)
        shutil.copytree(src,dst)

# Gates
assert 'LZ_CANONICAL_PROFILE_SYNC_V1' in cloud
assert 'LZ_SYNC_WATCHDOG_V2' in cloud
assert 'entity.profile_id === syncProfile' in cloud
assert idx_marker in idx
assert (WEB/'cloud-sync.js').read_bytes()==(ANDROID/'cloud-sync.js').read_bytes()
assert (WEB/'index.html').read_bytes()==(ANDROID/'index.html').read_bytes()
print('Mac tracking navigation + canonical sync convergence repair: PASS')
