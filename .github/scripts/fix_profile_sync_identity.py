from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'labelonzeway' / 'cloud-sync.js'
ANDROID = ROOT / 'labelonzeway-android' / 'app' / 'src' / 'main' / 'assets' / 'labelonzeway' / 'cloud-sync.js'
SW = ROOT / 'labelonzeway' / 'service-worker.js'
ANDROID_SW = ROOT / 'labelonzeway-android' / 'app' / 'src' / 'main' / 'assets' / 'labelonzeway' / 'service-worker.js'

text = WEB.read_text()

if 'LZ_CANONICAL_PROFILE_SYNC_V1' not in text:
    anchor = "  function currentProfileId() {\n    return typeof window.PID === 'string' && window.PID ? window.PID : (localStorage.getItem(PROFILE_KEY) || 'P1');\n  }\n"
    insert = anchor + "  /* LZ_CANONICAL_PROFILE_SYNC_V1 */\n  function normalizedProfileName(profileId) {\n    var profile = currentProfiles().find(function (item) { return item && String(item.id) === String(profileId); });\n    var name = String(profile && profile.name || profileId || 'P1').trim().toLowerCase().replace(/\\s+/g, ' ');\n    return name || 'p1';\n  }\n  function profileSyncId(profileId) {\n    var name = normalizedProfileName(profileId), hash = 2166136261;\n    for (var i = 0; i < name.length; i++) { hash ^= name.charCodeAt(i); hash = Math.imul(hash, 16777619); }\n    return 'ps_' + (hash >>> 0).toString(16).padStart(8, '0');\n  }\n  function localProfileIdForSync(syncId) {\n    var current = currentProfileId();\n    if (String(syncId) === profileSyncId(current)) return current;\n    var match = currentProfiles().find(function (item) { return item && profileSyncId(item.id) === String(syncId); });\n    return match ? match.id : syncId;\n  }\n"
    if anchor not in text:
        raise SystemExit('currentProfileId anchor not found')
    text = text.replace(anchor, insert, 1)

# Cloud print uses the canonical profile identity.
text = text.replace("      profile_id: currentProfileId(),", "      profile_id: profileSyncId(currentProfileId()),", 1)

# Local-presence checks must translate the canonical cloud key back to the local profile id.
text = text.replace("    var pid=record.profile_id, id=String(record.entity_id||'');", "    var pid=localProfileIdForSync(record.profile_id), id=String(record.entity_id||'');", 1)

# Snapshot business entities under a deterministic key derived from the company profile name.
old = "  function profileSnapshot(profileId) {\n    var active = profileId === currentProfileId() && window.state;"
new = "  function profileSnapshot(profileId) {\n    var syncProfileId = profileSyncId(profileId);\n    var active = profileId === currentProfileId() && window.state;"
if old in text:
    text = text.replace(old, new, 1)

start = text.index('  function profileSnapshot(profileId) {')
end = text.index('  function metaKey()', start)
block = text[start:end]
block = block.replace("entities.push({ profile_id: profile.id, entity_type: 'profile', entity_id: profile.id, payload: { id: profile.id, name: profile.name || profile.id } });",
                      "var cloudId = profileSyncId(profile.id); entities.push({ profile_id: cloudId, entity_type: 'profile', entity_id: cloudId, payload: { id: cloudId, name: profile.name || profile.id } });")
block = block.replace("profile_id: profileId", "profile_id: syncProfileId")
text = text[:start] + block + text[end:]

# Capture metadata/deletion scope follows the canonical cloud profile id.
old = "    profileId = profileId || currentProfileId();\n    var meta = loadMeta(), pending = loadPending(), seen = {}, changed = false;"
new = "    profileId = profileId || currentProfileId();\n    var syncProfile = profileSyncId(profileId);\n    var meta = loadMeta(), pending = loadPending(), seen = {}, changed = false;"
text = text.replace(old, new, 1)
text = text.replace("      return parts[0] === profileId && parts[1] === 'customer'", "      return parts[0] === syncProfile && parts[1] === 'customer'", 1)
text = text.replace("      var inScope = (type === 'profile') || (itemProfile === profileId && SYNC_TYPES.indexOf(type) >= 0);", "      var inScope = (type === 'profile') || (itemProfile === syncProfile && SYNC_TYPES.indexOf(type) >= 0);", 1)

