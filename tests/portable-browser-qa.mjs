// Standalone artifact acceptance. Never opens a server or the user's browser profile.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm, stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=path.join(root,'CRY7574 Hearing Aid Box Measurement Manage Software.html');
const fileUrl=pathToFileURL(target).href;
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-portable-qa-'));
const profile=path.join(temporary,'profile');
const checks=[],errors=[],requests=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const sha=content=>createHash('sha256').update(content).digest('hex');
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
let context,page;
async function launch(){
  context=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,acceptDownloads:true,viewport:{width:1500,height:1050}});
  await context.setOffline(true);
  context.on('request',request=>requests.push(request.url()));
  context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(fileUrl,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.PortableAPI?.request);
  await page.evaluate(async()=>{await window.PortableAPI.ready;});
  await page.waitForFunction(()=>document.querySelectorAll('#metrics .metric').length===4);
}
async function api(endpoint,method='GET',body){return page.evaluate(async ({endpoint,method,body})=>window.PortableAPI.request(endpoint,method==='GET'?undefined:{method,body}),{endpoint,method,body});}
async function workspace(){return page.evaluate(async()=>{
  const request=indexedDB.open(window.PortableAPI.storageName);
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readonly');const r=tx.objectStore('workspace').get('primary');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
});}
async function download(selector){await page.locator(selector).evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});const [d]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);return {name:d.suggestedFilename(),content:await readFile(await d.path())};}
async function openLibrary(id){await page.goto(fileUrl+'#overview');await page.locator('.open-library[data-id="'+id+'"]').click();}
async function selectChart(id){const chart=await api('/api/charts/'+id);await openLibrary(chart.libraryId);await page.locator('.chart-item[data-id="'+id+'"]').click();await page.waitForFunction(id=>document.querySelector('#csvDownload')?.getAttribute('href')==='/api/charts/'+id+'/export.csv',id);}
async function openReports(){await page.goto(fileUrl+'#reports');await page.waitForFunction(()=>document.querySelector('#reportCards a[href*="/download"]'));}

