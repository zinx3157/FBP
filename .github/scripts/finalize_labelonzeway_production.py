from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'labelonzeway'
ANDROID = ROOT / 'labelonzeway-android' / 'app' / 'src' / 'main' / 'assets' / 'labelonzeway'

INDEX = WEB / 'index.html'
CLOUD = WEB / 'cloud-sync.js'
SW = WEB / 'service-worker.js'


def replace_once(text, old, new, label):
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


def patch_cloud():
    s = CLOUD.read_text(encoding='utf-8')

    old_sync = """    return pullRemote()\n      .then(flushPending)\n      .then(pullRemote)\n      .then(function () { lastResult = new Date().toISOString(); setStatus('Cloud synchronized at ' + new Date().toLocaleTimeString(), 'ok'); return ensureCounterAndBlock(); })"""
    new_sync = """    /* LZ_PULL_FIRST_CONVERGENCE_V1\n     * Always learn the current cloud state before taking a fresh local snapshot.\n     * Pending offline edits are already timestamped and are protected by applyRemote().\n     * This prevents a stale Mac/Android startup snapshot from being queued with a new\n     * timestamp and overwriting the other device before the first pull completes.\n     */\n    return pullRemote()\n      .then(function () { return captureProfile(currentProfileId(), false); })\n      .then(flushPending)\n      .then(pullRemote)\n      .then(function () { lastResult = new Date().toISOString(); setStatus('Cloud synchronized at ' + new Date().toLocaleTimeString(), 'ok'); return ensureCounterAndBlock(); })"""
    s = replace_once(s, old_sync, new_sync, 'pull-first sync sequence')

    old_startup = """      var profileId = currentProfileId(), meta = loadMeta();\n      var profileReconciled = !!(meta.items && meta.items[profileId + '|profile_settings|' + profileId]);\n      if (!profileReconciled && !hasMeaningfulLocalData(profileId)) {\n        return pullRemote().then(function () { return captureProfile(profileId, false); }).then(function () { return syncNow(false); });\n      }\n      return captureProfile(profileId, false).then(function () { return syncNow(false); });"""
    new_startup = """      /* LZ_STARTUP_PULL_FIRST_V1 */\n      return syncNow(false);"""
    s = replace_once(s, old_startup, new_startup, 'workspace startup convergence')

    old_workspace_change = """      var profileId = currentProfileId(), meta = loadMeta();\n      var profileReconciled = !!(meta.items && meta.items[profileId + '|profile_settings|' + profileId]);\n      var ready = (!profileReconciled && !hasMeaningfulLocalData(profileId))\n        ? pullRemote().then(function () { return captureProfile(profileId, false); })\n        : captureProfile(profileId, false);\n      ready.then(function () { syncNow(false); }); updateUI();"""
    new_workspace_change = """      /* LZ_WORKSPACE_SWITCH_PULL_FIRST_V1 */\n      syncNow(false); updateUI();"""
    s = replace_once(s, old_workspace_change, new_workspace_change, 'workspace switch convergence')

    old_status = """  api.getStatus = function () { return { configured: configured(), signedIn: !!session, workspaceId: workspaceId, workspaceName: workspaceName, deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing }; };"""
    new_status = """  /* LZ_CLOUD_IDENTITY_STATUS_V1 */\n  api.getStatus = function () { return { configured: configured(), signedIn: !!session, userEmail: session && session.user ? String(session.user.email || '') : '', workspaceId: workspaceId, workspaceName: workspaceName, profileId: currentProfileId(), deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing }; };"""
    s = replace_once(s, old_status, new_status, 'cloud identity status')

    CLOUD.write_text(s, encoding='utf-8')


