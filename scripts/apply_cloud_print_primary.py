from pathlib import Path
import shutil

WEB = Path('labelonzeway')
ANDROID = Path('labelonzeway-android/app/src/main/assets/labelonzeway')
IDX = WEB / 'index.html'
CLOUD = WEB / 'cloud-sync.js'
SW = WEB / 'service-worker.js'


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old, new, 1)


cloud = CLOUD.read_text()
if 'LZ_CLOUD_PRINT_PRIMARY_V1' not in cloud:
    cloud = must_replace(
        cloud,
        "        auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true }",
        "        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }",
        'persist Supabase session',
    )
    cloud = must_replace(
        cloud,
        "      client.auth.onAuthStateChange(function (event, nextSession) {\n        if (!manualLoginArmed && !recoveryIntent && event !== 'PASSWORD_RECOVERY') {\n          session = null; stopRealtime(); diagnosticLog('auth-event-ignored', {event:event}); setTimeout(updateUI,0); return;\n        }\n        session = nextSession; diagnosticLog('auth-state', {event:event, signedIn:!!nextSession});",
        "      client.auth.onAuthStateChange(function (event, nextSession) {\n        /* LZ_CLOUD_PRINT_PRIMARY_V1: persisted authenticated sessions are restored so hosted Cloud Print can work without a Mac bridge. */\n        session = nextSession; diagnosticLog('auth-state', {event:event, signedIn:!!nextSession});",
        'restore auth state',
    )
    cloud = must_replace(
        cloud,
        "      if (!recoveryIntent) {\n        session = null; manualLoginArmed = false; stopRealtime();\n        diagnosticLog('cloud-ready-manual-login', diagnosticSnapshot());\n        setStatus('Cloud ready — sign in manually when you want synchronization.', ''); updateUI();\n        return { lzManual: true, data: { session: null } };\n      }\n      return client.auth.getSession();\n    }).then(function (result) {\n      if (result && result.lzManual) return;\n      session = result.data && result.data.session;",
        "      return client.auth.getSession();\n    }).then(function (result) {\n      session = result.data && result.data.session;",
        'automatic session restore',
    )
    cloud = must_replace(
        cloud,
        "injectUI(); diagnosticLog('app-start', {manualLoginRequired:true, deviceId:deviceId});",
        "injectUI(); diagnosticLog('app-start', {manualLoginRequired:false, cloudPrintPrimary:true, deviceId:deviceId});",
        'startup diagnostic',
    )

CLOUD.write_text(cloud)

idx = IDX.read_text()
if 'LZ_HOSTED_CLOUD_PRINT_PRIMARY_V1' not in idx:
    idx = must_replace(
        idx,
        "  if(mode==='cloud')setPrinterStatus('Cloud Print selected — sign in to Cloud and keep the Mac print agent open.','ok');",
        "  if(mode==='cloud')setPrinterStatus('Cloud POS80C selected — jobs go through Supabase + Render; no Mac bridge is required.','ok');",
        'cloud print settings status',
    )
    idx = must_replace(
        idx,
        "  }).then(function(job){setPrinterStatus('✓ Cloud job queued · '+String(job.id).slice(0,8),'ok');toast('✓ Sent to Mac Cloud Print queue','ok');pollCloudPrintJob(job.id,0);continuePrintChainAfterDirect();",
        "  }).then(function(job){setPrinterStatus('✓ Cloud job queued · '+String(job.id).slice(0,8),'ok');toast('✓ Sent to Cloud POS80C queue','ok');pollCloudPrintJob(job.id,0);continuePrintChainAfterDirect();",
        'cloud queue toast',
    )
    idx = must_replace(
        idx,
        "function directEscposPrint(rows){var c=printerConfig(false);\n  if(c.mode==='cloud'){cloudEscposPrint(rows);return}",
        "function directEscposPrint(rows){var c=printerConfig(false);\n  /* LZ_HOSTED_CLOUD_PRINT_PRIMARY_V1: GitHub Pages can never reach the LAN gateway directly; route POS80C jobs through Supabase + Render. */\n  var hostedCloud=location.protocol==='https:'&&/(^|\\.)zinx3157\\.github\\.io$/i.test(String(location.hostname||''));\n  if(c.mode==='cloud'||hostedCloud){cloudEscposPrint(rows);return}",
        'hosted cloud-first print route',
    )
    idx = must_replace(
        idx,
        "function enableCloudPrint(){var mode=getEl('s-print-mode');if(mode)mode.value='cloud';updatePrinterSettingsUI();saveSettings();openCloud();toast('Cloud Print enabled · sign in to Cloud & Staff','ok');}",
        "function enableCloudPrint(){var mode=getEl('s-print-mode');if(mode)mode.value='cloud';updatePrinterSettingsUI();saveSettings();openCloud();toast('Cloud POS80C enabled · Supabase + Render route','ok');}",
        'enable cloud text',
    )
    idx = must_replace(
        idx,
        "  toast(state.shop.printMode==='direct'?'Direct POS80C selected on this device':state.shop.printMode==='cloud'?'Cloud Print · Mac POS80C selected':'System Print selected on this device','ok');}",
        "  toast(state.shop.printMode==='direct'?'Direct POS80C selected on this device':state.shop.printMode==='cloud'?'Cloud POS80C · Supabase + Render selected':'System Print selected on this device','ok');}",
        'quick cloud text',
    )

IDX.write_text(idx)

sw = SW.read_text()
if "labelonzeway-v2.0.1-cloud-primary-20260912" not in sw:
    first = sw.splitlines()[0]
    if not first.startswith("const CACHE = '"):
        raise SystemExit('missing anchor: service worker cache')
    sw = sw.replace(first, "const CACHE = 'labelonzeway-v2.0.1-cloud-primary-20260912';", 1)
SW.write_text(sw)

ANDROID.mkdir(parents=True, exist_ok=True)
for name in ('index.html', 'cloud-sync.js', 'service-worker.js'):
    shutil.copy2(WEB / name, ANDROID / name)

print('Applied Cloud Print primary route to web + Android assets')
