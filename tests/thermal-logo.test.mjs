import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createParcel,parcelLabelShop,resolveLabelShop}from'../app/core.js';
import{THERMAL_LOGO_MAX_HEIGHT,THERMAL_LOGO_MAX_WIDTH,thermalRasterEscPos,createLabelLayout,rasterBitmapEscPos,asciiMoney,wrapLabelText}from'../app/operations.js';
import{buildBeta3}from'../scripts/build-beta3.mjs';

const pixels=Uint8Array.from([
  1,0,1,0,0,0,0,0,1,
  0,1,0,0,0,0,0,0,1,
]);
const raster=thermalRasterEscPos(9,2,pixels);
assert.deepEqual([...raster],[0x1d,0x76,0x30,0,2,0,2,0,0xa0,0x80,0x40,0x80],'ESC/POS raster bytes must be exact and MSB-first');
assert.throws(()=>thermalRasterEscPos(321,1,new Uint8Array(321)),/320 × 96/);
assert.throws(()=>thermalRasterEscPos(1,97,new Uint8Array(97)),/320 × 96/);
assert.equal(THERMAL_LOGO_MAX_WIDTH,320);assert.equal(THERMAL_LOGO_MAX_HEIGHT,96);
const layout=createLabelLayout({oid:'20260824-0001',addedAt:'2026-08-24T10:00:00Z',deliverAt:'2026-08-25',qty:1,price:25000,cod:25000,ship:1500,pay:'COD',rec:{name:'A very long customer name that must wrap safely',phone:'0340000000',address:'A very long historical address that must wrap within the printable content width'}},{name:'LUZDM',currency:'Ar',codLabel:'Collect',thanks:'Misaotra'}, {src:'logo',width:164,height:96});
assert.equal(layout.width,576);assert.equal(layout.margin,10);assert(layout.contentWidth>=552&&layout.contentWidth<=560);assert.equal(layout.sections[0].logoWidth,340);assert.equal(layout.sections[0].logoHeight,199);assert(layout.height>320);assert(layout.sections[3].name.length>1&&layout.sections[3].address.length>1,'long recipient fields must wrap');assert.equal(asciiMoney(25000),'Ar 25 000');assert(!asciiMoney(25000).includes('Γ'));assert.deepEqual([...rasterBitmapEscPos(576,1,new Uint8Array(576)).slice(0,8)],[0x1d,0x76,0x30,0,72,0,1,0]);

const source=await readFile('app/assets/luz-circular-thermal.png');
assert.equal(source.subarray(0,8).toString('hex'),'89504e470d0a1a0a','processed logo must be a PNG');
const width=source.readUInt32BE(16),height=source.readUInt32BE(20);
assert(width<=320&&height<=96,`logo ${width}×${height} exceeds thermal bounds`);
assert(width>0&&height>0,'logo must contain cropped artwork');

const shop=resolveLabelShop({name:'LUZDM',logoThermal:'data:image/png;base64,thermal',logoIncludesBusinessName:true},{name:'LUZDM'});
const parcel=createParcel({qty:1,price:1000,ship:0},{id:'customer',name:'Customer',phone:'0340000000',address:'Lot I'},0,new Date('2026-08-24'),[],shop);
assert.equal(parcel.labelShop.logoThermal,shop.logoThermal,'parcel snapshot must preserve the processed logo');
assert.equal(parcel.labelShop.logoIncludesBusinessName,true,'parcel snapshot must preserve the logo-name setting');
assert.equal(parcelLabelShop(parcel,{},{}).logoThermal,shop.logoThermal,'later profile changes must not replace the issued logo');
assert(JSON.stringify({shop}).includes('logoThermal'),'JSON backup payloads retain the processed logo');

const app=await readFile('app/app.js','utf8');
for(const needle of['LUZ_THERMAL_LOGO','thermal-logo-preview','Logo includes business name','paintLabelCanvas','rasterBitmapEscPos','logoIncludesBusinessName&&shop.logoThermal','await sendGatewayPrint(await labelEscPos(p,copies),1)'])assert(app.includes(needle),`missing thermal-logo integration: ${needle}`);
assert(app.includes('const raster=rasterBitmapEscPos')&&app.includes('one=concatBytes([new Uint8Array([0x1b,0x40]),raster'),'one physical label must contain one full-label raster segment');
assert(app.includes('Array.from({length:Math.max(1,Number(copies)||1)},()=>one)'),'each requested copy must contain exactly one complete raster label');assert(app.includes('new Uint8Array([0x1b,0x40]),raster'),'each copy must start one raster payload');assert(app.includes('0x1d,0x56,0x00'),'each copy must end with one cut');
assert(app.includes('new Uint8Array([0x0a,0x1d,0x56,0x00])'),'each copy must contain one feed and one final cut');

await buildBeta3();
const generated=await readFile('labelonzeway-beta3/app/assets/luz-circular-thermal.png');
assert.deepEqual(generated,source,'generated deployment asset must equal the deterministic source asset');
console.log('thermal logo raster and snapshot audit passed');
