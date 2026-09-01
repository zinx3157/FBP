/* LabelOnZeWay secure Supabase synchronization.
 * Business records sync through authenticated, RLS-protected workspace rows.
 * Printer settings, gateway details, and pending print jobs deliberately remain local.
 */
(function () {
  'use strict';

  var HOST = window.LabelOnZeWaySyncHost || {};
  var CONFIG_PATH = HOST.configPath || 'sync-config.json';
  var PROFILE_KEY = HOST.profileKey || 'lz.profile';
  var PROFILES_KEY = HOST.profilesKey || 'lz.profiles';
  var DEVICE_KEY = 'lz.cloud.device.v1';
  var WORKSPACE_KEY = 'lz.cloud.workspace.v1';
  var PENDING_KEY = 'lz.cloud.pending.v1';
  var BLOCK_PREFIX = 'lz.cloud.order-block.v1.';
  var LOCAL_SHOP_KEYS = [
    'printMode', 'printerIp', 'printerPort', 'bridgeUrl', 'printerDots',
    'printerFeed', 'printerThreshold', 'printerCut', 'cutEach', 'qwenUrl', 'qwenModel'
  ];
  var SYNC_TYPES = ['profile_settings', 'customer', 'parcel_active', 'archive_day', 'label_copy', 'counter_state'];
  var PUSH_BATCH_RECORDS = 200;
  var PUSH_BATCH_BYTES = 4 * 1024 * 1024;
  var MAX_MUTATION_BYTES = 8 * 1024 * 1024;
  var api = {};
  var config = null;
  var client = null;
  var session = null;
  var workspaceId = localStorage.getItem(WORKSPACE_KEY) || '';
  var workspaceName = '';
  var workspaces = [];
  var syncTimer = null;
  var captureTimer = null;
  var pullTimer = null;
  var channel = null;
  var initialized = false;
  var syncing = false;
  var suppressCapture = false;
  var lastResult = '';
  var deviceId = getDeviceId();
  var PASSWORD_RESET_REDIRECT = HOST.passwordResetRedirect || 'https://zinx3157.github.io/FBP/labelonzeway/?lz_action=password-recovery';
  var recoveryIntent = hasPasswordRecoveryIntent();
  var passwordFormMode = '';
  var passwordUpdateInProgress = false;
  var suppressPasswordUserUpdatedEvent = false;

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function getDeviceId() {
    var existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    var random = '';
    try {
      var bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      random = Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { random = Math.random().toString(36).slice(2) + Date.now().toString(36); }
    var value = 'dev-' + random;
    localStorage.setItem(DEVICE_KEY, value);
    return value;
  }
  function configured() {
    return !!(config && /^https:\/\//i.test(config.supabaseUrl || '') && String(config.supabaseAnonKey || '').length > 20);
  }
  function publicTrackingBase() {
    var configuredUrl = String(config && config.publicTrackingUrl || '').trim();
    if (configuredUrl) return configuredUrl.replace(/\/$/, '') + '/';
    return 'https://zinx3157.github.io/FBP/labelonzeway/tracking/';
  }
  function publishTrackingRecords(records) {
    if (!client || !session || !workspaceId) return Promise.reject(new Error('Sign in to Cloud before publishing internet tracking'));
    var safeRecords = (Array.isArray(records) ? records : []).slice(0, 1000).map(function (record) {
      var value = record && record.public || {};
      return { token: String(record && record.token || ''), order_number: String(value.orderNumber || ''), status: String(value.status || 'ready'), milestone: String(value.milestone || ''), delivery_process_date: String(value.deliveryProcessDate || ''), last_update: String(value.lastUpdate || ''), pod_available: !!value.podAvailable };
    }).filter(function (record) { return /^trk_[A-Za-z0-9_-]{20,}$/.test(record.token) && record.order_number; });
    return client.rpc('publish_public_tracking', { p_workspace_id: workspaceId, p_records: safeRecords }).then(function (result) {
      if (result.error) throw result.error;
      return { records: Number(result.data || safeRecords.length), mode: 'cloud' };
    });
  }
  function currentProfileId() {
    return typeof window.PID === 'string' && window.PID ? window.PID : (localStorage.getItem(PROFILE_KEY) || 'P1');
  }
  function profileKey(profileId, suffix) { return profileId + '.' + suffix; }
  function storageValue(profileId, suffix, fallback) {
    return safeParse(localStorage.getItem(profileKey(profileId, suffix)), fallback);
  }
  function currentProfiles() {
    if (Array.isArray(window.PROFILES)) return window.PROFILES;
    return safeParse(localStorage.getItem(PROFILES_KEY), [{ id: 'P1', name: 'Company 1' }]);
  }
  function safeShop(shop) {
    var output = Object.assign({}, shop || {});
    LOCAL_SHOP_KEYS.forEach(function (key) { delete output[key]; });
    return output;
  }
  function hasMeaningfulLocalData(profileId) {
    var active = profileId === currentProfileId() && window.state;
    var customers = active ? window.state.addr : storageValue(profileId, 'addr', []);
    var parcels = active ? window.state.manifest : storageValue(profileId, 'mani', []);
    var archives = active ? window.state.archive : storageValue(profileId, 'arch', []);
    var labels = active ? window.state.labelVault : storageValue(profileId, 'labels', []);
    var shop = active ? window.state.shop : storageValue(profileId, 'shop', {});
    return (customers && customers.length) || (parcels && parcels.length) || (archives && archives.length) || (labels && labels.length) ||
      (shop && shop.name && shop.name !== 'YOUR PAGE NAME' && shop.name !== 'Company 1');
  }
  function profileSnapshot(profileId) {
    var active = profileId === currentProfileId() && window.state;
    var shop = active ? window.state.shop : storageValue(profileId, 'shop', {});
    var customers = active ? window.state.addr : storageValue(profileId, 'addr', []);
    var parcels = active ? window.state.manifest : storageValue(profileId, 'mani', []);
    var archives = active ? window.state.archive : storageValue(profileId, 'arch', []);
    var labels = active ? window.state.labelVault : storageValue(profileId, 'labels', []);
    var counter = active ? window.state.counter : storageValue(profileId, 'ctr', 0);
    var entities = [];
    currentProfiles().forEach(function (profile) {
      entities.push({ profile_id: profile.id, entity_type: 'profile', entity_id: profile.id, payload: { id: profile.id, name: profile.name || profile.id } });
    });
    entities.push({ profile_id: profileId, entity_type: 'profile_settings', entity_id: profileId, payload: safeShop(shop) });
    (Array.isArray(customers) ? customers : []).forEach(function (record) {
      if (record && record.id) entities.push({ profile_id: profileId, entity_type: 'customer', entity_id: String(record.id), payload: record });
    });
    (Array.isArray(parcels) ? parcels : []).forEach(function (record) {
      if (record && record.id) entities.push({ profile_id: profileId, entity_type: 'parcel_active', entity_id: String(record.id), payload: record });
    });
    (Array.isArray(archives) ? archives : []).forEach(function (record) {
      if (record && record.id) entities.push({ profile_id: profileId, entity_type: 'archive_day', entity_id: String(record.id), payload: record });
    });
    (Array.isArray(labels) ? labels : []).forEach(function (record) {
      if (record && record.id) entities.push({ profile_id: profileId, entity_type: 'label_copy', entity_id: String(record.id), payload: record });
    });
    entities.push({ profile_id: profileId, entity_type: 'counter_state', entity_id: profileId, payload: { value: Math.max(0, Number(counter) || 0) } });
    return entities;
  }
  function metaKey() { return 'lz.cloud.meta.v1.' + workspaceId; }
  function loadMeta() { return safeParse(localStorage.getItem(metaKey()), { items: {}, lastPull: '' }); }
  function saveMeta(meta) { if (workspaceId) localStorage.setItem(metaKey(), JSON.stringify(meta)); }
  function loadPending() { return safeParse(localStorage.getItem(PENDING_KEY), {}); }
  function savePending(pending) { localStorage.setItem(PENDING_KEY, JSON.stringify(pending)); updateUI(); }
  function entityKey(row) { return row.workspace_id + '|' + row.profile_id + '|' + row.entity_type + '|' + row.entity_id; }
  function localEntityKey(row) { return row.profile_id + '|' + row.entity_type + '|' + row.entity_id; }
  function fingerprint(payload, deleted) {
    var text = JSON.stringify(payload == null ? null : payload);
    var first = 2166136261, second = 5381;
    for (var index = 0; index < text.length; index++) {
      var code = text.charCodeAt(index);
      first ^= code; first = Math.imul(first, 16777619);
      second = Math.imul(second, 33) ^ code;
    }
    return (deleted ? 'D:' : 'A:') + text.length + ':' + (first >>> 0).toString(16) + ':' + (second >>> 0).toString(16);
  }
  function timestampAfter(previous) {
    var now = Date.now();
    if (previous) now = Math.max(now, Date.parse(previous) + 1 || now);
    return new Date(now).toISOString();
  }
  function pendingForWorkspace() {
    var pending = loadPending();
    return Object.keys(pending).map(function (key) { return pending[key]; }).filter(function (item) { return item.workspace_id === workspaceId; });
  }

  function captureProfile(profileId, force) {
    if (suppressCapture || !workspaceId) return Promise.resolve(false);
    profileId = profileId || currentProfileId();
    var meta = loadMeta(), pending = loadPending(), seen = {}, changed = false;
    var snapshot = profileSnapshot(profileId);
    var localCustomerCount = snapshot.filter(function (entity) { return entity.profile_id === profileId && entity.entity_type === 'customer'; }).length;
    var knownActiveCustomerCount = Object.keys(meta.items).filter(function (key) {
      var parts = key.split('|'), info = meta.items[key];
      return parts[0] === profileId && parts[1] === 'customer' && info && !info.deleted;
    }).length;
    // A missing/cleared localStorage value must never become a mass cloud delete
    // merely because stale sync metadata survived. Explicit customer deletion uses
    // markEntityDeleted(); full-profile reset uses resetCurrentProfile(). A forced
    // backup reconciliation may still intentionally replace the synchronized set.
    var protectUnexpectedEmptyCustomers = !force && localCustomerCount === 0 && knownActiveCustomerCount > 0;
    snapshot.forEach(function (entity) {
      var key = localEntityKey(entity), fullKey;
      seen[key] = true;
      var fp = fingerprint(entity.payload, false), previous = meta.items[key];
      if (!force && previous && previous.fingerprint === fp && !previous.deleted) return;
      var modified = timestampAfter(previous && previous.modified_at);
      var mutation = Object.assign({ workspace_id: workspaceId, modified_at: modified, device_id: deviceId, deleted_at: null }, entity);
      fullKey = entityKey(mutation);
      pending[fullKey] = mutation;
      meta.items[key] = { fingerprint: fp, modified_at: modified, deleted: false, device_id: deviceId };
      changed = true;
    });
    Object.keys(meta.items).forEach(function (key) {
      var info = meta.items[key], parts = key.split('|');
      if (parts.length < 3 || seen[key] || info.deleted) return;
      var itemProfile = parts[0], type = parts[1], id = parts.slice(2).join('|');
      var inScope = (type === 'profile') || (itemProfile === profileId && SYNC_TYPES.indexOf(type) >= 0);
      // Claim copies are append-only during normal capture. Missing local storage,
      // an older backup, archive deletion, or a second app must never tombstone them.
      // Only the explicit full-profile reset may delete synchronized claim copies.
      if (!inScope || type === 'label_copy' || (type === 'customer' && protectUnexpectedEmptyCustomers)) return;
      var modified = timestampAfter(info.modified_at);
      var mutation = { workspace_id: workspaceId, profile_id: itemProfile, entity_type: type, entity_id: id, payload: {}, modified_at: modified, deleted_at: modified, device_id: deviceId };
      pending[entityKey(mutation)] = mutation;
      meta.items[key] = { fingerprint: fingerprint({}, true), modified_at: modified, deleted: true, device_id: deviceId };
      changed = true;
    });
    if (protectUnexpectedEmptyCustomers) setStatus('Empty local customer book detected — cloud deletions blocked while recovery is checked.', 'pending');
    if (changed) { saveMeta(meta); savePending(pending); setStatus('Changes saved offline; cloud sync pending.', 'pending'); }
    return Promise.resolve(changed);
  }
  function markEntityDeleted(entityType, entityId, profileId) {
    profileId = profileId || currentProfileId();
    if (!workspaceId || SYNC_TYPES.indexOf(entityType) < 0 || !entityId) return Promise.resolve(false);
    var meta = loadMeta(), pending = loadPending(), key = profileId + '|' + entityType + '|' + String(entityId);
    var previous = meta.items[key], modified = timestampAfter(previous && previous.modified_at);
    var mutation = { workspace_id: workspaceId, profile_id: profileId, entity_type: entityType, entity_id: String(entityId), payload: {}, modified_at: modified, deleted_at: modified, device_id: deviceId };
    pending[entityKey(mutation)] = mutation;
    meta.items[key] = { fingerprint: fingerprint({}, true), modified_at: modified, deleted: true, device_id: deviceId };
    saveMeta(meta); savePending(pending); setStatus('Deletion saved offline; cloud sync pending.', 'pending');
    if (navigator.onLine !== false) scheduleCapture('urgent');
    return Promise.resolve(true);
  }
  function scheduleCapture(reason) {
    if (!workspaceId || suppressCapture) return;
    clearTimeout(captureTimer);
    captureTimer = setTimeout(function () {
      captureProfile(currentProfileId(), false).then(function () {
        if (navigator.onLine !== false) syncNow(false);
      });
    }, reason === 'urgent' ? 20 : 650);
  }

  function mergeById(list, record, deleted) {
    list = Array.isArray(list) ? list : [];
    var index = list.findIndex(function (item) { return item && String(item.id) === String(record.entity_id); });
    if (deleted) { if (index >= 0) list.splice(index, 1); return list; }
    var payload = record.payload || {};
    if (index >= 0) list[index] = payload; else list.push(payload);
    return list;
  }
  function applyRemote(records) {
    if (!Array.isArray(records) || !workspaceId) return false;
    var profileId = currentProfileId(), meta = loadMeta(), pending = loadPending(), changed = false;
    suppressCapture = true;
    try {
      records.sort(function (a, b) { return String(a.modified_at).localeCompare(String(b.modified_at)); }).forEach(function (record) {
        if (record.entity_type !== 'profile' && record.profile_id !== profileId) return;
        var key = localEntityKey(record), remoteTime = String(record.modified_at || ''), remoteDevice = String(record.device_id || ''), localInfo = meta.items[key];
        var queued = pending[entityKey(record)];
        if (queued) {
          var queuedTime = String(queued.modified_at || ''), queuedDevice = String(queued.device_id || '');
          if (queuedTime > remoteTime || (queuedTime === remoteTime && queuedDevice >= remoteDevice)) return;
        }
        if (localInfo) {
          var localTime = String(localInfo.modified_at || ''), localDevice = String(localInfo.device_id || '');
          if (localTime > remoteTime || (localTime === remoteTime && localDevice >= remoteDevice)) return;
        }
        var deleted = !!record.deleted_at;
        if (record.entity_type === 'profile') {
          var profiles = currentProfiles().slice(), at = profiles.findIndex(function (item) { return item.id === record.entity_id; });
          if (deleted) { if (at >= 0 && record.entity_id !== profileId) profiles.splice(at, 1); }
          else if (at >= 0) profiles[at] = record.payload; else profiles.push(record.payload);
          window.PROFILES = profiles;
          localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
          if (typeof window.renderProfileSel === 'function') window.renderProfileSel();
          changed = true;
        } else if (record.profile_id === profileId && window.state) {
          if (record.entity_type === 'profile_settings') {
            var localOnly = {};
            LOCAL_SHOP_KEYS.forEach(function (localKey) {
              if (Object.prototype.hasOwnProperty.call(window.state.shop || {}, localKey)) localOnly[localKey] = window.state.shop[localKey];
            });
            if (deleted) window.state.shop = Object.assign({}, window.DEFAULT_SHOP || {}, localOnly);
            else window.state.shop = Object.assign({}, window.state.shop, safeShop(record.payload || {}), localOnly);
            localStorage.setItem(profileKey(profileId, 'shop'), JSON.stringify(window.state.shop));
            changed = true;
          } else if (record.entity_type === 'customer') {
            window.state.addr = mergeById(window.state.addr, record, deleted);
            localStorage.setItem(profileKey(profileId, 'addr'), JSON.stringify(window.state.addr)); changed = true;
          } else if (record.entity_type === 'parcel_active') {
            window.state.manifest = mergeById(window.state.manifest, record, deleted);
            localStorage.setItem(profileKey(profileId, 'mani'), JSON.stringify(window.state.manifest)); changed = true;
          } else if (record.entity_type === 'archive_day') {
            window.state.archive = mergeById(window.state.archive, record, deleted);
            window.state.archive.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
            localStorage.setItem(profileKey(profileId, 'arch'), JSON.stringify(window.state.archive)); changed = true;
          } else if (record.entity_type === 'label_copy') {
            window.state.labelVault = mergeById(window.state.labelVault, record, deleted);
            window.state.labelVault.sort(function (a, b) { return String(b.savedAt || '').localeCompare(String(a.savedAt || '')); });
            localStorage.setItem(profileKey(profileId, 'labels'), JSON.stringify(window.state.labelVault)); changed = true;
          } else if (record.entity_type === 'counter_state') {
            window.state.counter = deleted ? 0 : Math.max(Number(window.state.counter) || 0, Number(record.payload && record.payload.value) || 0);
            localStorage.setItem(profileKey(profileId, 'ctr'), JSON.stringify(window.state.counter)); changed = true;
          }
        }
        meta.items[key] = { fingerprint: fingerprint(record.payload, deleted), modified_at: remoteTime, deleted: deleted, device_id: record.device_id || '' };
      });
      saveMeta(meta);
      if (changed) refreshApp();
    } finally { suppressCapture = false; }
    return changed;
  }
  function refreshApp() {
    ['applyCurrency', 'applyLabelLen', 'rebuildRecSelect', 'renderManifest', 'renderStats', 'renderPreview', 'renderBatch', 'renderLabelVault', 'updateLabelVaultCount', 'renderProfileSel'].forEach(function (name) {
      try { if (typeof window[name] === 'function') window[name](); } catch (e) { console.warn('Cloud refresh ' + name, e); }
    });
  }

  function pullRemote() {
    if (!client || !session || !workspaceId) return Promise.resolve([]);
    var pageSize = 1000, all = [];
    function page(from) {
      return client.from('sync_entities').select('workspace_id,profile_id,entity_type,entity_id,payload,modified_at,deleted_at,device_id')
        .eq('workspace_id', workspaceId).order('modified_at', { ascending: true }).range(from, from + pageSize - 1).then(function (result) {
          if (result.error) throw result.error;
          var rows = result.data || []; all = all.concat(rows);
          return rows.length === pageSize ? page(from + pageSize) : all;
        });
    }
    return page(0).then(function (rows) {
      applyRemote(rows);
      var meta = loadMeta(); meta.lastPull = new Date().toISOString(); saveMeta(meta);
      return rows;
    });
  }
  function utf8Size(value) {
    var text = JSON.stringify(value);
    try { return new Blob([text]).size; } catch (e) { return unescape(encodeURIComponent(text)).length; }
  }
  function mutationBatches(changes) {
    var batches = [], rejected = [], batch = [], bytes = 2;
    changes.forEach(function (change) {
      var size = utf8Size(change);
      if (size > MAX_MUTATION_BYTES) { rejected.push(change); return; }
      if (batch.length && (batch.length >= PUSH_BATCH_RECORDS || bytes + size + 1 > PUSH_BATCH_BYTES)) {
        batches.push(batch); batch = []; bytes = 2;
      }
      batch.push(change); bytes += size + 1;
    });
    if (batch.length) batches.push(batch);
    return { batches: batches, rejected: rejected };
  }
  function flushPending() {
    var changes = pendingForWorkspace();
    if (!client || !session || !workspaceId || !changes.length || navigator.onLine === false) return Promise.resolve(0);
    var plan = mutationBatches(changes), sent = 0;
    return plan.batches.reduce(function (chain, batch) {
      return chain.then(function () {
        return client.rpc('apply_sync_changes', { p_workspace_id: workspaceId, p_changes: batch }).then(function (result) {
          if (result.error) throw result.error;
          var pending = loadPending();
          batch.forEach(function (change) {
            var key = entityKey(change);
            if (pending[key] && pending[key].modified_at === change.modified_at) delete pending[key];
          });
          sent += batch.length; savePending(pending);
        });
      });
    }, Promise.resolve()).then(function () {
      if (plan.rejected.length) throw new Error(plan.rejected.length + ' synchronized record' + (plan.rejected.length === 1 ? ' is' : 's are') + ' larger than the 8 MB safety limit and remain safely queued');
      return sent;
    });
  }
  function ensureCounterAndBlock() {
    if (!client || !session || !workspaceId) return Promise.resolve();
    var profileId = currentProfileId(), counter = window.state ? Math.max(0, Number(window.state.counter) || 0) : 0;
    return client.rpc('ensure_order_counter_at_least', { p_workspace_id: workspaceId, p_profile_id: profileId, p_minimum: counter })
      .then(function (result) { if (result.error) throw result.error; return reserveOrderBlock(profileId, false); });
  }
  function reserveOrderBlock(profileId, force) {
    if (!client || !session || !workspaceId || navigator.onLine === false) return Promise.resolve(null);
    var key = BLOCK_PREFIX + workspaceId + '.' + profileId, block = safeParse(localStorage.getItem(key), null);
    if (!force && block && Number(block.next) <= Number(block.end) && Number(block.end) - Number(block.next) >= 4) return Promise.resolve(block);
    return client.rpc('reserve_order_numbers', { p_workspace_id: workspaceId, p_profile_id: profileId, p_block_size: 25 }).then(function (result) {
      if (result.error) throw result.error;
      var row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!row) throw new Error('No order-number block returned');
      var reserved = { next: Number(row.block_start), end: Number(row.block_end), reservedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(reserved));
      return reserved;
    });
  }
  function nextOrderIdentifier(profileId) {
    if (!configured() || !workspaceId) return null;
    profileId = profileId || currentProfileId();
    var key = BLOCK_PREFIX + workspaceId + '.' + profileId, block = safeParse(localStorage.getItem(key), null);
    if (block && Number(block.next) <= Number(block.end)) {
      var number = Number(block.next); block.next = number + 1; localStorage.setItem(key, JSON.stringify(block));
      if (Number(block.end) - Number(block.next) < 5 && navigator.onLine !== false) reserveOrderBlock(profileId, false).catch(function () {});
      return String(number).padStart(4, '0');
    }
    var sequenceKey = 'lz.cloud.offline-seq.v1.' + profileId;
    var sequence = Number(localStorage.getItem(sequenceKey) || 0) + 1;
    localStorage.setItem(sequenceKey, String(sequence));
    return 'OFF-' + deviceId.replace(/^dev-/, '').slice(0, 6).toUpperCase() + '-' + Date.now().toString(36).toUpperCase() + '-' + sequence.toString(36).toUpperCase();
  }

  function syncNow(manual) {
    if (syncing) return Promise.resolve(false);
    if (!client || !session || !workspaceId) { if (manual) openPanel(); return Promise.resolve(false); }
    if (navigator.onLine === false) { setStatus('Offline — business changes are safely queued on this device.', 'pending'); return Promise.resolve(false); }
    syncing = true; setStatus('Synchronizing shared workspace…', 'busy'); updateUI();
    // Pull first so a device that was offline learns remote tombstones before a
    // stale local snapshot can recreate deleted records. Genuine offline edits
    // are timestamped in the pending queue by persist()/capture().
    return pullRemote()
      .then(flushPending)
      .then(pullRemote)
      .then(function () { lastResult = new Date().toISOString(); setStatus('Cloud synchronized at ' + new Date().toLocaleTimeString(), 'ok'); return ensureCounterAndBlock(); })
      .catch(function (error) { console.warn('LabelOnZeWay cloud sync', error); setStatus('Cloud sync paused: ' + (error.message || error), 'error'); return false; })
      .finally(function () { syncing = false; updateUI(); });
  }

  function loadSupabaseLibrary() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      script.crossOrigin = 'anonymous';
      script.onload = function () { window.supabase && window.supabase.createClient ? resolve(window.supabase) : reject(new Error('Supabase library did not load')); };
      script.onerror = function () { reject(new Error('Could not load the secure cloud library')); };
      document.head.appendChild(script);
    });
  }
  function readConfig() {
    return fetch(CONFIG_PATH, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('sync-config.json not found');
      return response.json();
    }).catch(function () { return { supabaseUrl: '', supabaseAnonKey: '' }; });
  }
  function hasPasswordRecoveryIntent() {
    var search = String(window.location && window.location.search || '');
    var hash = String(window.location && window.location.hash || '');
    return /(?:[?&])lz_action=password-recovery(?:&|$)/i.test(search) || /(?:^|[&#])type=recovery(?:&|$)/i.test(hash);
  }
  function recoveryErrorMessage() {
    try {
      var query = new URLSearchParams(String(window.location.search || '').replace(/^\?/, ''));
      var fragment = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      return fragment.get('error_description') || query.get('error_description') || fragment.get('error') || query.get('error') || '';
    } catch (e) { return ''; }
  }
  function clearRecoveryUrl() {
    try {
      var url = new URL(window.location.href);
      ['lz_action', 'code', 'error', 'error_code', 'error_description'].forEach(function (key) { url.searchParams.delete(key); });
      url.hash = '';
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
    } catch (e) {}
  }
  function passwordResetRedirectUrl() {
    try {
      if (window.location.protocol === 'https:' && /\.e2b\.app$/i.test(window.location.hostname)) {
        return window.location.origin + '/?lz_action=password-recovery';
      }
    } catch (e) {}
    return PASSWORD_RESET_REDIRECT;
  }
  function enterPasswordRecovery(nextSession) {
    session = nextSession || session;
    recoveryIntent = true;
    passwordFormMode = 'recovery';
    stopRealtime();
    setTimeout(function () {
      openPanel();
      setStatus('Recovery link verified. Choose a new password for this staff account.', 'ok');
      updateUI();
      var field = document.getElementById('cloud-new-password'); if (field) field.focus();
    }, 0);
  }
  function connectClient() {
    return loadSupabaseLibrary().then(function (library) {
      client = library.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange(function (event, nextSession) {
        session = nextSession;
        if (event === 'USER_UPDATED' && suppressPasswordUserUpdatedEvent) { setTimeout(updateUI, 0); return; }
        if (passwordUpdateInProgress) { setTimeout(updateUI, 0); return; }
        if (event === 'PASSWORD_RECOVERY' || (recoveryIntent && nextSession)) { enterPasswordRecovery(nextSession); return; }
        if (passwordFormMode && nextSession) { setTimeout(updateUI, 0); return; }
        setTimeout(function () { if (session) loadWorkspaces(); else { stopRealtime(); updateUI(); } }, 0);
      });
      return client.auth.getSession();
    }).then(function (result) {
      session = result.data && result.data.session;
      if (session && recoveryIntent) { enterPasswordRecovery(session); return; }
      if (session) return loadWorkspaces();
      if (recoveryIntent) {
        var error = recoveryErrorMessage();
        if (error) {
          recoveryIntent = false; clearRecoveryUrl();
          setStatus('Password recovery link failed or expired: ' + error + '. Request a new link.', 'error');
        } else setStatus('Validating the password recovery link…', 'busy');
        updateUI(); return;
      }
      setStatus('Cloud ready — sign in with your staff account.', ''); updateUI();
    });
  }
  function loadWorkspaces() {
    if (!client || !session) return Promise.resolve();
    return client.from('workspace_members').select('workspace_id,role,workspaces(name)').eq('user_id', session.user.id).then(function (result) {
      if (result.error) throw result.error;
      workspaces = (result.data || []).map(function (row) { return { id: row.workspace_id, name: row.workspaces && row.workspaces.name || row.workspace_id, role: row.role }; });
      if (!workspaces.length) { workspaceId = ''; setStatus('Signed in, but this staff account has no workspace membership.', 'error'); updateUI(); return; }
      if (!workspaces.some(function (item) { return item.id === workspaceId; })) workspaceId = workspaces[0].id;
      workspaceName = (workspaces.find(function (item) { return item.id === workspaceId; }) || workspaces[0]).name;
      localStorage.setItem(WORKSPACE_KEY, workspaceId);
      updateUI(); subscribeRealtime();
      var profileId = currentProfileId(), meta = loadMeta();
      var profileReconciled = !!(meta.items && meta.items[profileId + '|profile_settings|' + profileId]);
      if (!profileReconciled && !hasMeaningfulLocalData(profileId)) {
        return pullRemote().then(function () { return captureProfile(profileId, false); }).then(function () { return syncNow(false); });
      }
      return captureProfile(profileId, false).then(function () { return syncNow(false); });
    }).catch(function (error) { setStatus('Could not load workspace: ' + (error.message || error), 'error'); updateUI(); });
  }
  function subscribeRealtime() {
    stopRealtime();
    if (!client || !workspaceId) return;
    channel = client.channel('lz-' + workspaceId).on('postgres_changes', {
      event: '*', schema: 'public', table: 'sync_entities', filter: 'workspace_id=eq.' + workspaceId
    }, function () {
      clearTimeout(pullTimer); pullTimer = setTimeout(function () { syncNow(false); }, 700);
    }).subscribe();
  }
  function stopRealtime() { if (client && channel) client.removeChannel(channel); channel = null; }

  function injectUI() {
    if (document.getElementById('cloud-sync-pill')) return;
    var style = document.createElement('style');
    style.textContent = '#cloud-sync-pill{white-space:nowrap}#cloud-sync-pill.pending{border-color:#f4a261;color:#f4a261}#cloud-sync-pill.ok{border-color:#6fcf97;color:#6fcf97}' +
      '#cloud-panel{position:fixed;inset:0;z-index:10020;background:rgba(12,18,24,.72);display:none;align-items:flex-end;justify-content:center;padding:12px}#cloud-panel.open{display:flex}' +
      '#cloud-panel .cloud-box{width:min(520px,100%);max-height:90dvh;overflow:auto;background:#fff;border-radius:14px;padding:18px;color:#17202a;box-shadow:0 18px 60px #0007}' +
      '#cloud-panel h2{font:900 17px var(--head);margin:0 0 4px}#cloud-panel .cloud-note{font:500 11px/1.5 var(--body);color:#5c6975;margin:5px 0 12px}' +
      '#cloud-status{border:1px solid #ccd5dc;border-radius:7px;padding:9px;font:700 10px/1.45 var(--mono);margin:8px 0}#cloud-status.ok{background:#eefaf1;color:#16713c;border-color:#65bb84}#cloud-status.error{background:#fff3f1;color:#a72a1e;border-color:#df8177}#cloud-status.pending{background:#fff8ec;color:#885200;border-color:#e9b85e}' +
      '#cloud-panel label{display:block;font:800 9px var(--mono);letter-spacing:.6px;margin:9px 0 3px}#cloud-panel input,#cloud-panel select{width:100%;min-height:42px;border:1px solid #b8c2ca;border-radius:7px;padding:8px;font-size:14px}#cloud-panel .cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}' +
      '#cloud-panel .cloud-link{border:0;background:transparent;color:#1b5f91;text-decoration:underline;box-shadow:none;margin-top:8px;min-height:36px}#cloud-password-form h3{font:900 14px var(--head);margin:12px 0 3px}#cloud-password-form .password-help{font:500 11px/1.45 var(--body);color:#5c6975;margin:3px 0 9px}';
    document.head.appendChild(style);
    var pill = document.createElement('button'); pill.id = 'cloud-sync-pill'; pill.className = 'btn-ghost'; pill.type = 'button'; pill.textContent = '☁ CLOUD'; pill.addEventListener('click', openPanel);
    var chips = document.querySelector('#top .chips'); if (chips) chips.insertBefore(pill, chips.firstChild);
    var panel = document.createElement('div'); panel.id = 'cloud-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.innerHTML = '<div class="cloud-box"><h2>☁ SHARED COMPANY WORKSPACE</h2><p class="cloud-note">Each staff member signs in separately. Customers, labels, manifests, archives, payments, copies, and report-source records synchronize. Printer IP, gateway settings, and print queues stay only on this device.</p>' +
      '<div id="cloud-status">Checking cloud configuration…</div><div id="cloud-login"><label>STAFF EMAIL</label><input id="cloud-email" type="email" autocomplete="username"><label>PASSWORD</label><input id="cloud-password" type="password" autocomplete="current-password"><button class="btn blue wide" id="cloud-sign-in" style="margin-top:10px">SIGN IN SECURELY</button><button class="btn wide cloud-link" id="cloud-forgot-password">FORGOT PASSWORD?</button></div>' +
      '<div id="cloud-password-form" style="display:none"><h3 id="cloud-password-title">CHANGE PASSWORD</h3><p class="password-help" id="cloud-password-help">Use at least 8 characters. Passwords stay private and are never saved by LabelOnZeWay.</p><div id="cloud-current-password-wrap"><label>CURRENT PASSWORD</label><input id="cloud-current-password" type="password" autocomplete="current-password"></div><label>NEW PASSWORD</label><input id="cloud-new-password" type="password" minlength="8" autocomplete="new-password"><label>CONFIRM NEW PASSWORD</label><input id="cloud-confirm-password" type="password" minlength="8" autocomplete="new-password"><div class="cloud-actions"><button class="btn blue" id="cloud-save-password">SAVE PASSWORD</button><button class="btn" id="cloud-cancel-password">CANCEL</button></div></div>' +
      '<div id="cloud-session" style="display:none"><label>WORKSPACE</label><select id="cloud-workspace"></select><div class="cloud-actions"><button class="btn blue" id="cloud-sync-now">↻ SYNC NOW</button><button class="btn" id="cloud-sign-out">SIGN OUT</button></div><button class="btn wide" id="cloud-change-password" style="margin-top:8px">🔐 CHANGE PASSWORD</button></div>' +
      '<button class="btn wide" id="cloud-close" style="margin-top:10px">CLOSE</button><p class="cloud-note">Only the Supabase project URL and public anon/publishable key are stored in the app. Never use a service-role secret here.</p></div>';
    document.body.appendChild(panel);
    document.getElementById('cloud-close').addEventListener('click', closePanel);
    panel.addEventListener('click', function (event) { if (event.target === panel) closePanel(); });
    document.getElementById('cloud-sign-in').addEventListener('click', signIn);
    document.getElementById('cloud-forgot-password').addEventListener('click', requestPasswordReset);
    document.getElementById('cloud-change-password').addEventListener('click', function () { showPasswordForm('change'); });
    document.getElementById('cloud-save-password').addEventListener('click', saveNewPassword);
    document.getElementById('cloud-cancel-password').addEventListener('click', cancelPasswordForm);
    document.getElementById('cloud-sign-out').addEventListener('click', signOut);
    document.getElementById('cloud-sync-now').addEventListener('click', function () { syncNow(true); });
    document.getElementById('cloud-password').addEventListener('keydown', function (event) { if (event.key === 'Enter') signIn(); });
    document.getElementById('cloud-confirm-password').addEventListener('keydown', function (event) { if (event.key === 'Enter') saveNewPassword(); });
    document.getElementById('cloud-workspace').addEventListener('change', function (event) {
      workspaceId = event.target.value; workspaceName = (workspaces.find(function (item) { return item.id === workspaceId; }) || {}).name || '';
      localStorage.setItem(WORKSPACE_KEY, workspaceId); subscribeRealtime();
      var profileId = currentProfileId(), meta = loadMeta();
      var profileReconciled = !!(meta.items && meta.items[profileId + '|profile_settings|' + profileId]);
      var ready = (!profileReconciled && !hasMeaningfulLocalData(profileId))
        ? pullRemote().then(function () { return captureProfile(profileId, false); })
        : captureProfile(profileId, false);
      ready.then(function () { syncNow(false); }); updateUI();
    });
  }
  function setStatus(text, type) {
    lastResult = text || lastResult;
    var status = document.getElementById('cloud-status');
    if (status) { status.textContent = text; status.className = type || ''; }
    updateUI();
  }
  function updateUI() {
    var pill = document.getElementById('cloud-sync-pill'); if (!pill) return;
    var pending = workspaceId ? pendingForWorkspace().length : 0, editingPassword = !!passwordFormMode;
    pill.className = 'btn-ghost' + (!editingPassword && pending ? ' pending' : (!editingPassword && session && workspaceId ? ' ok' : ''));
    pill.textContent = editingPassword ? '☁ PASSWORD' : (session && workspaceId ? ('☁ ' + (pending ? pending + ' PENDING' : 'SYNCED')) : '☁ SIGN IN');
    var login = document.getElementById('cloud-login'), signed = document.getElementById('cloud-session'), passwordForm = document.getElementById('cloud-password-form');
    if (login) login.style.display = editingPassword || session ? 'none' : '';
    if (signed) signed.style.display = !editingPassword && session ? '' : 'none';
    if (passwordForm) passwordForm.style.display = editingPassword ? '' : 'none';
    var currentWrap = document.getElementById('cloud-current-password-wrap');
    if (currentWrap) currentWrap.style.display = passwordFormMode === 'change' ? '' : 'none';
    var title = document.getElementById('cloud-password-title'), help = document.getElementById('cloud-password-help');
    if (title) title.textContent = passwordFormMode === 'recovery' ? 'RESET STAFF PASSWORD' : 'CHANGE PASSWORD';
    if (help) help.textContent = passwordFormMode === 'recovery'
      ? 'Recovery verified. Choose at least 8 characters. You will sign in again after saving.'
      : 'Enter the current password, then choose at least 8 characters. You will sign in again after saving.';
    var select = document.getElementById('cloud-workspace');
    if (select) select.innerHTML = workspaces.map(function (item) { return '<option value="' + item.id + '"' + (item.id === workspaceId ? ' selected' : '') + '>' + escapeHtml(item.name) + ' · ' + escapeHtml(item.role) + '</option>'; }).join('');
    if (lastResult) { var status = document.getElementById('cloud-status'); if (status && status.textContent === 'Checking cloud configuration…') status.textContent = lastResult; }
    if (typeof window.LabelOnZeWayRefreshOperationsDeck === 'function') setTimeout(window.LabelOnZeWayRefreshOperationsDeck, 0);
  }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function openPanel() { var panel = document.getElementById('cloud-panel'); if (panel) panel.classList.add('open'); updateUI(); }
  function closePanel() { var panel = document.getElementById('cloud-panel'); if (panel) panel.classList.remove('open'); }
  function clearPasswordFields() {
    ['cloud-current-password', 'cloud-new-password', 'cloud-confirm-password', 'cloud-password'].forEach(function (id) {
      var field = document.getElementById(id); if (field) field.value = '';
    });
  }
  function showPasswordForm(mode) {
    if (!client || !session || (mode !== 'change' && mode !== 'recovery')) {
      setStatus('Sign in before changing a password, or use Forgot password.', 'error'); return;
    }
    passwordFormMode = mode;
    clearPasswordFields();
    openPanel(); updateUI();
    setStatus(mode === 'recovery' ? 'Recovery verified. Choose a new password.' : 'Change the password for the signed-in staff account.', '');
    setTimeout(function () {
      var field = document.getElementById(mode === 'change' ? 'cloud-current-password' : 'cloud-new-password'); if (field) field.focus();
    }, 30);
  }
  function cancelPasswordForm() {
    var wasRecovery = passwordFormMode === 'recovery';
    passwordFormMode = ''; clearPasswordFields();
    if (!wasRecovery) { setStatus('Password was not changed.', ''); updateUI(); return; }
    recoveryIntent = false; clearRecoveryUrl();
    if (client) client.auth.signOut({ scope: 'local' }).catch(function () {}).finally(function () {
      session = null; workspaces = []; stopRealtime(); setStatus('Password recovery cancelled. Request a new link when needed.', ''); updateUI();
    });
  }
  function requestPasswordReset() {
    if (!configured() || !client) { setStatus('Cloud is not configured yet.', 'error'); return; }
    var emailField = document.getElementById('cloud-email'), email = String(emailField && emailField.value || '').trim();
    if (!email) { setStatus('Enter the staff email address first.', 'error'); if (emailField) emailField.focus(); return; }
    setStatus('Requesting a secure password recovery email…', 'busy');
    client.auth.resetPasswordForEmail(email, { redirectTo: passwordResetRedirectUrl() }).then(function (result) {
      if (result.error) throw result.error;
      setStatus('If that staff email exists, a recovery message has been sent. Open its link and choose a new password. Check spam if needed.', 'ok');
    }).catch(function (error) { setStatus('Could not send password recovery: ' + (error.message || error), 'error'); });
  }
  function saveNewPassword() {
    if (!client || !session || !passwordFormMode) { setStatus('The secure password session is missing. Request a new recovery link.', 'error'); return; }
    var mode = passwordFormMode;
    var current = String((document.getElementById('cloud-current-password') || {}).value || '');
    var next = String((document.getElementById('cloud-new-password') || {}).value || '');
    var confirmNext = String((document.getElementById('cloud-confirm-password') || {}).value || '');
    if (mode === 'change' && !current) { setStatus('Enter the current password.', 'error'); return; }
    if (next.length < 8) { setStatus('The new password must contain at least 8 characters.', 'error'); return; }
    if (next !== confirmNext) { setStatus('The new passwords do not match.', 'error'); return; }
    if (mode === 'change' && current === next) { setStatus('Choose a new password that is different from the current password.', 'error'); return; }
    var accountEmail = String(session && session.user && session.user.email || '').trim();
    if (mode === 'change' && !accountEmail) { setStatus('The signed-in staff email is unavailable. Sign out, sign in again, then retry.', 'error'); return; }
    var passwordUpdateStarted = false;
    passwordUpdateInProgress = true; suppressPasswordUserUpdatedEvent = false;
    setStatus(mode === 'recovery' ? 'Saving the new password…' : 'Verifying the current password…', 'busy');
    var verified = mode === 'change'
      ? client.auth.signInWithPassword({ email: accountEmail, password: current }).then(function (result) {
          if (result.error) throw result.error;
          if (!result.data || !result.data.session) throw new Error('Current password verification did not create a secure session');
          session = result.data.session;
          setStatus('Current password verified. Saving the new password…', 'busy');
        })
      : Promise.resolve();
    verified.then(function () {
      passwordUpdateStarted = true; suppressPasswordUserUpdatedEvent = true;
      return client.auth.updateUser({ password: next });
    }).then(function (result) {
      if (result.error) throw result.error;
      passwordFormMode = ''; recoveryIntent = false; clearPasswordFields(); clearRecoveryUrl();
      return client.auth.signOut({ scope: 'global' });
    }).then(function (result) {
      if (result && result.error) throw result.error;
      passwordUpdateInProgress = false; session = null; workspaces = []; stopRealtime();
      setTimeout(function () { suppressPasswordUserUpdatedEvent = false; }, 1000);
      setStatus('Password changed successfully. All sessions were signed out; sign in again with the new password.', 'ok'); updateUI();
    }).catch(function (error) {
      passwordUpdateInProgress = false;
      if (passwordUpdateStarted) setTimeout(function () { suppressPasswordUserUpdatedEvent = false; }, 1000);
      else suppressPasswordUserUpdatedEvent = false;
      var message = String(error && error.message || error);
      var invalidCurrent = mode === 'change' && /invalid login|invalid credentials|email or password|incorrect password/i.test(message);
      setStatus(invalidCurrent ? 'Current password is incorrect. The password was not changed.' :
        ('Password was not changed: ' + message + (mode === 'change' ? '. Sign out, sign in again, then retry if recent authentication is required.' : '')), 'error');
    });
  }
  function signIn() {
    if (!configured() || !client) { setStatus('Cloud is not configured yet. Follow SUPABASE_SETUP.md, then add the project URL and public key.', 'pending'); return; }
    var email = (document.getElementById('cloud-email').value || '').trim(), password = document.getElementById('cloud-password').value || '';
    if (!email || !password) { setStatus('Enter the staff email and password.', 'error'); return; }
    setStatus('Signing in securely…', 'busy');
    client.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
      if (result.error) throw result.error; session = result.data.session; document.getElementById('cloud-password').value = ''; return loadWorkspaces();
    }).catch(function (error) { setStatus('Sign-in failed: ' + (error.message || error), 'error'); });
  }
  function signOut() {
    if (!client) return;
    passwordFormMode = ''; recoveryIntent = false; clearPasswordFields(); clearRecoveryUrl();
    client.auth.signOut().then(function () { session = null; workspaces = []; stopRealtime(); setStatus('Signed out. Local records remain available on this device.', ''); updateUI(); });
  }

  function resetCurrentProfile() {
    if (!workspaceId) return Promise.resolve();
    var profileId = currentProfileId(), meta = loadMeta(), pending = loadPending(), now = new Date().toISOString();
    Object.keys(meta.items).forEach(function (key) {
      var parts = key.split('|'), type = parts[1];
      if (parts[0] !== profileId || SYNC_TYPES.indexOf(type) < 0 || meta.items[key].deleted) return;
      var deletedAt = timestampAfter(meta.items[key].modified_at || now);
      var mutation = { workspace_id: workspaceId, profile_id: profileId, entity_type: type, entity_id: parts.slice(2).join('|'), payload: {}, modified_at: deletedAt, deleted_at: deletedAt, device_id: deviceId };
      pending[entityKey(mutation)] = mutation;
      meta.items[key] = { fingerprint: fingerprint({}, true), modified_at: mutation.modified_at, deleted: true, device_id: deviceId };
    });
    saveMeta(meta); savePending(pending);
    if (navigator.onLine !== false && client && session) return flushPending();
    return Promise.resolve(0);
  }

  function init() {
    if (initialized) return; initialized = true; injectUI();
    readConfig().then(function (loaded) {
      config = loaded || {};
      if (!configured()) { setStatus('Cloud setup pending. Local/offline mode is active; add Supabase details after running SUPABASE_SETUP.sql.', 'pending'); return; }
      setStatus('Loading secure cloud connection…', 'busy'); return connectClient();
    }).catch(function (error) { setStatus('Cloud unavailable: ' + (error.message || error), 'error'); });
    window.addEventListener('online', function () { setStatus('Back online — reconciling queued changes…', 'busy'); syncNow(false); });
    window.addEventListener('offline', function () { setStatus('Offline — changes will upload when connectivity returns.', 'pending'); });
    syncTimer = setInterval(function () { if (session && workspaceId && navigator.onLine !== false) syncNow(false); }, 20000);
  }

  api.init = init;
  api.capture = scheduleCapture;
  api.captureNow = captureProfile;
  api.markEntityDeleted = markEntityDeleted;
  api.syncNow = syncNow;
  api.open = openPanel;
  api.requestPasswordReset = requestPasswordReset;
  api.showChangePassword = function () { showPasswordForm('change'); };
  api.nextOrderIdentifier = nextOrderIdentifier;
  api.resetCurrentProfile = resetCurrentProfile;
  api.publishTrackingRecords = publishTrackingRecords;
  api.publicTrackingBase = publicTrackingBase;
  api.isConfigured = configured;
  api.getStatus = function () { return { configured: configured(), signedIn: !!session, workspaceId: workspaceId, workspaceName: workspaceName, deviceId: deviceId, pending: pendingForWorkspace().length, syncing: syncing }; };
  window.LabelOnZeWayCloud = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
}());
