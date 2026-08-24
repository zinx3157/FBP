import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const app=await readFile('app/app.js','utf8'),manager=app.match(/function profileManager\(\)[\s\S]*?(?=const isMacGatewayDevice)/)?.[0]||'';
assert(manager,'Profile Manager must be implemented');
assert(!manager.includes('prompt('),'Profile Manager must not use prompt()');
for(const text of['role="dialog"','aria-modal="true"','Profiles','Active','Select','Edit','Export backup','Delete','Add profile','Profile/workspace name','Shop/business name','Telephone','Tagline/social line','Thank-you/footer message','Currency','COD label','Print mode','Printer IP','Printer port','Printer dots','Feed','Cut after print','Label length','Download JSON backup','Restore JSON backup','Export address-book CSV','Import address-book CSV','Save profile','Cancel'])assert(manager.includes(text),`missing visible Profile Manager control: ${text}`);
for(const text of['profiles[index]={...profiles[index],name:data.profileName}','state.shop={...state.shop,name:data.name,phone:data.phone,tagline:data.tagline,thanks:data.thanks','localStorage.setItem(\'lz.beta3.profiles\',JSON.stringify(profiles))','save();close();renderCurrent();toast(\'Profile saved successfully.\')'])assert(manager.includes(text),`Profile save must persist and refresh: ${text}`);
assert(app.includes('Source profile ID: ${item.id}')&&app.includes('Source profile name: ${item.name}')&&app.includes('Source shop name: ${item.shopName}'),'restore confirmation must display source identity');
assert(app.includes("throw Error('Backup profile identity could not be read.')"),'unreadable restore identity must abort');
assert(app.includes('upsertRestoredProfile(entry.profile)'),'same-ID restore must update profile metadata');
console.log('Profile Manager browser-style DOM contract passed');
