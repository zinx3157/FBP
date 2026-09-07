from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "labelonzeway"
ANDROID = ROOT / "labelonzeway-android/app/src/main/assets/labelonzeway"
INDEX = WEB / "index.html"
SW = WEB / "service-worker.js"

text = INDEX.read_text(encoding="utf-8")

marker = "LZ_DELIVERY_SYNC_COMMIT_V1"
if marker not in text:
    anchor = "function setDeliveryStatus(id,status,reason){"
    if anchor not in text:
        raise SystemExit("setDeliveryStatus() not found")

    helper = """/* LZ_DELIVERY_SYNC_COMMIT_V1\n * Delivery milestone changes are operational events, so do not leave them to the\n * normal deferred capture timer. Capture the changed parcel immediately, then run\n * the pull-first cloud reconciliation. This keeps Android/Mac tracking views aligned\n * even when Android is backgrounded immediately after a status change.\n */\nfunction syncDeliveryChangeNow(){\n  var cloud=window.LabelOnZeWayCloud;\n  if(!cloud)return Promise.resolve(false);\n  var capture=typeof cloud.captureNow==='function'?cloud.captureNow(PID,false):Promise.resolve(false);\n  return Promise.resolve(capture).then(function(){return typeof cloud.syncNow==='function'?cloud.syncNow(false):false});\n}\n"""
    text = text.replace(anchor, helper + anchor, 1)

old_single = re.compile(
    r"function setDeliveryStatus\(id,status,reason\)\{var r=state\.manifest\.find\(function\(x\)\{return x\.id===id\}\);if\(!r\)return;status=String\(status\|\|'ready'\);if\(\['ready','in_transit','delivered','exception'\]\.indexOf\(status\)<0\)return;if\(status==='exception'\)\{reason=reason==null\?window\.prompt\('Enter the delivery exception reason:',r\.deliveryExceptionReason\|\|''\):reason;if\(reason==null\)\{renderManifest\(\);return\}reason=String\(reason\)\.trim\(\);if\(!reason\)\{toast\('Exception reason is required','err'\);renderManifest\(\);return\}r\.deliveryExceptionReason=reason\}else r\.deliveryExceptionReason='';r\.deliveryStatus=status;r\.done=status==='delivered';r\.statusUpdatedAt=new Date\(\)\.toISOString\(\);appendMilestone\(r,status,r\.statusUpdatedAt,r\.deliveryExceptionReason\|\|'','operator'\);persist\(\);renderManifest\(\);renderStats\(\);toast\('Order '\+String\(r\.oid\|\|''\)\+' · '\+deliveryStatusLabel\(status\),'ok'\);setTimeout\(function\(\)\{openCustomerNotification\(r\.id,status\)\},250\)\}"
)
new_single = "function setDeliveryStatus(id,status,reason){var r=state.manifest.find(function(x){return x.id===id});if(!r)return;status=String(status||'ready');if(['ready','in_transit','delivered','exception'].indexOf(status)<0)return;if(status==='exception'){reason=reason==null?window.prompt('Enter the delivery exception reason:',r.deliveryExceptionReason||''):reason;if(reason==null){renderManifest();return}reason=String(reason).trim();if(!reason){toast('Exception reason is required','err');renderManifest();return}r.deliveryExceptionReason=reason}else r.deliveryExceptionReason='';r.deliveryStatus=status;r.done=status==='delivered';r.statusUpdatedAt=new Date().toISOString();appendMilestone(r,status,r.statusUpdatedAt,r.deliveryExceptionReason||'','operator');persist();renderManifest();renderStats();toast('Order '+String(r.oid||'')+' · '+deliveryStatusLabel(status)+' · syncing…','ok');syncDeliveryChangeNow().then(function(ok){toast(ok?'✓ Tracking status synchronized across devices':'Status saved locally · cloud sync still pending',ok?'ok':'err')}).catch(function(e){toast('Status saved locally · cloud sync error: '+(e&&e.message?e.message:String(e)),'err')})}"
text, count = old_single.subn(new_single, text, count=1)
if count != 1 and "syncing…" not in text:
    raise SystemExit("setDeliveryStatus() production body did not match expected source")

