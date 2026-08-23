import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{buildBeta3,cacheVersion,cachedAssets,serviceWorkerSource}from'../scripts/build-beta3.mjs';

const sample=cachedAssets.map(path=>[path,`content:${path}`]);
for(const changedPath of cachedAssets)assert.notEqual(cacheVersion(sample),cacheVersion(sample.map(([path,content])=>[path,path===changedPath?`${content}:changed`:content])),`${changedPath} must change the cache version`);
const worker=serviceWorkerSource('test-cache');
for(const text of["request.mode==='navigate'","url.pathname.startsWith(BASE+'app/')","/\\.(js|css)$/","fetch(event.request).then","catch(()=>offline(event.request))",'self.skipWaiting()','self.clients.claim()','key.startsWith(CACHE_PREFIX)','caches.delete(key)','url.pathname.startsWith(BASE)','BASE+\'index.html\''])assert(worker.includes(text),`service worker missing ${text}`);
assert(worker.includes("keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE)"),'worker must delete only prior Beta cache versions');
assert(!worker.includes('/FBP/labelonzeway/'),'worker must not intercept production LabelOnZeWay');
const version=await buildBeta3(),generated=await readFile('labelonzeway-beta3/service-worker.js','utf8');
assert(generated.includes(`labelonzeway-beta3-${version}`),'generated worker cache version mismatch');
console.log('Beta 3 service-worker build audit passed');
