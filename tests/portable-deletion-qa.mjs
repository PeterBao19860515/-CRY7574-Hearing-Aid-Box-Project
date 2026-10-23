// Destructive-operation acceptance against disposable IndexedDB only; never the user's profile.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),target=path.join(root,'CRY7574 Hearing Aid Box Measurement Manage Software.html'),url=pathToFileURL(target).href;
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-deletion-'));
const checks=[],errors=[],network=[];
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
let context,page;
async function launch(){context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,acceptDownloads:true,viewport:{width:1500,height:1100}});await context.setOffline(true);context.on('request',r=>{if(/^https?:/i.test(r.url()))network.push(r.url());});context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));page=await context.newPage();await page.goto(url+'#data');await ready();}
async function ready(){await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await PortableAPI.ready;});}
const api=(endpoint,method='GET',body)=>page.evaluate(({endpoint,method,body})=>PortableAPI.request(endpoint,method==='GET'?undefined:{method,body}),{endpoint,method,body});
async function workspace(){return page.evaluate(async()=>{const r=indexedDB.open(PortableAPI.storageName),db=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction('workspace').objectStore('workspace').get('primary');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}});}
async function rejectAtomic(name,endpoint,body,method='POST'){const before=digest(await workspace()),result=await page.evaluate(async({endpoint,body,method})=>{try{await PortableAPI.request(endpoint,{method,body});return {ok:true};}catch(e){return {ok:false,error:e.message};}},{endpoint,body,method});check(name,!result.ok&&digest(await workspace())===before);}
const fixture=n=>({charts:Array.from({length:n},(_,i)=>({title:'Deletion fixture '+(i+1),unit:'Vrms',series:[{name:'Original',values:[[100,0],[200,null],[300,.00045267890123456]]}]}))});
async function upload(name,n,libraryId){return api('/api/import','POST',{name:name+'.json',format:'json',contentBase64:Buffer.from(JSON.stringify(fixture(n))).toString('base64'),libraryId});}
const preview=ids=>api('/api/charts/delete/preview','POST',{ids});
const authorized=scope=>({password:'CRYSOUND',confirmed:true,scopeToken:scope.scopeToken});
async function deleteRecords(ids){const scope=await preview(ids);return api('/api/charts/delete','POST',{ids,...authorized(scope)});}
async function deleteLibrary(id){const scope=await api('/api/libraries/'+id+'/delete-preview');return api('/api/libraries/'+id+'/delete','POST',authorized(scope));}
async function backupRestore(data){page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('load'),page.locator('#restoreBackupFile').setInputFiles({name:'deleted-snapshot-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'CRY7574-portable-backup',version:1,exportedAt:'2026-10-22T00:00:00Z',data}))})]);await ready();}
try{
  await launch();
  check('Visibility migration defaults every existing live record to visible',(await workspace()).charts.every(c=>c.hidden===false));
  const a=await api('/api/libraries','POST',{name:'Deletion inside'}),b=await api('/api/libraries','POST',{name:'Deletion survivor'});
  const shared=await upload('Shared originals',3,a.id),ids=shared.charts.map(c=>c.id),originalSources=structuredClone((await workspace()).sources),originalSeries=await api('/api/charts/'+ids[2]);
  await api('/api/charts/'+ids[2],'PATCH',{libraryId:b.id});await api('/api/charts/'+ids[1],'PATCH',{hidden:true});
  check('Single-record hide is reversible metadata and preserves arrays',(await api('/api/charts/'+ids[1])).hidden===true&&digest((await api('/api/charts/'+ids[1])).series)===digest(fixture(3).charts[1].series));
  for(const hidden of ['true',1,null])await rejectAtomic('Invalid visibility is atomic '+JSON.stringify(hidden),'/api/charts/'+ids[1],{hidden},'PATCH');
  await rejectAtomic('Mixed existing/missing bulk visibility is atomic','/api/charts/batch',{ids:[ids[1],'missing_record'],hidden:false});
  await api('/api/charts/batch','POST',{ids:ids.slice(0,2),hidden:true});await api('/api/charts/'+ids[0],'PATCH',{hidden:false});
  check('Bulk hide and single unhide affect exactly the requested records',(await api('/api/charts/'+ids[0])).hidden===false&&(await api('/api/charts/'+ids[1])).hidden===true&&(await api('/api/charts/'+ids[2])).hidden===false);
  const r=await api('/api/reports','POST',{chartId:ids[0],title:'Historical <snapshot>',notes:'Original frozen notes'}),snapshot=await api('/api/reports/'+r.id);
  const beforePreview=digest(await workspace()),scope=await preview(ids.slice(0,2));
  check('Deletion preview includes hidden records and writes nothing',scope.count===2&&scope.hiddenCount===1&&scope.sourcePruneCount===0&&scope.retainedReportCount===1&&digest(await workspace())===beforePreview);
  for(const [label,body] of [['lowercase',{password:'crysound',confirmed:true}],['trailing space',{password:'CRYSOUND ',confirmed:true}],['leading space',{password:' CRYSOUND',confirmed:true}],['missing password',{confirmed:true}],['missing confirmation',{password:'CRYSOUND'}],['false confirmation',{password:'CRYSOUND',confirmed:false}],['string confirmation',{password:'CRYSOUND',confirmed:'true'}]])await rejectAtomic('Exact guard rejects '+label,'/api/charts/delete',{ids:ids.slice(0,2),scopeToken:scope.scopeToken,...body});
  await rejectAtomic('Missing reviewed token is atomic','/api/charts/delete',{ids:ids.slice(0,2),password:'CRYSOUND',confirmed:true});
  await rejectAtomic('Changed deletion ID scope is atomic','/api/charts/delete',{ids:[ids[0]],...authorized(scope)});
  await rejectAtomic('Duplicate selected IDs are rejected','/api/charts/delete/preview',{ids:[ids[0],ids[0]]});
  await rejectAtomic('Unknown selected ID does not partially delete','/api/charts/delete',{ids:[ids[0],'missing_record'],...authorized(scope)});
  const tab=await context.newPage();await tab.goto(url);await tab.waitForFunction(()=>window.PortableAPI?.request);await tab.evaluate(async()=>{await PortableAPI.ready;});
  await tab.evaluate(id=>PortableAPI.request('/api/charts/'+id,{method:'PATCH',body:{hidden:false}}),ids[1]);
  await rejectAtomic('Other-tab visibility change invalidates reviewed deletion','/api/charts/delete',{ids:ids.slice(0,2),...authorized(scope)});
  const reportScope=await preview([ids[0]]);await api('/api/reports','POST',{chartId:ids[0],title:'Report created after deletion review'});
  await rejectAtomic('New report invalidates reviewed retention scope','/api/charts/delete',{ids:[ids[0]],...authorized(reportScope)});
  await deleteRecords([ids[0]]);
  check('Record deletion retains exact frozen report and its original source',!(await workspace()).charts.some(c=>c.id===ids[0])&&digest(await api('/api/reports/'+r.id))===digest(snapshot)&&(await workspace()).sources.some(s=>s.id===shared.source.id));
  await deleteRecords([ids[1]]);
  check('Deleting siblings preserves surviving record arrays and shared raw bytes',digest((await api('/api/charts/'+ids[2])).series)===digest(originalSeries.series)&&digest((await workspace()).sources.find(s=>s.id===shared.source.id))===digest(originalSources.find(s=>s.id===shared.source.id)));
  await deleteRecords([ids[2]]);
  check('Report-only original remains when final live sibling is deleted',(await workspace()).sources.some(s=>s.id===shared.source.id)&&!(await workspace()).charts.some(c=>c.sourceId===shared.source.id));
  const orphan=await upload('Unreferenced original',1,b.id),orphanScope=await preview([orphan.charts[0].id]);
  check('Preview identifies exactly one truly orphaned original',orphanScope.sourcePruneCount===1&&orphanScope.retainedReportCount===0);
  const orphanResult=await deleteRecords([orphan.charts[0].id]);check('Deletion prunes only its unreferenced original',orphanResult.prunedSources===1&&!(await workspace()).sources.some(s=>s.id===orphan.source.id)&&(await workspace()).sources.some(s=>s.id===shared.source.id));
  const libraryImport=await upload('Library shared originals',3,a.id),libIds=libraryImport.charts.map(c=>c.id);await api('/api/charts/'+libIds[1],'PATCH',{hidden:true});await api('/api/charts/'+libIds[2],'PATCH',{libraryId:b.id});
  const libReport=await api('/api/reports','POST',{chartId:libIds[0],title:'Library historical report'}),libSnapshot=await api('/api/reports/'+libReport.id);
  const libScope=await api('/api/libraries/'+a.id+'/delete-preview');check('Library preview includes hidden members but excludes moved-out records',libScope.count===2&&libScope.hiddenCount===1&&libScope.chartIds.includes(libIds[1])&&!libScope.chartIds.includes(libIds[2])&&libScope.sourcePruneCount===0);
  await rejectAtomic('Library guard rejects incorrect password atomically','/api/libraries/'+a.id+'/delete',{...authorized(libScope),password:'crysound'});
  await tab.evaluate(id=>PortableAPI.request('/api/charts/'+id,{method:'PATCH',body:{notes:'Concurrent edit without changing chart IDs'}}),libIds[1]);
  await rejectAtomic('Same-ID library metadata revision invalidates reviewed scope','/api/libraries/'+a.id+'/delete',authorized(libScope));
  const addedScope=await api('/api/libraries/'+a.id+'/delete-preview');await upload('Concurrent library addition',1,a.id);
  await rejectAtomic('Added library member invalidates reviewed scope','/api/libraries/'+a.id+'/delete',authorized(addedScope));
  await deleteLibrary(a.id);
  check('Library delete removes visible and hidden members and preserves moved-out records',!(await workspace()).libraries.some(l=>l.id===a.id)&&!(await workspace()).charts.some(c=>c.libraryId===a.id)&&(await workspace()).charts.some(c=>c.id===libIds[2]));
  check('Library delete retains exact frozen report and shared source',digest(await api('/api/reports/'+libReport.id))===digest(libSnapshot)&&(await workspace()).sources.some(s=>s.id===libraryImport.source.id));
  const restored=await workspace();await backupRestore(restored);
  check('Backup restores deleted-linked frozen reports without library resurrection',digest(await workspace())===digest(restored)&&!(await workspace()).libraries.some(l=>l.id===a.id)&&digest(await api('/api/reports/'+libReport.id))===digest(libSnapshot));
  check('Restore input clears after deleted-snapshot restoration',await page.locator('#restoreBackupFile').inputValue()==='');
  await page.goto(url+'#overview');await page.locator('.open-library[data-id="'+b.id+'"]').click();
  await page.waitForFunction(id=>document.querySelector('#libraryFilter').value===id,b.id);
  check('Library-first landing opens the chosen live library',await page.locator('#activeLibraryTitle').innerText()===b.name&&await page.locator('#importButton').isEnabled());
  const liveId=libIds[2];await page.locator('.chart-item[data-id="'+liveId+'"]').click();
  const beforeHide=await api('/api/charts/'+liveId);await page.locator('#toggleHidden').click();
  await page.waitForFunction(id=>!document.querySelector('.chart-item[data-id="'+id+'"]'),liveId);
  check('Hide removes the record from the normal visible list',(await api('/api/charts/'+liveId)).hidden===true&&await page.locator('.chart-item').count()===0);
  await page.locator('#visibilityFilter').selectOption('hidden');await page.locator('.chart-item[data-id="'+liveId+'"]').click();
  check('Explicit hidden-data view exposes the original record',await page.locator('#toggleHidden').innerText()==='Unhide record'&&digest((await api('/api/charts/'+liveId)).series)===digest(beforeHide.series));
  await page.locator('.record-selection[data-id="'+liveId+'"]').check();await page.locator('#visibilityFilter').selectOption('visible');
  check('Changing visibility filters clears out-of-scope selection',await page.locator('#selectedCount').innerText()==='0 measurements selected'&&await page.locator('#deleteSelected').isDisabled());
  await page.locator('#visibilityFilter').selectOption('hidden');await page.locator('.record-selection[data-id="'+liveId+'"]').check();await page.locator('#unhideSelected').click();
  await page.waitForFunction(()=>document.querySelector('#selectedCount').textContent==='0 measurements selected');
  check('Bulk unhide changes only selected hidden records',(await api('/api/charts/'+liveId)).hidden===false&&await page.locator('.chart-item').count()===0);
  await page.locator('#visibilityFilter').selectOption('visible');await page.locator('.chart-item[data-id="'+liveId+'"]').click();
  await page.locator('#deleteChart').click();await page.locator('#deleteDialog').waitFor({state:'visible'});
  check('Delete dialog shows reviewed count and requires explicit confirmation',(await page.locator('#deleteScopeCount').innerText()).includes('1 measurement records')&&await page.locator('#confirmDelete').isDisabled()&&await page.locator('#deletePassword').getAttribute('type')==='password');
  await page.locator('#deletePassword').fill('CRYSOUND');check('A password alone cannot enable permanent deletion',await page.locator('#confirmDelete').isDisabled());
  const cancelCheckpoint=digest(await workspace());await page.locator('#deleteConfirm').check();await page.keyboard.press('Escape');
  await page.locator('#deleteDialog').waitFor({state:'hidden'});
  check('Escape cancellation preserves all records and clears secrets',digest(await workspace())===cancelCheckpoint&&await page.locator('#deletePassword').inputValue()===''&&!await page.locator('#deleteConfirm').isChecked());
  await page.locator('#deleteChart').click();await page.locator('#deletePassword').fill('crysound');await page.locator('#deleteConfirm').check();await page.locator('#confirmDelete').click();
  await page.waitForFunction(()=>document.querySelector('#deleteDialog .form-error').textContent.includes('exact password'));
  check('Wrong UI password rejects atomically and clears password/confirmation',digest(await workspace())===cancelCheckpoint&&await page.locator('#deletePassword').inputValue()===''&&!await page.locator('#deleteConfirm').isChecked()&&await page.locator('#confirmDelete').isDisabled());
  await page.keyboard.press('Escape');await page.locator('#deleteDialog').waitFor({state:'hidden'});await page.locator('#deleteLibrary').click();await page.locator('#deleteDialog').waitFor({state:'visible'});
  check('Library UI review states hidden-inclusive scope and retention',(await page.locator('#deleteScopeNote').innerText()).includes('including hidden records')&&(await page.locator('#deleteScopeNote').innerText()).includes('frozen reports remain saved'));
  await tab.evaluate(id=>PortableAPI.request('/api/charts/'+id,{method:'PATCH',body:{hidden:true}}),liveId);
  const staleCheckpoint=digest(await workspace());await page.locator('#deletePassword').fill('CRYSOUND');await page.locator('#deleteConfirm').check();await page.locator('#confirmDelete').click();
  await page.waitForFunction(()=>document.querySelector('#deleteDialog .form-error').textContent.includes('scope changed'));
  check('Stale UI review rejects atomically and requires a fresh review',digest(await workspace())===staleCheckpoint&&await page.locator('#confirmDelete').isDisabled());
  await page.locator('#deletePassword').fill('CRYSOUND');await page.locator('#deleteConfirm').check();check('Re-entering guard cannot reuse a stale reviewed scope',await page.locator('#confirmDelete').isDisabled());await page.keyboard.press('Escape');
  await page.reload();await ready();check('Hidden status survives reload without modifying source data',(await api('/api/charts/'+liveId)).hidden===true&&digest((await api('/api/charts/'+liveId)).series)===digest(beforeHide.series));
  await tab.close();
  for(const library of (await workspace()).libraries)await deleteLibrary(library.id);
  const empty=await workspace();check('Deleting every library leaves no live records but retains report-required originals',empty.libraries.length===0&&empty.charts.length===0&&empty.reports.length===3&&empty.sources.length===2);
  await context.close();context=null;await launch();
  check('Complete browser restart does not recreate deleted default libraries',digest(await workspace())===digest(empty)&&(await api('/api/state')).libraries.length===0);
  await page.goto(url+'#reports');await page.locator('[data-report-source="'+shared.source.id+'"]').first().waitFor({state:'visible'});
  const [rawDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-report-source="'+shared.source.id+'"]').first().click()]);
  check('Report-only original remains downloadable after every library is deleted',createHash('sha256').update(await readFile(await rawDownload.path())).digest('hex')===shared.source.sha256&&rawDownload.suggestedFilename()===shared.source.name);
  await backupRestore(empty);check('Empty-library backup restore preserves zero libraries and historical reports',digest(await workspace())===digest(empty));
  await rejectAtomic('Import cannot silently recreate a deleted default library','/api/import',{name:'No destination.csv',format:'csv',contentBase64:Buffer.from('Frequency,Value\n100,0\n').toString('base64')});
  const recovered=await api('/api/libraries','POST',{name:'New Library after deletion'}),newImport=await upload('Recovery original',1,recovered.id);check('Create then import works after all defaults are deleted',(await workspace()).libraries.length===1&&newImport.charts[0].libraryId===recovered.id&&(await workspace()).charts.length===1);
  const persisted=JSON.stringify(await workspace());check('Passwords, confirmation flags and review tokens are never persisted',!persisted.includes('CRYSOUND')&&!persisted.includes('scopeToken')&&!persisted.includes('"confirmed"')&&!persisted.includes('"password"'));
  check('Destructive workflows remain offline without JavaScript errors',network.length===0&&errors.length===0);
  const artifact=await readFile(target);await writeFile(path.join(root,'docs/browser-deletion-qa.json'),JSON.stringify({date:'2026-10-22',environment:'file:// offline Chrome, disposable profile and synthetic fixtures only',artifact:{size:artifact.length,sha256:createHash('sha256').update(artifact).digest('hex')},checks,errors,network},null,2)+'\n');
  process.stdout.write(JSON.stringify({checks:checks.length,errors,network},null,2)+'\n');
}catch(error){process.stderr.write(JSON.stringify({completedChecks:checks.length,lastCheck:checks.at(-1),errors},null,2)+'\n');throw error;}
finally{if(context)await context.close();await rm(temporary,{recursive:true,force:true});}
