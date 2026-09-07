from pathlib import Path
import re, shutil

WEB = Path('labelonzeway')
ANDROID = Path('labelonzeway-android/app/src/main/assets/labelonzeway')
IDX = WEB/'index.html'
CLOUD = WEB/'cloud-sync.js'
SW = WEB/'service-worker.js'


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old, new, 1)

cloud = CLOUD.read_text()

if 'LZ_FINAL_MANUAL_LOGIN_LOG_V1' not in cloud:
    cloud = must_replace(cloud,
        "  var PENDING_KEY = 'lz.cloud.pending.v1';\n",
        "  var PENDING_KEY = 'lz.cloud.pending.v1';\n  /* LZ_FINAL_MANUAL_LOGIN_LOG_V1 */\n  var LOG_KEY = 'lz.cloud.diaglog.v1';\n  var LOG_MAX = 800;\n  var manualLoginArmed = false;\n  function safeLogDetails(value){\n    try { return JSON.parse(JSON.stringify(value == null ? {} : value, function(k,v){ return /password|token|secret|authorization|anonkey|apikey/i.test(String(k)) ? '[redacted]' : v; })); }\n    catch(e){ return { note: String(value || '') }; }\n  }\n  function readDiagnosticLog(){ return safeParse(localStorage.getItem(LOG_KEY), []); }\n  function diagnosticLog(event, details){\n    var rows = readDiagnosticLog();\n    rows.push({ at: new Date().toISOString(), event: String(event || 'event'), details: safeLogDetails(details) });\n    if(rows.length > LOG_MAX) rows = rows.slice(rows.length - LOG_MAX);\n    localStorage.setItem(LOG_KEY, JSON.stringify(rows));\n    renderDiagnostics();\n  }\n  function diagnosticSnapshot(){\n    return {\n      userEmail: session && session.user ? String(session.user.email || '') : '',\n      workspaceId: workspaceId || '', workspaceName: workspaceName || '',\n      profileId: currentProfileId(), profileSyncId: profileSyncId(currentProfileId()),\n      deviceId: deviceId, pending: workspaceId ? pendingForWorkspace().length : 0, syncing: !!syncing,\n      lastSuccessfulSyncAt: lastSuccessfulSyncAt || '', lastSyncError: lastSyncError || '',\n      online: navigator.onLine !== false\n    };\n  }\n  function renderDiagnostics(){\n    var el = document.getElementById('cloud-diagnostics-text');\n    if(el) el.textContent = JSON.stringify(diagnosticSnapshot(), null, 2);\n  }\n  function exportDiagnosticLog(){\n    var payload = { exportedAt: new Date().toISOString(), snapshot: diagnosticSnapshot(), log: readDiagnosticLog() };\n    var blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});\n    var url = URL.createObjectURL(blob), a = document.createElement('a');\n    a.href = url; a.download = 'LabelOnZeWay-sync-log-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';\n    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url)},1000);\n  }\n  function clearDiagnosticLog(){ localStorage.removeItem(LOG_KEY); diagnosticLog('log-cleared', diagnosticSnapshot()); }\n",
        'diagnostic bootstrap')

    cloud = must_replace(cloud,
        "        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }",
        "        auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true }",
        'disable persisted auth')

    cloud = must_replace(cloud,
        "      client.auth.onAuthStateChange(function (event, nextSession) {\n        session = nextSession;",
        "      client.auth.onAuthStateChange(function (event, nextSession) {\n        if (!manualLoginArmed && !recoveryIntent && event !== 'PASSWORD_RECOVERY') {\n          session = null; stopRealtime(); diagnosticLog('auth-event-ignored', {event:event}); setTimeout(updateUI,0); return;\n        }\n        session = nextSession; diagnosticLog('auth-state', {event:event, signedIn:!!nextSession});",
        'auth gate')

    cloud = must_replace(cloud,
        "      return client.auth.getSession();\n    }).then(function (result) {\n      session = result.data && result.data.session;",
        "      if (!recoveryIntent) {\n        session = null; manualLoginArmed = false; stopRealtime();\n        diagnosticLog('cloud-ready-manual-login', diagnosticSnapshot());\n        setStatus('Cloud ready — sign in manually when you want synchronization.', ''); updateUI();\n        return { lzManual: true, data: { session: null } };\n      }\n      return client.auth.getSession();\n    }).then(function (result) {\n      if (result && result.lzManual) return;\n      session = result.data && result.data.session;",
        'manual startup')

    cloud = must_replace(cloud,
        "  function signIn() {\n    if (!configured() || !client)",
        "  function signIn() {\n    manualLoginArmed = true; diagnosticLog('sign-in-attempt', {email:String((document.getElementById('cloud-email')||{}).value||'').trim()});\n    if (!configured() || !client)",
        'manual sign in arm')

    cloud = must_replace(cloud,
        "      if (result.error) throw result.error; session = result.data.session; document.getElementById('cloud-password').value = ''; return loadWorkspaces();",
        "      if (result.error) throw result.error; session = result.data.session; diagnosticLog('sign-in-success', diagnosticSnapshot()); document.getElementById('cloud-password').value = ''; return loadWorkspaces();",
        'sign in log')

    cloud = must_replace(cloud,
        "  function signOut() {\n    if (!client) return;",
        "  function signOut() {\n    manualLoginArmed = false; diagnosticLog('sign-out-requested', diagnosticSnapshot());\n    if (!client) return;",
        'sign out log')

    cloud = must_replace(cloud,
        "    syncing = true; setStatus('Synchronizing shared workspace…', 'busy'); updateUI();",
        "    diagnosticLog('sync-start', Object.assign({manual:!!manual}, diagnosticSnapshot()));\n    syncing = true; setStatus('Synchronizing shared workspace…', 'busy'); updateUI();",
        'sync start log')

    cloud = must_replace(cloud,
        "        setStatus('Cloud synchronized at ' + new Date(lastSuccessfulSyncAt).toLocaleTimeString(), 'ok');\n        return true;",
        "        diagnosticLog('sync-success', diagnosticSnapshot());\n        setStatus('Cloud synchronized at ' + new Date(lastSuccessfulSyncAt).toLocaleTimeString(), 'ok');\n        return true;",
        'sync success log')

    cloud = must_replace(cloud,
        "        lastSyncError = String(error && error.message || error || 'Unknown cloud error');\n        setStatus('Cloud sync paused: ' + lastSyncError, 'error');",
        "        lastSyncError = String(error && error.message || error || 'Unknown cloud error');\n        diagnosticLog('sync-error', Object.assign({error:lastSyncError}, diagnosticSnapshot()));\n        setStatus('Cloud sync paused: ' + lastSyncError, 'error');",
        'sync error log')

    cloud = must_replace(cloud,
        "      applyRemote(rows);\n      var meta=loadMeta();",
        "      applyRemote(rows); diagnosticLog('pull-complete', {rows:rows.length, profileId:profileId, profileSyncId:profileSyncId(profileId)});\n      var meta=loadMeta();",
        'pull log')

    cloud = must_replace(cloud,
        "      return sent;\n    });\n  }\n  function dailyDateKey",
        "      diagnosticLog('push-complete', {sent:sent, remaining:pendingForWorkspace().length});\n      return sent;\n    });\n  }\n  function dailyDateKey",
        'push log')

    cloud = must_replace(cloud,
        "      localStorage.setItem(WORKSPACE_KEY, workspaceId);\n      updateUI(); subscribeRealtime();",
        "      localStorage.setItem(WORKSPACE_KEY, workspaceId);\n      diagnosticLog('workspace-ready', diagnosticSnapshot());\n      updateUI(); subscribeRealtime();",
        'workspace log')

    cloud = must_replace(cloud,
        "  function init() {\n    if (initialized) return; initialized = true; injectUI();",
        "  function init() {\n    if (initialized) return; initialized = true; injectUI(); diagnosticLog('app-start', {manualLoginRequired:true, deviceId:deviceId});",
        'app start log')

    cloud = must_replace(cloud,
        "    document.body.appendChild(panel);\n    document.getElementById('cloud-close').addEventListener('click', closePanel);",
        "    document.body.appendChild(panel);\n    var diag=document.createElement('div'); diag.id='cloud-diagnostics'; diag.innerHTML='<hr style=\"margin:14px 0;border:0;border-top:1px solid #d7dee4\"><h3 style=\"margin:0 0 6px\">SYNC DIAGNOSTICS</h3><pre id=\"cloud-diagnostics-text\" style=\"white-space:pre-wrap;font:600 10px/1.45 var(--mono);background:#f5f7f9;border:1px solid #d7dee4;border-radius:8px;padding:9px;max-height:220px;overflow:auto\"></pre><div class=\"cloud-actions\"><button class=\"btn blue\" id=\"cloud-sync-test\">RUN SYNC TEST</button><button class=\"btn\" id=\"cloud-export-log\">EXPORT LOG</button></div><button class=\"btn wide\" id=\"cloud-clear-log\" style=\"margin-top:7px\">CLEAR SYNC LOG</button>';\n    var closeAnchor=document.getElementById('cloud-close'); closeAnchor.parentNode.insertBefore(diag, closeAnchor);\n    renderDiagnostics();\n    document.getElementById('cloud-close').addEventListener('click', closePanel);",
        'diagnostic UI')

    cloud = must_replace(cloud,
        "    document.getElementById('cloud-sync-now').addEventListener('click', function () { syncNow(true); });",
        "    document.getElementById('cloud-sync-now').addEventListener('click', function () { syncNow(true); });\n    document.getElementById('cloud-sync-test').addEventListener('click', function(){\n      diagnosticLog('sync-test-start', diagnosticSnapshot());\n      if(!session || !workspaceId){ setStatus('SYNC TEST: sign in manually first.', 'error'); return; }\n      syncNow(true).then(function(ok){ diagnosticLog('sync-test-result', Object.assign({ok:!!ok}, diagnosticSnapshot())); renderDiagnostics(); setStatus(ok ? 'SYNC TEST PASS — push/pull completed on this device.' : 'SYNC TEST FAILED — export the log for review.', ok?'ok':'error'); });\n    });\n    document.getElementById('cloud-export-log').addEventListener('click', exportDiagnosticLog);\n    document.getElementById('cloud-clear-log').addEventListener('click', clearDiagnosticLog);",
        'diagnostic listeners')

    cloud = must_replace(cloud,
        "    if (typeof window.LabelOnZeWayRefreshOperationsDeck === 'function') setTimeout(window.LabelOnZeWayRefreshOperationsDeck, 0);\n  }",
        "    renderDiagnostics();\n    if (typeof window.LabelOnZeWayRefreshOperationsDeck === 'function') setTimeout(window.LabelOnZeWayRefreshOperationsDeck, 0);\n  }",
        'diagnostic refresh')

    cloud = must_replace(cloud,
        "  api.getStatus = function () { return { configured: configured(), signedIn: !!session, userEmail: session && session.user ? String(session.user.email || '') : '', workspaceId: workspaceId, workspaceName: workspaceName, profileId: currentProfileId(), profileSyncId: profileSyncId(currentProfileId()), deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing, lastSuccessfulSyncAt: lastSuccessfulSyncAt, lastSyncError: lastSyncError, verified: !!(session && workspaceId && lastSuccessfulSyncAt && !lastSyncError && pendingForWorkspace().length === 0 && !syncing) }; };",
        "  api.getStatus = function () { return { configured: configured(), signedIn: !!session, userEmail: session && session.user ? String(session.user.email || '') : '', workspaceId: workspaceId, workspaceName: workspaceName, profileId: currentProfileId(), profileSyncId: profileSyncId(currentProfileId()), deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing, lastSuccessfulSyncAt: lastSuccessfulSyncAt, lastSyncError: lastSyncError, verified: !!(session && workspaceId && lastSuccessfulSyncAt && !lastSyncError && pendingForWorkspace().length === 0 && !syncing) }; };\n  api.getDiagnosticLog = readDiagnosticLog; api.exportDiagnosticLog = exportDiagnosticLog; api.clearDiagnosticLog = clearDiagnosticLog;",
        'diagnostic API')

