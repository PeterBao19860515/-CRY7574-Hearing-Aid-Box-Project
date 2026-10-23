// Optional Chrome acceptance check. Uses isolated server/storage and synthetic data only.
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-table-qa-'));
const checks=[],errors=[];
let server,browser;
const record=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
try {
  server=spawn('python3',[path.join(root,'server.py'),'--port','0','--data-dir',path.join(temporary,'data')],{cwd:root});
  const base=await new Promise((resolve,reject)=>{
    let output='';
    const timeout=setTimeout(()=>reject(Error('Temporary server startup timeout')),10000);
    server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
    server.on('error',reject);server.on('exit',code=>{if(code!==null&&code!==0)reject(Error('Server exited '+code));});
  });
  async function api(endpoint,body){const r=await fetch(base+endpoint,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const result=await r.json();assert.ok(r.ok,JSON.stringify(result));return result;}
  async function importJson(name,charts){return api('/api/import',{name,format:'json',contentBase64:Buffer.from(JSON.stringify({charts})).toString('base64')});}
  const first=Array.from({length:151},(_,i)=>[19.1326530612245+i,i===0?0:i===1?null:i===2?1.23456789012345:i]);
  const small=await importJson('Table boundary fixture.json',[{title:'Table boundary fixture',unit:'dB SPL',series:[{name:'Long series',values:first},{name:'Short series',values:[[100,null],[200,0],[300,3.141592653589793]]}]}]);
  const big=await importJson('Table large fixture.json',[{title:'Table large fixture',unit:'Vrms',series:[{name:'150k points',values:Array.from({length:150000},(_,i)=>[i+1,i%1000===0?null:i/1000000])}]}]);
  const ap=spawnSync('python3',['-c','import sys;sys.path.insert(0,"tests");from test_acceptance import ap_fixture;sys.stdout.buffer.write(ap_fixture())'],{cwd:root});
  assert.equal(ap.status,0,ap.stderr.toString());
  const mapped=await api('/api/import',{name:'Table AP fixture.xlsx',format:'xlsx',contentBase64:ap.stdout.toString('base64')});
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base);
  await page.locator('#overviewUploadExcel').click();
  record('Overview Upload Excel opens the actual import modal on Test Data',await page.locator('#importDialog').evaluate(e=>e.open)&&new URL(page.url()).hash==='#data');
  await page.locator('#importDialog .close').first().click();
  async function selectChart(id){await page.locator('.chart-item[data-id="'+id+'"]').click();await page.waitForFunction(id=>document.querySelector('#csvDownload')?.getAttribute('href')==='/api/charts/'+id+'/export.csv',id);await page.waitForFunction(()=>document.querySelectorAll('#measurementRows tr').length>0);}
  const cells=async i=>page.locator('#measurementRows tr').nth(i).locator('td').allTextContents();
  await selectChart(small.charts[0].id);
  record('Table initially renders only 50 records',await page.locator('#measurementRows tr').count()===50);
  record('Original frequency precision remains visible',(await cells(0)).join(' ').includes(String(first[0][0])));
  record('Numeric zero remains visible as zero',(await cells(0)).some(v=>v.trim()==='0'));
  record('Null measurement is explicitly missing',(await cells(1)).join(' ').toLowerCase().includes('missing'));
  record('Original measurement precision remains visible',(await cells(2)).join(' ').includes('1.23456789012345'));
  record('Generic unknown source cells are not guessed',(await cells(0)).at(-1).trim()==='—');
  await page.locator('#tablePageSize').selectOption('100');
  record('Page-size change resets to the first 100 records',await page.locator('#measurementRows tr').count()===100&&(await cells(0)).join(' ').includes(String(first[0][0])));
  await page.locator('#tableNext').click();
  record('Final partial page has exactly the remaining 51 records',await page.locator('#measurementRows tr').count()===51);
  record('Final page disables Next',await page.locator('#tableNext').isDisabled());
  record('Pagination selects the original next sample',(await cells(0)).join(' ').includes(String(first[100][0])));
  const patch=await fetch(base+'/api/charts/'+small.charts[0].id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Table boundary fixture updated'})});
  assert.ok(patch.ok);
  await page.waitForFunction(()=>document.querySelector('#chartTitle')?.textContent==='Table boundary fixture updated',null,{timeout:8000});
  record('Live metadata polling preserves the current table page',await page.locator('#measurementRows tr').count()===51&&!(await page.locator('#tablePrev').isDisabled())&&(await cells(0)).join(' ').includes(String(first[100][0])));
  await page.locator('#tableSeries').selectOption('1');
  record('Changing series resets pagination to its three records',await page.locator('#measurementRows tr').count()===3&&await page.locator('#tablePrev').isDisabled());
  record('Changing series preserves its missing first sample',(await cells(0)).join(' ').toLowerCase().includes('missing'));
  await selectChart(mapped.charts[0].id);
  record('Changing charts resets the series and table page',await page.locator('#tableSeries').inputValue()==='0'&&await page.locator('#tablePrev').isDisabled());
  record('AP source cells include the exact first source row',(await cells(0)).at(-1).includes('A5')&&(await cells(0)).at(-1).includes('B5'));
  record('AP missing-value row retains its original source-cell mapping',(await cells(1)).at(-1).includes('A6')&&(await cells(1)).at(-1).includes('B6'));
  const reference=await api('/api/charts/ref-C05');
  await selectChart(reference.id);
  const originalSeries=reference.series[0],originalRow=originalSeries.rawRows[0];
  const referenceCells=(await cells(0)).at(-1);
  record('Reference series use their exact source worksheet and cells',referenceCells.includes(originalSeries.rawSheet)&&referenceCells.includes(originalSeries.rawXCol+originalRow)&&referenceCells.includes(originalSeries.rawYCol+originalRow));
  const referenceLine=reference.series.findIndex(series=>series.reference);
  assert.ok(referenceLine>=0);
  await page.locator('#tableSeries').selectOption(String(referenceLine));
  record('Reference lines do not invent original measurement cells',(await cells(0)).at(-1).trim()==='—');
  await selectChart(big.charts[0].id);
  record('150000 samples create at most one bounded table page',await page.locator('#measurementRows tr').count()<=100);
  await page.locator('#chartSearch').fill('No matching fixture xyz');
  record('No-result filtering hides the measurement table',await page.locator('#measurementTable').isHidden());
  await page.locator('#clearFilters').click();
  await selectChart(small.charts[0].id);
  record('Clearing filters restores a usable first series and first page',await page.locator('#tableSeries').inputValue()==='0'&&await page.locator('#tablePrev').isDisabled());
  record('No JavaScript page errors',errors.length===0);
  const result={date:'2026-10-22',environment:'Installed Chrome / Playwright; temporary server and synthetic fixtures only',checks,errors};
  await writeFile(path.join(root,'docs/browser-point-table-qa.json'),JSON.stringify(result,null,2)+'\n');
  process.stdout.write(JSON.stringify({checks:checks.length,errors},null,2)+'\n');
} finally {
  if(browser)await browser.close();
  if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});}
  await rm(temporary,{recursive:true,force:true});
}
