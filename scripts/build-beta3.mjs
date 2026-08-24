import{createHash}from'node:crypto';
import{cp,mkdir,readFile,rm,writeFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';

const out='labelonzeway-beta3';
export const cachedAssets=['index.html','app/app.js','app/core.js','app/operations.js','app/tracking-adapter.js','app/styles.css','app/print.css','app/assets/luz-circular-thermal.png','command/index.html','guided/index.html','rider/index.html','tracking/index.html','design-a/index.html','design-b/index.html','design-a.js','design-b.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-192.png','icons/icon-maskable-512.png'];
export const cacheVersion=entries=>{const hash=createHash('sha256');for(const[path,content]of[...entries].sort(([a],[b])=>a.localeCompare(b)))hash.update(path).update('\0').update(content).update('\0');return hash.digest('hex').slice(0,16)};
export const serviceWorkerSource=version=>`const CACHE_PREFIX='labelonzeway-beta3-';const CACHE='labelonzeway-beta3-${version}';const BASE=new URL('./',self.location).pathname;const SHELL=${JSON.stringify(cachedAssets)}.map(x=>BASE+x);const scoped=url=>url.origin===location.origin&&url.pathname.startsWith(BASE);const networkFirst=(request,url)=>request.mode==='navigate'||(url.pathname.startsWith(BASE+'app/')&&/\\.(js|css)$/.test(url.pathname));const offline=request=>caches.match(request).then(hit=>hit||caches.match(BASE+'index.html'));self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||!scoped(url))return;if(networkFirst(event.request,url)){event.respondWith(fetch(event.request).then(response=>caches.open(CACHE).then(cache=>{cache.put(event.request,response.clone());return response})).catch(()=>offline(event.request)));return}event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>caches.open(CACHE).then(cache=>{cache.put(event.request,response.clone());return response})).catch(()=>offline(event.request))))});`;

export async function buildBeta3(output=out){
 await rm(output,{recursive:true,force:true});await mkdir(`${output}/app/assets`,{recursive:true});await mkdir(`${output}/icons`,{recursive:true});await mkdir(`${output}/design-a`,{recursive:true});await mkdir(`${output}/design-b`,{recursive:true});
 for(const f of['app.js','core.js','operations.js','tracking-adapter.js','styles.css','print.css'])await cp(`app/${f}`,`${output}/app/${f}`);
 await cp('app/assets/luz-circular-thermal.png',`${output}/app/assets/luz-circular-thermal.png`);
 for(const f of['icon-192.png','icon-512.png','icon-maskable-192.png','icon-maskable-512.png'])await cp(`icons/${f}`,`${output}/icons/${f}`);
 await cp('prototypes/design-a/index.html',`${output}/design-a/index.html`);await cp('prototypes/design-b/index.html',`${output}/design-b/index.html`);
 await cp('prototypes/design-a.js',`${output}/design-a.js`);await cp('prototypes/design-b.js',`${output}/design-b.js`);
 for(const route of['design-a','design-b']){const file=`${output}/${route}/index.html`,html=await readFile(file,'utf8');await writeFile(file,html.replace('</body>',`<script src="../${route}.js"></script></body>`))}
 const head=(prefix='')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#102a43"><link rel="manifest" href="${prefix}manifest.webmanifest"><link rel="stylesheet" href="${prefix}app/styles.css"><link rel="stylesheet" href="${prefix}app/print.css" media="print"><title>LabelOnZeWay Beta 3 UAT</title></head><body><script src="${prefix}app/tracking-adapter.js"></script><script type="module" src="${prefix}app/app.js"></script></body></html>`;
 await writeFile(`${output}/index.html`,head());for(const route of['command','guided','rider','tracking']){await mkdir(`${output}/${route}`,{recursive:true});await writeFile(`${output}/${route}/index.html`,head('../'))}
 await writeFile(`${output}/manifest.webmanifest`,JSON.stringify({id:'./',name:'LabelOnZeWay Beta 3 UAT',short_name:'LabelOnZeWay',start_url:'./',scope:'./',display:'standalone',theme_color:'#102a43',background_color:'#f5f1e9',icons:[192,512].flatMap(size=>[{src:`icons/icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png'},{src:`icons/icon-maskable-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'maskable'}])},null,2));
 const version=cacheVersion(await Promise.all(cachedAssets.map(async path=>[path,await readFile(`${output}/${path}`)])));
 await writeFile(`${output}/service-worker.js`,serviceWorkerSource(version));
 return version;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await buildBeta3();
