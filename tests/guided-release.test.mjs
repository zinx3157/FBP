import assert from 'node:assert/strict';
import {createGuidedSaveCoordinator} from '../app/guided-save.js';
import {createLabelLayout} from '../app/operations.js';

const customer={id:'c1',name:'Fara R.',phone:'0340000000',address:'Analakely',area:'Antananarivo'};
const draft={qty:2,copies:3,price:10000,ship:3000,pay:'COD'};
let creates=0,prints=0,rows=[];
const createParcel=(d,c)=>{creates++;return{id:'p1',oid:'PICK-TEST',rec:c,qty:d.qty,price:d.price,ship:d.ship,cod:d.qty*d.price,pay:d.pay,copies:d.copies}};
const save=createGuidedSaveCoordinator({createParcel,store:rows,print:()=>{prints++},copies:3});
const [a,b]=await Promise.all([save({draft,customer,doPrint:true}),save({draft,customer,doPrint:true})]);
assert.equal(creates,1);assert.equal(rows.length,1);assert.equal(a.parcel.oid,b.parcel.oid);assert.equal(prints,3);
let failed=true;const retry=createGuidedSaveCoordinator({createParcel:(...x)=>createParcel(...x),store:[],print:()=>{throw Error('offline')},copies:1});const first=await retry({draft:{...draft,copies:1},customer,doPrint:true});assert.equal(first.ok,false);assert.match(first.error.message,/Parcel saved, printing failed/);assert.equal(first.parcel.oid,'PICK-TEST');
const layout=createLabelLayout({oid:'PICK-TEST',rec:customer,qty:2,price:10000,cod:20000,ship:3000,pay:'COD',addedAt:'2026-08-24T10:00:00Z'},{name:'LUZDM',phone:'+261 340000000',tagline:'FACEBOOK',thanks:'Misaotra',currency:'Ar',codLabel:'COLLECT'},{src:'data:image/png;base64,AA==',width:10,height:4});
const text=JSON.stringify(layout);for(const value of ['LUZDM','0340000000','Analakely','20 000','3 000','COD','Misaotra'])assert.match(text,new RegExp(value));
console.log('Guided exactly-once and confirm preview tests passed');
