from pathlib import Path

MARKER = 'LZ_REMOTE_AUTHORITATIVE_NO_RECAPTURE_V1'
paths = [
    Path('labelonzeway/cloud-sync.js'),
    Path('labelonzeway-android/app/src/main/assets/labelonzeway/cloud-sync.js'),
]
old = """    return pullRemote()\n      .then(function () { return captureProfile(currentProfileId(), false); })\n      .then(flushPending)\n      .then(pullRemote)"""
new = """    /* LZ_REMOTE_AUTHORITATIVE_NO_RECAPTURE_V1\n     * A pull is authoritative unless a genuine user-originated mutation is already\n     * queued. Never recapture the just-applied remote state as a fresh local edit.\n     */\n    return pullRemote()\n      .then(flushPending)\n      .then(pullRemote)"""
for path in paths:
    text = path.read_text()
    if MARKER not in text:
        if old not in text:
            raise SystemExit(f'Expected sync sequence not found in {path}')
        text = text.replace(old, new, 1)
        path.write_text(text)
    if MARKER not in path.read_text():
        raise SystemExit(f'Marker missing in {path}')

# Keep PWA cache deterministic so iPhone/Web cannot retain the old sync engine.
sw_paths = [
    Path('labelonzeway/service-worker.js'),
    Path('labelonzeway-android/app/src/main/assets/labelonzeway/service-worker.js'),
]
for path in sw_paths:
    text = path.read_text()
    import re
    text2, n = re.subn(r"labelonzeway-v2\.0\.1-command-final-20260907-\d+", "labelonzeway-v2.0.1-command-final-20260907-3", text, count=1)
    if n:
        path.write_text(text2)

# Exact runtime parity is mandatory.
for rel in ('cloud-sync.js', 'service-worker.js'):
    a = Path('labelonzeway') / rel
    b = Path('labelonzeway-android/app/src/main/assets/labelonzeway') / rel
    if a.read_bytes() != b.read_bytes():
        raise SystemExit(f'Runtime parity failed: {rel}')
print('AUTHORITATIVE REMOTE SYNC PATCH VERIFIED')
