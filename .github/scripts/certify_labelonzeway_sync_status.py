from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'labelonzeway'
ANDROID = ROOT / 'labelonzeway-android' / 'app' / 'src' / 'main' / 'assets' / 'labelonzeway'
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

    s = replace_once(
        s,
        "  var lastResult = '';\n  var deviceId = getDeviceId();",
        "  var lastResult = '';\n  /* LZ_TRUTHFUL_SYNC_STATUS_V1 */\n  var lastSuccessfulSyncAt = '';\n  var lastSyncError = '';\n  var deviceId = getDeviceId();",
        'sync status state',
    )

    old_success = """      .then(pullRemote)\n      .then(function () { lastResult = new Date().toISOString(); setStatus('Cloud synchronized at ' + new Date().toLocaleTimeString(), 'ok'); return ensureCounterAndBlock(); })\n      .catch(function (error) { console.warn('LabelOnZeWay cloud sync', error); setStatus('Cloud sync paused: ' + (error.message || error), 'error'); return false; })"""
    new_success = """      .then(pullRemote)\n      .then(function () { return ensureCounterAndBlock(); })\n      .then(function () {\n        lastSuccessfulSyncAt = new Date().toISOString();\n        lastSyncError = '';\n        lastResult = lastSuccessfulSyncAt;\n        setStatus('Cloud synchronized at ' + new Date(lastSuccessfulSyncAt).toLocaleTimeString(), 'ok');\n        return true;\n      })\n      .catch(function (error) {\n        console.warn('LabelOnZeWay cloud sync', error);\n        lastSyncError = String(error && error.message || error || 'Unknown cloud error');\n        setStatus('Cloud sync paused: ' + lastSyncError, 'error');\n        return false;\n      })"""
    s = replace_once(s, old_success, new_success, 'sync completion truth')

    old_pill = """    pill.className = 'btn-ghost' + (!editingPassword && pending ? ' pending' : (!editingPassword && session && workspaceId ? ' ok' : ''));\n    pill.textContent = editingPassword ? '☁ PASSWORD' : (session && workspaceId ? ('☁ ' + (pending ? pending + ' PENDING' : 'SYNCED')) : '☁ SIGN IN');"""
    new_pill = """    var trulySynced = !!(session && workspaceId && lastSuccessfulSyncAt && !lastSyncError && !syncing && pending === 0);\n    pill.className = 'btn-ghost' + (!editingPassword && pending ? ' pending' : (!editingPassword && trulySynced ? ' ok' : ''));\n    pill.textContent = editingPassword ? '☁ PASSWORD' : (!session || !workspaceId ? '☁ SIGN IN' : (syncing ? '☁ SYNCING…' : (pending ? ('☁ ' + pending + ' PENDING') : (trulySynced ? '☁ SYNCED' : (lastSyncError ? '☁ SYNC ERROR' : '☁ VERIFYING')))));\n    pill.title = session && workspaceId ? ((session.user && session.user.email ? session.user.email : 'signed in') + ' · ' + (workspaceName || workspaceId) + ' · ' + currentProfileId() + (lastSuccessfulSyncAt ? ' · last verified ' + new Date(lastSuccessfulSyncAt).toLocaleString() : '')) : 'Cloud sign-in required';"""
    s = replace_once(s, old_pill, new_pill, 'truthful cloud pill')

    old_status = """  api.getStatus = function () { return { configured: configured(), signedIn: !!session, userEmail: session && session.user ? String(session.user.email || '') : '', workspaceId: workspaceId, workspaceName: workspaceName, profileId: currentProfileId(), deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing }; };"""
    new_status = """  api.getStatus = function () { return { configured: configured(), signedIn: !!session, userEmail: session && session.user ? String(session.user.email || '') : '', workspaceId: workspaceId, workspaceName: workspaceName, profileId: currentProfileId(), deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing, lastSuccessfulSyncAt: lastSuccessfulSyncAt, lastSyncError: lastSyncError, verified: !!(session && workspaceId && lastSuccessfulSyncAt && !lastSyncError && pendingForWorkspace().length === 0 && !syncing) }; };"""
    s = replace_once(s, old_status, new_status, 'status API verification fields')

    CLOUD.write_text(s, encoding='utf-8')


def patch_service_worker():
    s = SW.read_text(encoding='utf-8')
    lines = s.splitlines()
    if not lines or not lines[0].startswith("const CACHE = '"):
        raise SystemExit('service worker cache declaration not found')
    lines[0] = "const CACHE = 'labelonzeway-v2.0.1-certified-sync-20260906-1';"
    SW.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def sync_android():
    for name in ['index.html', 'cloud-sync.js', 'sync-config.json', 'service-worker.js', 'manifest.webmanifest', 'icon.svg']:
        shutil.copy2(WEB / name, ANDROID / name)
    for name in ['tracking', 'tracking-dashboard']:
        dst = ANDROID / name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(WEB / name, dst)


def verify():
    cloud = CLOUD.read_text(encoding='utf-8')
    sw = SW.read_text(encoding='utf-8')
    markers = [
        'LZ_PULL_FIRST_CONVERGENCE_V1',
        'LZ_STARTUP_PULL_FIRST_V1',
        'LZ_WORKSPACE_SWITCH_PULL_FIRST_V1',
        'LZ_CLOUD_IDENTITY_STATUS_V1',
        'LZ_TRUTHFUL_SYNC_STATUS_V1',
        'lastSuccessfulSyncAt',
        "'☁ VERIFYING'",
        "'☁ SYNC ERROR'",
    ]
    missing = [m for m in markers if m not in cloud]
    if missing:
        raise SystemExit('missing certified sync markers: ' + ', '.join(missing))
    if 'certified-sync-20260906-1' not in sw:
        raise SystemExit('service worker certified cache marker missing')
    if "setStatus('Cloud synchronized" in cloud and ".then(function () { return ensureCounterAndBlock(); })" not in cloud:
        raise SystemExit('sync success can be reported before backend counter verification')

    for rel in ['index.html', 'cloud-sync.js', 'sync-config.json', 'service-worker.js', 'manifest.webmanifest', 'icon.svg', 'tracking/index.html', 'tracking-dashboard/index.html']:
        if (WEB / rel).read_bytes() != (ANDROID / rel).read_bytes():
            raise SystemExit(f'Web/Android mismatch: {rel}')

    print('PASS: truthful sync status')
    print('PASS: backend verification completes before SYNCED')
    print('PASS: pull-first convergence retained')
    print('PASS: Web/Android runtime parity')


def main():
    patch_cloud()
    patch_service_worker()
    sync_android()
    verify()


if __name__ == '__main__':
    main()
