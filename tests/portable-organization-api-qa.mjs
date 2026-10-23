// File-mode organization API/migration tests, isolated from user data and browser profiles.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const url=pathToFileURL(path.join(root,'CRY7574 Hearing Aid Box Measurement Manage Software.html')).href;
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-organization-api-'));
const checks=[],errors=[],network=[];
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
let context,page;
async function launch(){
  context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,acceptDownloads:true});
  await context.setOffline(true);context.on('request',r=>{if(/^https?:/i.test(r.url()))network.push(r.url());});
  page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await PortableAPI.ready;});
}
async function api(endpoint,method='GET',body){return page.evaluate(({endpoint,method,body})=>PortableAPI.request(endpoint,method==='GET'?undefined:{method,body}),{endpoint,method,body});}
async function store(value){return page.evaluate(async value=>{
  const request=indexedDB.open(PortableAPI.storageName);
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspace',value===null?'readonly':'readwrite'),s=tx.objectStore('workspace');let result;if(value===null){const r=s.get('primary');r.onsuccess=()=>{result=r.result;};}else s.put(value,'primary');tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error);});}finally{db.close();}
},value===undefined?null:value);}
async function rejectAtomic(name,endpoint,method,body){
  const before=digest(await store());
  const result=await page.evaluate(async ({endpoint,method,body})=>{try{await PortableAPI.request(endpoint,{method,body});return {ok:true};}catch(e){return {ok:false,error:e.message};}},{endpoint,method,body});
  check(name,!result.ok&&digest(await store())===before);
}
const csv=Buffer.from('Frequency,Value\n100,0\n200,\n300,1.23456789012345\n').toString('base64');
const input=(name,options={})=>({name,format:'csv',contentBase64:csv,...options});
const core=data=>{const v=structuredClone(data);delete v.libraries;for(const c of v.charts){delete c.tags;delete c.libraryId;}return v;};
try{
  await launch();
  check('Organization capability flags and default libraries are exposed',(await api('/api/state')).capabilities.libraries&&(await api('/api/state')).libraries.length===2);
  const legacyImport=await api('/api/import','POST',input('Legacy fixture.csv'));
  await api('/api/reports','POST',{chartId:legacyImport.charts[0].id,title:'Legacy report snapshot'});
  const legacy=await store();delete legacy.libraries;
  for(const c of legacy.charts){delete c.libraryId;delete c.tags;}
  for(const s of legacy.sources){delete s.operationId;delete s.operationKey;}
  for(const r of legacy.reports){delete r.chart.libraryId;delete r.chart.tags;delete r.source.operationId;delete r.source.operationKey;}
  const legacyReports=structuredClone(legacy.reports);
  await store(legacy);await context.close();context=null;await launch();
  let migrated=await store();
  check('Existing v1 IndexedDB migrates both source classes to default libraries',migrated.charts.every(c=>c.libraryId===(c.kind==='reference'?'library-reference':'library-imports')));
  check('Existing v1 migration adds only empty tags',migrated.charts.every(c=>Array.isArray(c.tags)&&c.tags.length===0));
  check('Existing v1 migration preserves original data and reports',digest(core(migrated))===digest(core(legacy))&&digest(migrated.reports)===digest(legacyReports));
  page.once('dialog',d=>d.accept());
  const oldBackup={format:'CRY7574-portable-backup',version:1,data:legacy,exportedAt:'2026-10-22T00:00:00Z'};
  await Promise.all([page.waitForEvent('load'),page.locator('#restoreBackupFile').setInputFiles({name:'old-v1-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldBackup))})]);
  await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await PortableAPI.ready;});
  migrated=await store();
  check('Old v1 backup restores with default libraries and unchanged snapshots',migrated.libraries.length===2&&migrated.charts.every(c=>Array.isArray(c.tags))&&digest(core(migrated))===digest(core(legacy))&&digest(migrated.reports)===digest(legacyReports));
  const libraryA=await api('/api/libraries','POST',{name:'Batch QA <Bench>',description:'User-defined fixture collection'});
  const libraryB=await api('/api/libraries','POST',{name:'Portable experiments',description:''});
  check('User-created libraries persist with distinct safe IDs',libraryA.id!==libraryB.id&&/^[A-Za-z0-9_-]+$/.test(libraryA.id)&&(await store()).libraries.some(l=>l.id===libraryA.id));
  for(const bad of [{name:' batch qa <BENCH> '},{name:''},{name:'x'.repeat(101)},{name:'Bad description',description:'x'.repeat(501)}])await rejectAtomic('Invalid/duplicate library is atomic '+String(bad.name).slice(0,20),'/api/libraries','POST',bad);
  const previewInput=input('Preview tags.csv',{libraryId:libraryA.id,tags:[' Bench ','bench','Final'],operationId:'preview-operation'});
  const before=digest(await store());const preview=await api('/api/import/preview','POST',previewInput);
  check('Organization preview has no persisted effects',digest(await store())===before);
  check('Preview assigns the requested library and case-insensitive deduplicated tags',preview.charts[0].libraryId===libraryA.id&&canonical(preview.charts[0].tags)===canonical(['Bench','Final']));
  const first=await api('/api/import','POST',previewInput),one=first.charts[0].id;
  const afterFirst=digest(await store());const retry=await api('/api/import','POST',previewInput);
  check('Same operation retry returns original success with no duplicate records',retry.alreadySaved===true&&retry.source.id===first.source.id&&digest(await store())===afterFirst);
  await rejectAtomic('Operation reuse with different bytes is atomic','/api/import','POST',{...previewInput,contentBase64:Buffer.from('Frequency,Value\n100,9\n').toString('base64')});
  await rejectAtomic('Operation reuse with different tags is atomic','/api/import','POST',{...previewInput,tags:['Changed']});
  await rejectAtomic('Preview rejects a missing library','/api/import/preview','POST',input('Unknown library.csv',{libraryId:'missing_library'}));
  await rejectAtomic('Save rejects a missing library','/api/import','POST',input('Unknown library.csv',{libraryId:'missing_library'}));
  const ap=spawnSync('python3',['-c','import sys;sys.path.insert(0,"tests");from test_acceptance import ap_fixture;sys.stdout.buffer.write(ap_fixture())'],{cwd:root});assert.equal(ap.status,0,ap.stderr.toString());
  const sourceImport=await api('/api/import','POST',{name:'Organization AP.xlsx',format:'xlsx',contentBase64:ap.stdout.toString('base64'),libraryId:libraryA.id,tags:['Initial'],operationId:'ap-organization-operation'});
  const apIds=sourceImport.charts.map(c=>c.id),original=await api('/api/charts/'+apIds[1]);
  const report=await api('/api/reports','POST',{chartId:apIds[1],title:'Frozen organization metadata'}),snapshot=await api('/api/reports/'+report.id);
  await api('/api/charts/batch','POST',{ids:[one,...apIds],libraryId:libraryB.id,tags:['review','REVIEW','Checked'],tagMode:'add'});
  check('Bulk move/tag updates every explicitly selected chart',(await store()).charts.filter(c=>[one,...apIds].includes(c.id)).every(c=>c.libraryId===libraryB.id&&c.tags.includes('review')&&c.tags.includes('Checked')));
  await api('/api/charts/batch','POST',{ids:apIds,tags:['initial'],tagMode:'remove'});
  check('Bulk remove is case insensitive',!(await api('/api/charts/'+apIds[0])).tags.some(t=>t.toLowerCase()==='initial'));
  await api('/api/charts/batch','POST',{ids:[one],tags:['Only'],tagMode:'replace'});
  check('Bulk replace replaces only selected record tags',canonical((await api('/api/charts/'+one)).tags)===canonical(['Only'])&&(await api('/api/charts/'+apIds[0])).tags.includes('Checked'));
  const changed=await api('/api/charts/'+apIds[1]);
  check('Bulk organization preserves AP numbers, units, classification and provenance',digest(changed.series)===digest(original.series)&&changed.kind===original.kind&&changed.label===original.label&&changed.sourceId===original.sourceId&&changed.unit==='Vrms'&&digest(changed.provenance)===digest(original.provenance));
  check('Bulk organization leaves old report snapshots frozen',digest(await api('/api/reports/'+report.id))===digest(snapshot));
  const source=(await store()).sources.find(s=>s.id===sourceImport.source.id);
  check('Bulk edits preserve original uploaded bytes and source hash',source.contentBase64===ap.stdout.toString('base64')&&source.sha256===sourceImport.source.sha256);
  await api('/api/charts/'+one,'PATCH',{tags:['Single edit'],libraryId:'library-reference'});
  check('Library membership is independent from source classification',(await api('/api/charts/'+one)).kind==='imported'&&(await api('/api/charts/'+one)).libraryId==='library-reference');
  const thirty=Array.from({length:30},(_,i)=>'Tag '+i);
  await api('/api/charts/'+one,'PATCH',{tags:thirty});
  await api('/api/charts/batch','POST',{ids:[one],tags:['tag 0'],tagMode:'add'});
  check('Adding an existing tag at the 30-unique-tag limit is idempotent',(await api('/api/charts/'+one)).tags.length===30);
  for(const body of [{ids:[one,one],tags:[]},{ids:[one,'missing_chart'],tags:['Must not partially save']},{ids:[one],libraryId:'missing_library'},{ids:[one],tags:['New 31st tag']},{ids:[one],tags:['x'.repeat(51)]},{ids:[one],tags:[' ']},{ids:[one],tags:['Okay'],sourceId:'reference'},{ids:[one],tags:[],tagMode:'invalid'}])await rejectAtomic('Invalid bulk request is atomic '+JSON.stringify(body).slice(0,60),'/api/charts/batch','POST',body);
  const secondPage=await context.newPage();await secondPage.goto(url);await secondPage.waitForFunction(()=>window.PortableAPI?.request);await secondPage.evaluate(async()=>{await PortableAPI.ready;});
  await Promise.all([api('/api/charts/batch','POST',{ids:[apIds[0]],tags:['Tab A']}),secondPage.evaluate(id=>PortableAPI.request('/api/charts/batch',{method:'POST',body:{ids:[id],tags:['Tab B']}}),apIds[0])]);
  check('Concurrent tabs retain both independent bulk tag additions',(await api('/api/charts/'+apIds[0])).tags.includes('Tab A')&&(await api('/api/charts/'+apIds[0])).tags.includes('Tab B'));
  await secondPage.close();
  const baseline=await store(),atCap=structuredClone(baseline),prototype=atCap.charts.find(c=>c.id===one);
  while(atCap.charts.length<5000)atCap.charts.push({...structuredClone(prototype),id:'capacity-'+atCap.charts.length,title:'Capacity fixture '+atCap.charts.length,tags:[]});
  await store(atCap);
  await rejectAtomic('Chart capacity is enforced before a new import can save','/api/import','POST',input('Beyond capacity.csv'));
  await api('/api/charts/'+one,'PATCH',{notes:'Existing records remain editable at the chart-count cap'});
  check('Existing records remain editable at the chart-count cap',(await api('/api/charts/'+one)).notes.includes('remain editable'));
  await store(baseline);
  const libraryCap=structuredClone(baseline);while(libraryCap.libraries.length<100)libraryCap.libraries.push({id:'capacity-library-'+libraryCap.libraries.length,name:'Capacity library '+libraryCap.libraries.length,description:'',createdAt:'Test fixture'});
  await store(libraryCap);await rejectAtomic('Library capacity rejects a new library atomically','/api/libraries','POST',{name:'One library too many'});await store(baseline);
  await context.close();context=null;await launch();
  check('Library membership and tags survive complete browser restart',digest(await store())===digest(baseline));
  check('Organization API remains offline with no JavaScript errors',network.length===0&&errors.length===0);
  await writeFile(path.join(root,'docs/browser-organization-api-qa.json'),JSON.stringify({date:'2026-10-22',environment:'file:// offline Chrome; temporary profile and synthetic fixtures only',checks,errors,network},null,2)+'\n');
  process.stdout.write(JSON.stringify({checks:checks.length,errors,network},null,2)+'\n');
}catch(error){process.stderr.write(JSON.stringify({completedChecks:checks.length,lastCheck:checks.at(-1),errors},null,2)+'\n');throw error;}
finally{if(context)await context.close();await rm(temporary,{recursive:true,force:true});}