try {
  await readFile(target);
  await launch();
  const initial=await api('/api/state');
  check('Single HTML opens by file URL while browser network is offline',page.url().startsWith('file:')&&initial.charts.length>=33);
  const python=spawnSync('python3',['-c','import json,sys;sys.path.insert(0,"tests");from test_acceptance import independently_read_ap_workbook;from pathlib import Path;print(json.dumps([independently_read_ap_workbook(Path(p)) for p in sys.argv[1:]]))','/Users/peter/Downloads/5G-01-AP--1m-消声室数据.xlsx','/Users/peter/Downloads/5G-02-AP-1m消声室数据.xlsx'],{cwd:root,maxBuffer:20*1024*1024});
  assert.equal(python.status,0,python.stderr.toString());
  const expectations=JSON.parse(python.stdout);
  const sourcePaths=['/Users/peter/Downloads/5G-01-AP--1m-消声室数据.xlsx','/Users/peter/Downloads/5G-02-AP-1m消声室数据.xlsx'];
  const imported=[];
  for(let index=0;index<sourcePaths.length;index++){
    const sourcePath=sourcePaths[index],raw=await readFile(sourcePath),beforeTime=(await stat(sourcePath)).mtimeMs;
    await openLibrary('library-imports');
    await page.locator('#importButton').click();
    await page.locator('#uploadFile').setInputFiles(sourcePath);
    const before=await workspace();
    await page.locator('#previewImport').click();
    await page.locator('#saveImport').waitFor({state:'visible'});
    check('AP0'+(index+1)+' Preview does not mutate IndexedDB',sha(canonical(await workspace()))===sha(canonical(before)));
    const previewText=await page.locator('#importPreview').innerText();
    check('AP0'+(index+1)+' Preview explicitly explains Summary skip',previewText.includes('Summary')&&previewText.includes('N/A'));
    if(index===1)check('AP02 Preview preserves its source Vrms unit',previewText.includes('Vrms'));
    await page.locator('#saveImport').click();
    await page.waitForFunction(()=>!document.querySelector('#importDialog').open);
    const saved=await workspace();
    const source=saved.sources.find(s=>s.name===path.basename(sourcePath));
    assert.ok(source,'Saved actual source exists');
    const charts=saved.charts.filter(c=>c.sourceId===source.id);
    check('AP0'+(index+1)+' saves exactly its measurement worksheets',charts.length===expectations[index].length);
    for(let i=0;i<charts.length;i++){
      const actual=charts[i],expected=expectations[index][i];
      check('AP0'+(index+1)+' '+expected.title+' preserves all original pairs',sha(canonical(actual.series[0].values))===sha(canonical(expected.values)));
      check('AP0'+(index+1)+' '+expected.title+' preserves native provenance',actual.provenance.measurementTitle===expected.title&&actual.provenance.worksheet===expected.worksheet&&actual.series[0].name===expected.channel&&actual.sourceUnit===expected.sourceUnit&&canonical(actual.provenance.sourceRows)===canonical(expected.sourceRows)&&actual.testDate==='');
      if(expected.sourceUnit==='Vrms')check('AP02 smoothed voltage is not relabelled SPL',actual.unit==='Vrms'&&actual.processing==='AP-provided smoothed');
    }
    check('AP0'+(index+1)+' retains original uploaded bytes and hash',sha(Buffer.from(source.contentBase64,'base64'))===sha(raw)&&source.sha256===sha(raw));
    check('AP0'+(index+1)+' retains Summary N/A without pass decisions',source.skippedSheets?.length===1&&JSON.stringify(source.skippedSheets[0].metadata).includes('N/A')&&source.skippedSheets[0].reason.includes('not a measurement chart or pass/fail'));
    const original=await download('a[href="/api/sources/'+source.id+'/download"]');
    check('AP0'+(index+1)+' original download is byte exact with its filename',sha(original.content)===sha(raw)&&original.name===path.basename(sourcePath));
    check('AP0'+(index+1)+' source workbook remains read only',sha(await readFile(sourcePath))===sha(raw)&&(await stat(sourcePath)).mtimeMs===beforeTime);
    imported.push({source,charts});
  }
  check('Both AP files preserve all 8561 source pairs',imported.flatMap(s=>s.charts).reduce((n,c)=>n+c.series[0].values.length,0)===8561);
  const voltage=imported[1].charts.find(c=>c.sourceUnit==='Vrms');
  const oldReport=await api('/api/reports','POST',{chartId:voltage.id,title:'Portable frozen voltage',notes:'Before metadata edit'});
  const oldSnapshot=await api('/api/reports/'+oldReport.id);
  await selectChart(voltage.id);
  await page.locator('#editChart').click();
  await page.locator('#chartDetailsForm [name=title]').fill('Portable voltage review');
  await page.locator('#chartDetailsForm [name=testDate]').fill('2026-10-21');
  await page.locator('#chartDetailsForm [name=testItem]').fill('Portable Vrms');
  const hostile='Bench </pre><img src=x onerror="window.portableUnsafe=true"><script>window.portableUnsafe=true</script>';
  await page.locator('#chartDetailsForm [name=notes]').fill(hostile);
  await page.locator('#chartDetailsForm [type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#chartTitle').textContent==='Portable voltage review');
  check('Metadata edit preserves native points and source classification',sha(canonical((await api('/api/charts/'+voltage.id)).series))===sha(canonical(voltage.series))&&(await api('/api/charts/'+voltage.id)).label===voltage.label);
  check('Old report remains frozen after metadata editing',sha(canonical(await api('/api/reports/'+oldReport.id)))===sha(canonical(oldSnapshot)));
  const newReport=await api('/api/reports','POST',{chartId:voltage.id,title:'Portable escaped notes',notes:hostile});
  await openReports();
  const reportDownload=await download('a[href="/api/reports/'+newReport.id+'/download"]');
  const reportHtml=reportDownload.content.toString('utf8');
  check('Standalone report escapes hostile notes and retains source units',!reportHtml.includes(hostile)&&!reportHtml.includes('<script>window.portableUnsafe')&&reportHtml.includes('Vrms')&&reportHtml.includes('2026-10-21'));
  const state=await api('/api/state'),task=state.tasks[0];
  await page.goto(fileUrl+'#progress');
  await page.locator('.edit-task[data-id="'+task.id+'"]').click();
  await page.locator('#taskForm [name=status]').selectOption('In progress');
  await page.locator('#taskForm [name=percent]').fill('37.5');
  await page.locator('#taskForm [name=notes]').fill('Portable persistence test evidence');
  await page.locator('#taskForm [type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('#taskDialog').open);
  check('Project progress saves in IndexedDB',(await api('/api/state')).tasks.find(t=>t.id===task.id).percent===37.5);
  const persisted=await workspace();
  await page.reload();await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await window.PortableAPI.ready;});
  check('IndexedDB survives file reload',sha(canonical(await workspace()))===sha(canonical(persisted)));
  await context.close();context=null;
  await launch();
  check('IndexedDB survives complete Chrome restart with the same temporary profile',sha(canonical(await workspace()))===sha(canonical(persisted)));
  const other=await context.newPage();
  await other.goto(fileUrl);await other.waitForFunction(()=>window.PortableAPI?.request);await other.evaluate(async()=>{await window.PortableAPI.ready;});
  const twoTasks=(await api('/api/state')).tasks.slice(0,2);
  await Promise.all([
    api('/api/tasks/'+twoTasks[0].id,'PATCH',{notes:'Concurrent tab A evidence'}),
    other.evaluate(async id=>window.PortableAPI.request('/api/tasks/'+id,{method:'PATCH',body:{notes:'Concurrent tab B evidence'}}),twoTasks[1].id)
  ]);
  const concurrent=await api('/api/state');
  check('Concurrent tabs preserve both independent edits',concurrent.tasks.find(t=>t.id===twoTasks[0].id).notes==='Concurrent tab A evidence'&&concurrent.tasks.find(t=>t.id===twoTasks[1].id).notes==='Concurrent tab B evidence');
  await other.close();
  const nullable=await api('/api/import','POST',{name:'Nullable report fixture.json',format:'json',contentBase64:Buffer.from(JSON.stringify({series:[{name:'Measured',values:[[100,2],[200,3]]},{name:'Missing',values:[[100,null],[200,null]]}]})).toString('base64')});
  const emptyReport=await api('/api/reports','POST',{chartId:nullable.charts[0].id,series:['Missing'],title:'Legitimate all-missing report snapshot'});
  check('All-missing report snapshot remains a supported saved record',(await api('/api/reports/'+emptyReport.id)).chart.series[0].values.every(p=>p[1]===null));
  const backupDownload=await download('#exportBackup');
  const backup=JSON.parse(backupDownload.content);
  check('Backup exports the latest complete persisted workspace',backup.format==='CRY7574-portable-backup'&&backup.version===1&&sha(canonical(backup.data))===sha(canonical(await workspace())));
  await writeFile(path.join(temporary,'backup.json'),backupDownload.content);
  // Restore checks are completed through the real file input once a validation message is available.
  const mutations=[['bad schema',b=>{b.format='Wrong backup';}],['bad source hash',b=>{b.data.sources[0].sha256='0'.repeat(64);}],['unsafe ID',b=>{b.data.charts[0].id='unsafe" onclick="alert(1)';}],['duplicate chart ID',b=>{b.data.charts.push(structuredClone(b.data.charts[0]));}],['dangling source reference',b=>{b.data.charts[0].sourceId='missing_source';}],['invalid task numeric value',b=>{b.data.tasks[0].percent=101;}],['invalid report snapshot',b=>{b.data.reports[0].chart.series=[];}],['invalid report source kind',b=>{b.data.reports[0].source.kind=null;}],['invalid AP provenance rows',b=>{b.data.charts.find(c=>c.provenance).provenance.sourceRows={};}]];
  for(const [name,mutate]of mutations){
    const bad=structuredClone(backup);mutate(bad);
    const baseline=sha(canonical(await workspace()));
    let unexpectedConfirm=false;
    const cancel=async dialog=>{if(dialog.type()==='confirm'){unexpectedConfirm=true;await dialog.dismiss();}else await dialog.accept();};
    page.on('dialog',cancel);
    await page.locator('#restoreBackupFile').setInputFiles({name:'invalid-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>document.querySelector('#portableBackupStatus')?.dataset.state==='error',null,{timeout:10000});
    page.off('dialog',cancel);
    check('Invalid restore '+name+' is atomic',!unexpectedConfirm&&sha(canonical(await workspace()))===baseline);
    check('Restore input resets after '+name,await page.locator('#restoreBackupFile').inputValue()==='');
  }
  await api('/api/import','POST',{name:'Must disappear after restore.json',format:'json',contentBase64:Buffer.from(JSON.stringify({series:[{values:[[100,2]]}]})).toString('base64')});
  check('Fixture changes state before valid restore',sha(canonical(await workspace()))!==sha(canonical(backup.data)));
  page.once('dialog',dialog=>dialog.accept());
  await Promise.all([page.waitForEvent('load',{timeout:15000}),page.locator('#restoreBackupFile').setInputFiles(path.join(temporary,'backup.json'))]);
  await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await window.PortableAPI.ready;});
  await page.waitForFunction(()=>document.querySelectorAll('#metrics .metric').length===4);
  check('Valid backup restores all sources/charts/tasks/reports/activity completely',sha(canonical(await workspace()))===sha(canonical(backup.data)));
  check('Restore input resets after success',await page.locator('#restoreBackupFile').inputValue()==='');
  check('Offline workflow makes zero HTTP or HTTPS requests',requests.every(url=>!/^https?:/i.test(url)));
  check('Single artifact loads no external file assets',requests.every(url=>!url.startsWith('file:')||url.split('#')[0]===fileUrl));
  check('No browser JavaScript errors',errors.length===0);
  const evidence={date:'2026-10-22',artifact:path.basename(target),environment:'file://; installed Chrome; offline network; temporary persistent profile only',checks,errors,networkRequests:requests.filter(url=>/^https?:/i.test(url)),pointCount:8561};
  await writeFile(path.join(root,'docs/browser-portable-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  process.stdout.write(JSON.stringify({checks:checks.length,errors,networkRequests:evidence.networkRequests},null,2)+'\n');
} catch(error) {
  process.stderr.write(JSON.stringify({completedChecks:checks.length,lastCheck:checks.at(-1),errors},null,2)+'\n');
  throw error;
} finally {
  if(context)await context.close();
  await rm(temporary,{recursive:true,force:true});
}
