import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{importTrustedCustomers}from'../app/core.js';
import{importErrorsCsv}from'../app/operations.js';

const rows=Array.from({length:25},(_,index)=>index===5?{rowNumber:index+2,name:'Rejected customer',phone:'0366969542',address:'Historical address'}:index===23?{rowNumber:index+2,name:'Sarah Rakotoniaina',phone:'',address:'arrêt marché'}:index===24?{rowNumber:index+2,name:'Sarah Rakotoniaina',phone:'',address:'arrét marché'}:{rowNumber:index+2,sourceCustomerId:`C-${index+1}`,name:`Customer ${index+1}`,phone:`034${String(1000000+index).slice(-7)}`,address:'Historical free-form address'});
const first=importTrustedCustomers([],rows);
assert.equal(first.imported,23,'23 accepted records include one probable duplicate');
assert.equal(first.probableDuplicates,1);
assert.equal(first.skipped,1,'the probable duplicate must be accounted for without another customer');
assert.equal(first.failed,1);
assert.equal(first.errors.length,1);
assert.match(first.errors[0].reason,/036/);
const report=importErrorsCsv(first.errors),blob=new Blob([report],{type:'text/csv;charset=utf-8'});
assert(blob.size>0,'the deferred rejected-row report must be non-empty');
assert.equal(blob.type,'text/csv;charset=utf-8');
assert.match(await blob.text(),/"Row","Reason"/);
const second=importTrustedCustomers(first.customers,rows);
assert.equal(second.imported,0,'reimport must not duplicate accepted records');
assert.equal(second.failed,1);
assert(second.probableDuplicates>=1,'reimport may continue to flag the historical spelling variant without duplicating it');
for(const path of['app/app.js','app/operations.js','labelonzeway-beta3/app/app.js','labelonzeway-beta3/app/operations.js']){const source=await readFile(path,'utf8');assert(!/new Blob\(\s*(?!\[)/.test(source),`${path} must supply Blob content as a sequence`)}
const app=await readFile('app/app.js','utf8');
assert(app.includes('data-download-import-errors'),'failures must expose a deferred Download rejected rows button');
assert(app.includes('saveImportResult({type:\'CSV import\''),'the import result must persist after records are saved');
assert(!app.includes('importErrors(result);'),'imports must not automatically download error CSVs');
console.log('import error download audit passed');
