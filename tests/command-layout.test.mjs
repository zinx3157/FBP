import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const app=await readFile('app/app.js','utf8'),css=await readFile('app/styles.css','utf8');
for(const needle of['data-rail','data-rail-toggle','railExpanded','aria-label="Command"','aria-label="Guided"','aria-label="Rider"','aria-label="Tracking"','data-new-customer','data-contact-editor','Save and use on label','data-contact-save','data-contact-cancel','data-preview-open','data-preview-expand','data-import-details','Download rejected rows'])assert(app.includes(needle),`missing Command operation control: ${needle}`);
assert(css.includes('grid-template-columns:minmax(300px,.9fr) minmax(420px,1.5fr) minmax(300px,340px)'), 'desktop Command grid does not use the operational column proportions');
assert(css.includes('grid-template-columns:72px minmax(0,1fr)'), 'desktop navigation rail must be 72px');
assert(css.includes('width:190px'), 'expanded navigation must not exceed 190px');
for(const breakpoint of['max-width:1279px','max-width:899px','max-width:599px'])assert(css.includes(breakpoint),`missing responsive breakpoint ${breakpoint}`);
for(const phrase of['grid-template-columns:26px minmax(0,1fr) auto','overflow-wrap:anywhere','position:sticky','min-height:88px','overflow-x:hidden','env(safe-area-inset-bottom)'])assert(css.includes(phrase),`missing no-overflow/preview behavior ${phrase}`);
assert.match(app,/function openContactEditor[\s\S]*?customerData\(modal/,'contact editor must own manual validation');
assert(!/data-c-form/.test(app),'permanently expanded contact editor must be removed from Command');
assert(app.includes('importTrustedCustomers')&&app.includes('trusted historical address'),'trusted import path must remain distinct from OCR validation');
assert(!/(^|[^{])id="profile-manager-title"[\s\S]*id="profile-manager-title"/.test(app),'duplicate fixed IDs must not be introduced');
assert(css.includes('width:72mm')&&css.includes('max-width:100%'),'preview must retain true 72 mm proportions');
console.log('Command operational layout audit passed');