def patch_index():
    s = INDEX.read_text(encoding='utf-8')

    s = replace_once(
        s,
        '<div class="modal" id="m-settings"><div class="modal-box">',
        '<div class="modal" id="m-settings"><div class="modal-box settings-box">',
        'settings modal class',
    )

    old_head = """  <button class="modal-x" data-close="m-settings">✕</button>\n  <h3>SETTINGS</h3>"""
    new_head = """  <!-- LZ_PRODUCTION_SETTINGS_NAV_V1 -->\n  <div class="settings-sticky-nav">\n    <button class="btn sm" type="button" data-close="m-settings">← BACK TO OPERATIONS</button>\n    <h3>SETTINGS</h3>\n    <button class="btn sm" type="button" data-close="m-settings">✕ CLOSE</button>\n  </div>"""
    s = replace_once(s, old_head, new_head, 'settings sticky navigation')

    css = r'''
/* LZ_PRODUCTION_SETTINGS_LAYOUT_V1 */
#m-settings{padding:24px;align-items:center}
#m-settings .settings-box{width:min(860px,calc(100vw - 48px));max-height:min(86vh,780px);overflow:auto;overscroll-behavior:contain;padding:0 20px 20px;scrollbar-gutter:stable;border-color:#304957;background:#071721;color:#eaf7f7}
#m-settings .settings-sticky-nav{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin:0 -20px 16px;padding:14px 20px;background:rgba(7,23,33,.98);border-bottom:1px solid #294650;box-shadow:0 8px 18px rgba(0,0,0,.2)}
#m-settings .settings-sticky-nav h3{margin:0;text-align:center;font:800 14px var(--mono);letter-spacing:1.1px;color:#eaf7f7}
#m-settings .settings-sticky-nav .btn{box-shadow:none;white-space:nowrap;background:#0b2630;color:#dff;border-color:#476976}
#m-settings .printer-box{border-color:#2c4b56;background:#081b24}
#m-settings .printer-title,#m-settings label.f,#m-settings .hint{color:#a8c5ca}
#m-settings input,#m-settings select,#m-settings textarea{background:#0b222b;color:#edfafa;border-color:#365763}
#m-settings input:focus,#m-settings select:focus,#m-settings textarea:focus{border-color:#5ed6de;box-shadow:0 0 0 3px rgba(94,214,222,.13)}
#m-settings .row2{gap:12px}
@media (max-width:700px){
  #m-settings{padding:0;align-items:stretch}
  #m-settings .settings-box{width:100%;max-height:100dvh;min-height:100dvh;border-radius:0;border-left:0;border-right:0;padding:0 14px 18px}
  #m-settings .settings-sticky-nav{grid-template-columns:1fr auto;margin:0 -14px 14px;padding:calc(10px + env(safe-area-inset-top)) 14px 10px}
  #m-settings .settings-sticky-nav h3{grid-column:1/-1;grid-row:1;text-align:left;font-size:12px;opacity:.8}
  #m-settings .settings-sticky-nav .btn:first-child{grid-column:1;grid-row:2;justify-self:start}
  #m-settings .settings-sticky-nav .btn:last-child{grid-column:2;grid-row:2;justify-self:end}
}
'''
    if 'LZ_PRODUCTION_SETTINGS_LAYOUT_V1' not in s:
        first_close = s.find('</style>')
        if first_close < 0:
            raise SystemExit('main style closing tag not found')
        s = s[:first_close] + css + '\n' + s[first_close:]

    INDEX.write_text(s, encoding='utf-8')


def patch_service_worker():
    s = SW.read_text(encoding='utf-8')
    old = "const CACHE = 'labelonzeway-v2.0.1-production-vault-nav-20260906-1';"
    new = "const CACHE = 'labelonzeway-v2.0.1-production-convergence-20260906-1';"
    if new not in s:
        if old not in s:
            raise SystemExit('service worker cache anchor changed unexpectedly')
        s = s.replace(old, new, 1)
    SW.write_text(s, encoding='utf-8')


def sync_android():
    ANDROID.mkdir(parents=True, exist_ok=True)
    for name in ['index.html', 'cloud-sync.js', 'sync-config.json', 'service-worker.js', 'manifest.webmanifest', 'icon.svg']:
        shutil.copy2(WEB / name, ANDROID / name)
    for name in ['tracking', 'tracking-dashboard']:
        dst = ANDROID / name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(WEB / name, dst)


def verify():
    index = INDEX.read_text(encoding='utf-8')
    cloud = CLOUD.read_text(encoding='utf-8')
    sw = SW.read_text(encoding='utf-8')
    required = [
        ('index', index, 'LZ_PRODUCTION_SETTINGS_NAV_V1'),
        ('index', index, 'LZ_PRODUCTION_SETTINGS_LAYOUT_V1'),
        ('index', index, 'LZ_LABEL_VAULT_NAV_V1'),
        ('index', index, 'LZ_PRODUCTION_TRACKING_VIEW_V1'),
        ('cloud', cloud, 'LZ_PULL_FIRST_CONVERGENCE_V1'),
        ('cloud', cloud, 'LZ_STARTUP_PULL_FIRST_V1'),
        ('cloud', cloud, 'LZ_WORKSPACE_SWITCH_PULL_FIRST_V1'),
        ('cloud', cloud, 'LZ_CLOUD_IDENTITY_STATUS_V1'),
        ('cloud', cloud, 'lastPullByProfile'),
        ('sw', sw, 'production-convergence-20260906-1'),
    ]
    missing = [f'{kind}:{marker}' for kind, text, marker in required if marker not in text]
    if missing:
        raise SystemExit('missing production markers: ' + ', '.join(missing))

    for rel in ['index.html', 'cloud-sync.js', 'sync-config.json', 'service-worker.js', 'manifest.webmanifest', 'icon.svg', 'tracking/index.html', 'tracking-dashboard/index.html']:
        a = WEB / rel
        b = ANDROID / rel
        if a.read_bytes() != b.read_bytes():
            raise SystemExit(f'Web/Android runtime mismatch: {rel}')

    if "return captureProfile(profileId, false).then(function () { return syncNow(false); });" in cloud:
        raise SystemExit('unsafe startup capture-before-pull sequence still present')
    if "ready.then(function () { syncNow(false); }); updateUI();" in cloud:
        raise SystemExit('unsafe workspace-switch capture-before-pull sequence still present')

    print('PASS: pull-first convergence')
    print('PASS: Mac settings navigation/layout source')
    print('PASS: label vault navigation retained')
    print('PASS: tracking view retained')
    print('PASS: Web/Android canonical assets identical')


def main():
    patch_cloud()
    patch_index()
    patch_service_worker()
    sync_android()
    verify()


if __name__ == '__main__':
    main()