# Explicit deletions use the same canonical key.
old = "    var meta = loadMeta(), pending = loadPending(), key = profileId + '|' + entityType + '|' + String(entityId);"
new = "    var syncProfile = profileSyncId(profileId);\n    var meta = loadMeta(), pending = loadPending(), key = syncProfile + '|' + entityType + '|' + String(entityId);"
text = text.replace(old, new, 1)
text = text.replace("var mutation = { workspace_id: workspaceId, profile_id: profileId, entity_type: entityType", "var mutation = { workspace_id: workspaceId, profile_id: syncProfile, entity_type: entityType", 1)

# Apply only business records for the canonical profile, while retaining the local profile id in localStorage/state.
text = text.replace("    var profileId = currentProfileId(), meta = loadMeta(), pending = loadPending(), changed = false;",
                    "    var profileId = currentProfileId(), syncProfile = profileSyncId(profileId), meta = loadMeta(), pending = loadPending(), changed = false;", 1)
text = text.replace("        if (record.entity_type !== 'profile' && record.profile_id !== profileId) return;",
                    "        if (record.entity_type !== 'profile' && record.profile_id !== syncProfile) return;", 1)
text = text.replace("profileSettingsScore(storageValue(record.profile_id, 'shop', {}))",
                    "profileSettingsScore(storageValue(localProfileIdForSync(record.profile_id), 'shop', {}))", 1)
text = text.replace("        } else if (record.profile_id === profileId && window.state) {",
                    "        } else if (record.profile_id === syncProfile && window.state) {", 1)

# Merge same-name cloud profile records instead of creating device-specific duplicates.
old = "          var profiles = currentProfiles().slice(), at = profiles.findIndex(function (item) { return item.id === record.entity_id; });\n          if (deleted) { if (at >= 0 && record.entity_id !== profileId) profiles.splice(at, 1); }\n          else if (at >= 0) profiles[at] = record.payload; else profiles.push(record.payload);"
new = "          var profiles = currentProfiles().slice(), remoteName = String(record.payload && record.payload.name || '').trim();\n          var normalizedRemoteName = remoteName.toLowerCase().replace(/\\s+/g, ' ');\n          var at = profiles.findIndex(function (item) { return item.id === record.entity_id || (normalizedRemoteName && String(item && item.name || '').trim().toLowerCase().replace(/\\s+/g, ' ') === normalizedRemoteName); });\n          if (deleted) { if (at >= 0 && profiles[at].id !== profileId) profiles.splice(at, 1); }\n          else if (at >= 0) profiles[at] = Object.assign({}, record.payload || {}, { id: profiles[at].id, name: remoteName || profiles[at].name });\n          else profiles.push(record.payload);"
if old not in text:
    raise SystemExit('profile merge block not found')
text = text.replace(old, new, 1)

# Daily counters are company-profile scoped across devices too.
text = text.replace("p_profile_id: profileId, p_counter_date: dateKey", "p_profile_id: profileSyncId(profileId), p_counter_date: dateKey", 1)
text = text.replace("p_profile_id: profileId, p_counter_date: dateKey, p_block_size: 25", "p_profile_id: profileSyncId(profileId), p_counter_date: dateKey, p_block_size: 25", 1)

# Expose the deterministic profile identity for diagnostics.
text = text.replace("profileId: currentProfileId(),", "profileId: currentProfileId(), profileSyncId: profileSyncId(currentProfileId()),", 1)

WEB.write_text(text)
ANDROID.write_text(text)

# Bump cache so iPhone/PWA cannot retain the old profile-partitioning runtime.
sw = SW.read_text()
import re
sw = re.sub(r"labelonzeway-v2\.0\.1-[A-Za-z0-9._-]+", "labelonzeway-v2.0.1-production-profile-sync-20260907-1", sw, count=1)
SW.write_text(sw)
ANDROID_SW.write_text(sw)

# Gates.
assert 'LZ_CANONICAL_PROFILE_SYNC_V1' in text
assert "profile_id: syncProfileId" in text
assert "record.profile_id !== syncProfile" in text
assert "localProfileIdForSync(record.profile_id)" in text
assert WEB.read_bytes() == ANDROID.read_bytes()
assert SW.read_bytes() == ANDROID_SW.read_bytes()
print('PASS: canonical company-profile synchronization is identical on Web/PWA and Android')
