import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createParcel,parcelLabelShop,prepareBackupRestore,resolveLabelShop,storage}from'../app/core.js';
import{labelPdfBlob}from'../app/operations.js';

const profile={id:'production-profile-luzdm',name:'LUZDM'},shop={name:'LUZDM',phone:'+261 347698740 WHATSAPP',tagline:'FACEBOOK - INSTAGRAM',thanks:'Misaotra betsaka ! Merci pour votre commande !',currency:'Ar',codLabel:'Amount due',printerIp:'192.168.100.20',printerPort:9100,printerDots:576,printerFeed:3,printerCut:true};
const backup={app:'LABELONZEWAY',version:4,profile,data:{shop,addr:[],manifest:[],archive:[],labelVault:[],counter:0,gateway:{}}};
const restored=prepareBackupRestore(JSON.stringify(backup)).profiles[0];
assert.deepEqual(restored.shop,shop,'the production shop schema must survive restore unchanged');
const resolved=resolveLabelShop(restored.shop,restored.profile);
assert.equal(resolved.name,'LUZDM');assert.equal(resolved.phone,shop.phone);assert.equal(resolved.tagline,shop.tagline);assert.equal(resolved.thanks,shop.thanks);assert.equal(resolved.currency,'Ar');assert.equal(resolved.codLabel,'Amount due');assert(!JSON.stringify(restored).includes('Restored profile'));
const parcel=createParcel({qty:2,price:4000,ship:1000,pay:'COD'},{id:'customer',name:'Customer',phone:'0340000000',address:'Historic address'},0,new Date('2026-08-24'),[],resolved);
assert.equal(parcel.labelShop.name,'LUZDM');assert.equal(parcelLabelShop(parcel,{name:'Changed company'},{name:'Changed profile'}).name,'LUZDM','issued parcels retain their business identity');
assert.equal(parcelLabelShop({},{},{name:'Workspace fallback'}).name,'Workspace fallback','legacy parcels use the active profile only when shop name is empty');
const pdf=await labelPdfBlob(parcel,{name:'Changed company'}).text();for(const value of['LUZDM',shop.phone,shop.tagline,shop.thanks,'Amount due','Ar'])assert(pdf.includes(value),`PDF must include ${value}`);assert(!pdf.includes('undefined'));
const previousLocalStorage=globalThis.localStorage,records=new Map();globalThis.localStorage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,String(value))};try{const target=storage(restored.profile.id);target.state.shop={...target.state.shop,...restored.shop};target.save();const rebound=storage(restored.profile.id).state;assert.deepEqual(rebound.shop,shop,'clean browser-style profile storage must retain every restored shop field');assert.equal(resolveLabelShop(rebound.shop,restored.profile).name,'LUZDM');assert(!JSON.stringify({profile:restored.profile,shop:rebound.shop}).includes('Restored profile'))}finally{globalThis.localStorage=previousLocalStorage}
const app=await readFile('app/app.js','utf8'),operations=await readFile('app/operations.js','utf8');
for(const value of['currentLabelShop()',"shop.codLabel","shop.thanks",'labelShopForParcel(parcel)','ensurePrintable','Complete your company profile before printing.','activateProfile','renderCurrent()'])assert(app.includes(value),`app must resolve ${value} for live preview or printing`);
assert(app.includes('activateProfile(button.dataset.profileSelect)'),'profile switching must rebind through activateProfile');assert(app.includes('upsertRestoredProfile(entry.profile)'),'same-ID restores must update stale profile metadata');
assert.match(app,/function activateProfile\(id\)[\s\S]*?state=book\.state;[\s\S]*?renderCurrent\(\)/,'switching profiles must immediately rerender the preview');
for(const value of['parcelLabelShop(parcel,shop)','label.phone','label.tagline','label.thanks','label.codLabel'])assert(operations.includes(value),`PDF/PNG must resolve ${value}`);
assert(!/shop\.address|companyAddress/.test(operations),'the production backup has no company address field');
console.log('label profile renderer audit passed');
