import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
const app=await readFile(new URL('../app/app.js',import.meta.url),'utf8');
for(const key of['data-save','data-save-print','data-ocr','data-batch-add-manifest','data-csv','data-print-one','data-pdf','data-png','data-share','data-duplicate','data-delete-parcel','data-book-export','data-book-import','data-book-backup','data-book-restore','data-find'])assert(app.includes(key),`missing visible control ${key}`);
for(const handler of['saveParcel','ocrPhoto','addBatchParcel','manifestCsv','labelPdfBlob','labelPngBlob','shareFile','addressBookAction','tracking'])assert(app.includes(handler),`missing handler ${handler}`);
assert(!/coming soon|demo(?:nstration)?/i.test(app),'demo control text is forbidden');assert(!/(?:^|[\s<])id="/im.test(app),'dynamic app markup must not introduce fixed duplicate IDs');console.log('control audit passed');