CLOUD.write_text(cloud)

idx = IDX.read_text()
if 'LZ_LOGISTICS_COMMAND_UI_V1' not in idx:
    style = r'''\n<style id="lz-logistics-command-ui-v1">\n/* LZ_LOGISTICS_COMMAND_UI_V1 */\n@media screen and (min-width:901px){\n  body{background:#07131d!important;color:#dce8ee!important;padding-left:190px}\n  #top{background:#071018!important;border-bottom:1px solid #17303d;position:sticky;top:0;z-index:80}\n  #app{max-width:1600px;padding:18px 22px 28px;gap:14px}\n  .card{background:#0d1c27!important;color:#e6eff3!important;border-color:#24404d!important;box-shadow:0 8px 22px #0003!important}\n  .card-head .hint,label.f,.muted{color:#8fa8b4!important}\n  input[type=text],input[type=search],input[type=tel],input[type=number],input[type=date],input[type=time],select,textarea{background:#102430!important;color:#edf6f8!important;border-color:#2d4a58!important}\n  .brow,.ab-item,.batch-toolbar,.photo-tools{background:#0f202b!important;border-color:#294754!important}\n  #lz-command-rail{display:flex;position:fixed;left:0;top:0;bottom:0;width:190px;background:#081821;border-right:1px solid #1d3a46;z-index:95;padding:76px 12px 14px;flex-direction:column;gap:6px}\n  #lz-command-rail .lz-brand{font:900 15px var(--body);color:#eaf7f7;padding:0 8px 12px;border-bottom:1px solid #1d3a46;margin-bottom:6px}\n  #lz-command-rail button{border:0;background:transparent;color:#b8ccd4;text-align:left;padding:10px 11px;border-radius:8px;font:700 12px var(--body);cursor:pointer}\n  #lz-command-rail button:hover{background:#0f6570;color:#fff}\n  #lz-command-rail .lz-sync{margin-top:auto;border:1px solid #28505b}\n}\n@media screen and (max-width:900px){\n  body{background:#f6f8fa!important;color:#17212a!important;padding-bottom:calc(76px + env(safe-area-inset-bottom))}\n  #top{background:#fff!important;color:#14202a!important;border-bottom:1px solid #e1e7ec;padding:calc(9px + env(safe-area-inset-top)) 12px 9px;gap:8px;position:sticky;top:0;z-index:70}\n  #top .brand small,#top .chip.clock{display:none!important}\n  #top .chips{width:100%;margin-left:0;gap:6px}\n  #top .chip,#top .btn-ghost,select.profile{font-size:10px!important;padding:5px 7px!important}\n  #app{display:block!important;padding:10px!important;max-width:none!important}\n  .card{border:0!important;border-radius:14px!important;box-shadow:0 3px 12px rgba(20,35,45,.08)!important;margin-bottom:10px!important;padding:13px!important;background:#fff!important}\n  .card-head{margin-bottom:10px!important}.card-head .hint{display:none!important}\n  .btn{min-height:40px;box-shadow:none!important;border-width:1px!important}.btn.sm{min-height:34px}\n  .batch-toolbar,.photo-tools{background:#f8fafb!important}.batch-options{gap:10px!important}\n  #lz-mobile-nav{display:grid;position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));grid-template-columns:repeat(5,1fr);gap:4px;background:rgba(255,255,255,.96);border:1px solid #dfe7ec;border-radius:16px;padding:6px;z-index:100;box-shadow:0 8px 30px #2334}\n  #lz-mobile-nav button{border:0;background:transparent;border-radius:10px;padding:8px 3px;font:700 9px var(--body);color:#3b4a55}\n  #lz-mobile-nav button:active{background:#ddf7f5;color:#08767b}\n}\n@media screen and (min-width:901px){#lz-mobile-nav{display:none!important}}\n@media screen and (max-width:900px){#lz-command-rail{display:none!important}}\n</style>\n'''
    idx = idx.replace('</head>', style + '\n</head>', 1)

    navjs = r'''\n<script>\n(function(){\n  function byId(id){return document.getElementById(id)}\n  function openModal(id, renderName){var m=byId(id);if(m)m.classList.add('open');if(renderName&&typeof window[renderName]==='function')try{window[renderName]()}catch(e){}}\n  function scrollToEl(sel){var e=document.querySelector(sel);if(e)e.scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo({top:0,behavior:'smooth'})}\n  function activate(action){\n    if(action==='home')window.scrollTo({top:0,behavior:'smooth'});\n    else if(action==='new')scrollToEl('#app .card');\n    else if(action==='manifest')scrollToEl('#card-manifest');\n    else if(action==='tracking')openModal('m-tracking-view','renderTrackingView');\n    else if(action==='archive')openModal('m-arch','renderArch');\n    else if(action==='claims')openModal('m-label-vault','renderLabelVault');\n    else if(action==='settings')openModal('m-settings');\n    else if(action==='cloud'&&window.LabelOnZeWayCloud)window.LabelOnZeWayCloud.open();\n  }\n  function build(){\n    if(!byId('lz-command-rail')){var rail=document.createElement('aside');rail.id='lz-command-rail';rail.innerHTML='<div class="lz-brand">LZ · OPERATIONS COMMAND</div><button data-lz-nav="home">Operations</button><button data-lz-nav="new">New Label</button><button data-lz-nav="manifest">Manifest</button><button data-lz-nav="tracking">Tracking</button><button data-lz-nav="archive">Archive</button><button data-lz-nav="claims">Claims</button><button data-lz-nav="settings">Settings</button><button class="lz-sync" data-lz-nav="cloud">Cloud & Sync</button>';document.body.appendChild(rail)}\n    if(!byId('lz-mobile-nav')){var mob=document.createElement('nav');mob.id='lz-mobile-nav';mob.innerHTML='<button data-lz-nav="home">HOME</button><button data-lz-nav="new">NEW LABEL</button><button data-lz-nav="manifest">MANIFEST</button><button data-lz-nav="tracking">TRACKING</button><button data-lz-nav="settings">MORE</button>';document.body.appendChild(mob)}\n    document.addEventListener('click',function(e){var b=e.target.closest('[data-lz-nav]');if(!b)return;activate(b.getAttribute('data-lz-nav'))});\n  }\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();\n})();\n</script>\n'''
    idx = idx.replace('</body>', navjs + '\n</body>', 1)
IDX.write_text(idx)

# bump cache so iPhone/PWA receives the new UI and auth behavior
sw = SW.read_text()
sw = re.sub(r'labelonzeway-v2\.0\.1-[A-Za-z0-9._-]+', 'labelonzeway-v2.0.1-final-command-sync-20260907-1', sw, count=1)
SW.write_text(sw)

ANDROID.mkdir(parents=True, exist_ok=True)
for name in ['index.html','cloud-sync.js','service-worker.js']:
    shutil.copy2(WEB/name, ANDROID/name)

# final invariants
assert 'LZ_FINAL_MANUAL_LOGIN_LOG_V1' in CLOUD.read_text()
assert 'persistSession: false' in CLOUD.read_text()
assert 'LZ_LOGISTICS_COMMAND_UI_V1' in IDX.read_text()
for name in ['index.html','cloud-sync.js','service-worker.js']:
    assert (WEB/name).read_bytes() == (ANDROID/name).read_bytes(), name
print('FINAL COMMAND UI + MANUAL LOGIN + DIAGNOSTICS: PASS')
