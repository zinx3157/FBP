from pathlib import Path
import re, shutil
WEB=Path('labelonzeway')
ANDROID=Path('labelonzeway-android/app/src/main/assets/labelonzeway')
IDX=WEB/'index.html'
SW=WEB/'service-worker.js'
idx=IDX.read_text()
if 'LZ_TRACKING_CLOSE_DIRECT_V1' not in idx:
    idx=idx.replace('<button type="button" data-close="m-tracking-view" class="btn">← BACK TO OPERATIONS</button>', '<button type="button" data-close="m-tracking-view" class="btn" onclick="closeModal(\'m-tracking-view\')">← BACK TO OPERATIONS</button>',1)
    idx=idx.replace('<button type="button" data-close="m-tracking-view" class="btn">✕ CLOSE</button>', '<button type="button" data-close="m-tracking-view" class="btn" onclick="closeModal(\'m-tracking-view\')">✕ CLOSE</button>',1)
    idx=idx.replace('<button class="x" data-act="closeModal" data-arg="m-tracking-view">×</button>', '<button class="x" data-close="m-tracking-view" onclick="closeModal(\'m-tracking-view\')" aria-label="Close tracking view">×</button>',1)
    anchor="document.addEventListener('click',function(e){"
    inject="""/* LZ_TRACKING_CLOSE_DIRECT_V1 */\ndocument.addEventListener('click',function(e){\n  var b=e.target.closest('#m-tracking-view [data-close=\"m-tracking-view\"]');\n  if(b){e.preventDefault();e.stopPropagation();closeModal('m-tracking-view');}\n},true);\ndocument.addEventListener('keydown',function(e){\n  if(e.key==='Escape'){var m=getEl('m-tracking-view');if(m&&m.classList.contains('open'))closeModal('m-tracking-view');}\n});\n"""
    if anchor not in idx: raise SystemExit('click handler anchor missing')
    idx=idx.replace(anchor, inject+anchor,1)
IDX.write_text(idx)
sw=SW.read_text()
sw=re.sub(r'labelonzeway-v2\.0\.1-[A-Za-z0-9._-]+','labelonzeway-v2.0.1-final-command-sync-close-20260907-2',sw,count=1)
SW.write_text(sw)
ANDROID.mkdir(parents=True,exist_ok=True)
for name in ['index.html','cloud-sync.js','service-worker.js']:
    shutil.copy2(WEB/name,ANDROID/name)
assert 'LZ_TRACKING_CLOSE_DIRECT_V1' in IDX.read_text()
assert "onclick=\"closeModal('m-tracking-view')\"" in IDX.read_text()
for name in ['index.html','cloud-sync.js','service-worker.js']:
    assert (WEB/name).read_bytes()==(ANDROID/name).read_bytes(),name
print('FINAL TRACKING CLOSE INVARIANT: PASS')