old_bulk = re.compile(
    r"function applyBulkDeliveryStatus\(\)\{var rows=selectedManifestRows\(\),sel=getEl\('bulk-status-select'\),status=sel\?String\(sel\.value\|\|''\):'';if\(!rows\.length\)\{toast\('Select one or more parcels','err'\);return\}if\(\['ready','in_transit','delivered','exception'\]\.indexOf\(status\)<0\)\{toast\('Choose the new delivery status','err'\);return\}var reason='';if\(status==='exception'\)\{reason=window\.prompt\('Enter one exception reason for all '\+rows\.length\+' selected parcels:',''\);if\(reason==null\)return;reason=String\(reason\)\.trim\(\);if\(!reason\)\{toast\('Exception reason is required','err'\);return\}\}if\(!confirm\('Update '\+rows\.length\+' selected parcel'\+\(rows\.length===1\?'':'s'\)\+' to “'\+deliveryStatusLabel\(status\)\+'”\?'\)\)return;var now=new Date\(\)\.toISOString\(\);rows\.forEach\(function\(r\)\{r\.deliveryExceptionReason=status==='exception'\?reason:'';r\.deliveryStatus=status;r\.done=status==='delivered';r\.statusUpdatedAt=now;appendMilestone\(r,status,now,reason,'bulk'\)\}\);manifestSelection=\{\};if\(sel\)sel\.value='';persist\(\);renderManifest\(\);renderStats\(\);toast\(rows\.length\+' parcel'\+\(rows\.length===1\?'':'s'\)\+' updated to '\+deliveryStatusLabel\(status\),'ok'\)\}"
)
new_bulk = "function applyBulkDeliveryStatus(){var rows=selectedManifestRows(),sel=getEl('bulk-status-select'),status=sel?String(sel.value||''):'';if(!rows.length){toast('Select one or more parcels','err');return}if(['ready','in_transit','delivered','exception'].indexOf(status)<0){toast('Choose the new delivery status','err');return}var reason='';if(status==='exception'){reason=window.prompt('Enter one exception reason for all '+rows.length+' selected parcels:','');if(reason==null)return;reason=String(reason).trim();if(!reason){toast('Exception reason is required','err');return}}if(!confirm('Update '+rows.length+' selected parcel'+(rows.length===1?'':'s')+' to “'+deliveryStatusLabel(status)+'”?'))return;var now=new Date().toISOString();rows.forEach(function(r){r.deliveryExceptionReason=status==='exception'?reason:'';r.deliveryStatus=status;r.done=status==='delivered';r.statusUpdatedAt=now;appendMilestone(r,status,now,reason,'bulk')});manifestSelection={};if(sel)sel.value='';persist();renderManifest();renderStats();toast(rows.length+' parcel'+(rows.length===1?'':'s')+' updated · syncing…','ok');syncDeliveryChangeNow().then(function(ok){toast(ok?'✓ Bulk tracking status synchronized across devices':'Bulk status saved locally · cloud sync still pending',ok?'ok':'err')}).catch(function(e){toast('Bulk status saved locally · cloud sync error: '+(e&&e.message?e.message:String(e)),'err')})}"
text, bulk_count = old_bulk.subn(new_bulk, text, count=1)
if bulk_count != 1 and "Bulk tracking status synchronized across devices" not in text:
    raise SystemExit("applyBulkDeliveryStatus() production body did not match expected source")

INDEX.write_text(text, encoding="utf-8")

sw = SW.read_text(encoding="utf-8")
new_cache = "labelonzeway-v2.0.1-production-delivery-sync-20260907-1"
if new_cache not in sw:
    sw, n = re.subn(r"labelonzeway-v2\.0\.1-[A-Za-z0-9._-]+", new_cache, sw, count=1)
    if n != 1:
        raise SystemExit("service worker cache name not found")
    SW.write_text(sw, encoding="utf-8")

ANDROID.mkdir(parents=True, exist_ok=True)
for rel in ["index.html", "cloud-sync.js", "sync-config.json", "service-worker.js", "manifest.webmanifest", "icon.svg"]:
    src = WEB / rel
    dst = ANDROID / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(src.read_bytes())
for sub in ["tracking/index.html", "tracking-dashboard/index.html"]:
    src = WEB / sub
    dst = ANDROID / sub
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(src.read_bytes())

# Production gates.
final = INDEX.read_text(encoding="utf-8")
assert marker in final
assert "syncDeliveryChangeNow()" in final
assert "openCustomerNotification(r.id,status)" not in final
for rel in ["index.html", "cloud-sync.js", "sync-config.json", "service-worker.js", "manifest.webmanifest", "icon.svg", "tracking/index.html", "tracking-dashboard/index.html"]:
    assert (WEB / rel).read_bytes() == (ANDROID / rel).read_bytes(), rel

print("PASS: delivery-status changes now force immediate capture + pull-first cloud sync")
print("PASS: automatic notification modal removed from status change; notify remains explicit")
print("PASS: web/android production runtime parity")
# workflow trigger: 2026-09-07 production repair
