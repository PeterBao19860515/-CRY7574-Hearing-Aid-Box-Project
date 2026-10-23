// Mouse zoom regression over file://. Expected transforms use independent log-X/linear-Y math.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),url=pathToFileURL(path.join(root,'CRY7574 Hearing Aid Box Measurement Manage Software.html')).href;
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-zoom-'));
const checks=[],errors=[],network=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const close=(a,b,tolerance=1e-10)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
let context,page,wheelPoint,dragPoints;
const api=(endpoint,method='GET',body)=>page.evaluate(({endpoint,method,body})=>PortableAPI.request(endpoint,method==='GET'?undefined:{method,body}),{endpoint,method,body});
async function workspace(){return page.evaluate(async()=>{const request=indexedDB.open(PortableAPI.storageName),db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction('workspace').objectStore('workspace').get('primary');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}});}
async function bounds(){return page.evaluate(()=>({x:[Number(document.querySelector('#xMin').value),Number(document.querySelector('#xMax').value)],y:[Number(document.querySelector('#yMin').value),Number(document.querySelector('#yMax').value)]}));}
async function point(rx,ry){await page.locator('#chartCanvas').scrollIntoViewIfNeeded();return page.evaluate(({rx,ry})=>{const r=document.querySelector('#chartCanvas').getBoundingClientRect(),p=geometry.p,w=r.width-p.l-p.r,h=r.height-p.t-p.b,x=Math.round(r.left+p.l+rx*w),y=Math.round(r.top+p.t+ry*h);return {x,y,fx:(x-r.left-p.l)/w,fy:(y-r.top-p.t)/h};},{rx,ry});}
async function wheel(delta,rx=.3,ry=.65){const p=await point(rx,ry),before=await bounds();wheelPoint=p;await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,delta);await page.waitForFunction(before=>{const x=[Number(document.querySelector('#xMin').value),Number(document.querySelector('#xMax').value)],y=[Number(document.querySelector('#yMin').value),Number(document.querySelector('#yMax').value)];return x.some((v,i)=>v!==before.x[i])||y.some((v,i)=>v!==before.y[i]);},before);return bounds();}
async function drag(rx0,ry0,rx1,ry1,cancel){const a=await point(rx0,ry0),b=await point(rx1,ry1);dragPoints={a,b};await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});if(cancel==='escape')await page.keyboard.press('Escape');if(cancel==='pointer')await page.locator('#chartCanvas').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});await page.mouse.up();await page.evaluate(()=>new Promise(requestAnimationFrame));return bounds();}
async function reset(){await page.locator('#resetRange').click();await page.evaluate(()=>new Promise(requestAnimationFrame));return bounds();}
async function selectChart(id){await page.locator('.chart-item[data-id="'+id+'"]').click();await page.waitForFunction(id=>document.querySelector('#csvDownload').getAttribute('href')==='/api/charts/'+id+'/export.csv',id);await page.evaluate(()=>new Promise(requestAnimationFrame));return bounds();}
const same=(a,b)=>a.x.every((v,i)=>close(v,b.x[i]))&&a.y.every((v,i)=>close(v,b.y[i]));
try{
  context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:1500,height:1100}});
  await context.setOffline(true);context.on('request',r=>{if(/^https?:/i.test(r.url()))network.push(r.url());});page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url+'#data');await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await PortableAPI.ready;});
  const fixture={charts:[{title:'Zoom positive range',unit:'dB SPL',series:[{name:'Raw',values:[[10,0],[100,null],[1000,10],[10000,20]]}]},{title:'Zoom tiny Vrms',unit:'Vrms',series:[{name:'Voltage',values:[[100,.0004526],[200,.000453],[300,.0004528]]}]},{title:'Zoom zeros and missing',unit:'dB',series:[{name:'Zero',values:[[100,0],[200,0],[300,null]]}]}]};
  const imported=await api('/api/import','POST',{name:'Mouse zoom fixture.json',format:'json',contentBase64:Buffer.from(JSON.stringify(fixture)).toString('base64')});
  const report=await api('/api/reports','POST',{chartId:imported.charts[0].id,title:'Frozen before view changes'}),snapshot=await api('/api/reports/'+report.id);
  await page.goto(url+'#overview');await page.waitForFunction(()=>state?.charts?.some(c=>c.title==='Zoom positive range'));await page.locator('.open-library[data-id="library-imports"]').click();
  const initial=await selectChart(imported.charts[0].id),storedBefore=digest(await workspace());
  check('Initial full view retains source X range and zero-inclusive Y',initial.x[0]===10&&initial.x[1]===10000&&initial.y[0]<0&&initial.y[1]>20);
  await page.locator('#zoomAxes').selectOption('both');
  const factor=Math.exp(-120*.0015),zoomed=await wheel(-120,.3,.65),rx=wheelPoint.fx,ry=wheelPoint.fy,anchorX=Math.log10(initial.x[0])+rx*Math.log10(initial.x[1]/initial.x[0]),anchorY=initial.y[1]-ry*(initial.y[1]-initial.y[0]),logSpan=Math.log10(initial.x[1]/initial.x[0])*factor,spanY=(initial.y[1]-initial.y[0])*factor;
  check('Both-axis wheel computes exact cursor-anchored logarithmic X bounds',close(zoomed.x[0],10**(anchorX-rx*logSpan))&&close(zoomed.x[1],10**(anchorX+(1-rx)*logSpan)));
  check('Both-axis wheel computes exact cursor-anchored linear Y bounds',close(zoomed.y[0],anchorY-(1-ry)*spanY)&&close(zoomed.y[1],anchorY+ry*spanY));
  const unzoomed=await wheel(120,.3,.65);check('Opposite wheel motion restores the same anchor and extent',same(unzoomed,initial));
  await reset();await page.locator('#zoomAxes').selectOption('x');const xOnly=await wheel(-120);
  check('X-only wheel freezes the actual Auto Y extent',xOnly.x[0]>initial.x[0]&&xOnly.x[1]<initial.x[1]&&xOnly.y.every((v,i)=>close(v,initial.y[i])));
  await reset();await page.locator('#zoomAxes').selectOption('y');const yOnly=await wheel(-120);
  check('Y-only wheel preserves exact X bounds',yOnly.x.every((v,i)=>v===initial.x[i])&&yOnly.y[1]-yOnly.y[0]<initial.y[1]-initial.y[0]);
  await reset();await page.locator('#zoomAxes').selectOption('both');const rectangle=await drag(.2,.25,.8,.75);
  const expectedX=[10**(1+dragPoints.a.fx*3),10**(1+dragPoints.b.fx*3)],expectedY=[initial.y[1]-dragPoints.b.fy*(initial.y[1]-initial.y[0]),initial.y[1]-dragPoints.a.fy*(initial.y[1]-initial.y[0])];
  check('Rectangle drag selects exact log-X and linear-Y data bounds',rectangle.x.every((v,i)=>close(v,expectedX[i],1e-8))&&rectangle.y.every((v,i)=>close(v,expectedY[i],1e-8)));
  await reset();const reverse=await drag(.8,.75,.2,.25);check('Reverse-direction drag selects the same bounds',same(reverse,rectangle));
  await reset();await page.locator('#zoomAxes').selectOption('x');const rectangleX=await drag(.2,.25,.8,.75);check('X-only rectangle preserves current Y extent',rectangleX.x.every((v,i)=>close(v,expectedX[i],1e-8))&&rectangleX.y.every((v,i)=>close(v,initial.y[i])));
  await reset();await page.locator('#zoomAxes').selectOption('y');const rectangleY=await drag(.2,.25,.8,.75);check('Y-only rectangle preserves exact X bounds',rectangleY.x.every((v,i)=>v===initial.x[i])&&rectangleY.y.every((v,i)=>close(v,expectedY[i],1e-8)));
  await reset();await page.locator('#zoomAxes').selectOption('both');const canceled=await drag(.2,.25,.8,.75,'escape');check('Escape cancels an active drag without changing view',same(canceled,initial));
  const pointerCanceled=await drag(.2,.25,.8,.75,'pointer');check('Pointer cancellation leaves original view intact',same(pointerCanceled,initial));
  const tinyStart=await point(.4,.4);await page.mouse.move(tinyStart.x,tinyStart.y);await page.mouse.down();await page.mouse.move(tinyStart.x+3,tinyStart.y+3);await page.mouse.up();check('Sub-six-pixel drag does not change ranges',same(await bounds(),initial));
  await wheel(-120);const center=await point(.5,.5);await page.mouse.dblclick(center.x,center.y);check('Double-click resets full X and Auto Y',same(await bounds(),initial));
  await page.locator('#yMin').fill('-5');await page.locator('#yMax').fill('25');await page.locator('#applyYRange').click();check('Manual Y controls preserve X and apply exact bounds',same(await bounds(),{x:initial.x,y:[-5,25]}));
  await page.locator('#zoomAxes').selectOption('x');await wheel(-120);check('X-only wheel preserves explicit manual Y bounds',(await bounds()).y.every((v,i)=>v===[-5,25][i]));
  const resizeBefore=await bounds();await page.setViewportSize({width:1300,height:950});await page.evaluate(()=>new Promise(requestAnimationFrame));check('Resizing preserves fixed manual Y and selected X bounds',same(await bounds(),resizeBefore));await page.setViewportSize({width:1500,height:1100});await page.evaluate(()=>new Promise(requestAnimationFrame));
  const changedX=(await bounds()).x;await page.locator('#autoYRange').click();check('Auto Y does not reset the selected X range',(await bounds()).x.every((v,i)=>v===changedX[i]));
  check('Reset view restores original full bounds',same(await reset(),initial));
  await wheel(-120);const tiny=await selectChart(imported.charts[1].id);check('Changing measurements resets X and removes the prior explicit Y',tiny.x[0]===100&&tiny.x[1]===300&&tiny.y[0]>.00045&&tiny.y[1]<.00046);
  await page.locator('#zoomAxes').selectOption('y');const tinyAfter=await wheel(-120,.4,.6),tinyAnchor=tiny.y[1]-wheelPoint.fy*(tiny.y[1]-tiny.y[0]),tinyAnchorAfter=tinyAfter.y[1]-wheelPoint.fy*(tinyAfter.y[1]-tinyAfter.y[0]);
  check('Tiny Vrms wheel zoom remains finite, anchored and visible',tinyAfter.y.every(Number.isFinite)&&tinyAfter.y[1]>tinyAfter.y[0]&&Math.abs(tinyAnchor-tinyAnchorAfter)<1e-14&&(tinyAfter.y[1]-tinyAfter.y[0])<(tiny.y[1]-tiny.y[0]));
  const zero=await selectChart(imported.charts[2].id);await page.locator('#zoomAxes').selectOption('y');const zeroAfter=await wheel(-120,.5,.5);check('Zero-valued series can zoom with finite nonzero Y span',zeroAfter.y.every(Number.isFinite)&&zeroAfter.y[0]<0&&zeroAfter.y[1]>0&&zeroAfter.y[1]-zeroAfter.y[0]<zero.y[1]-zero.y[0]);
  await selectChart(imported.charts[0].id);await page.locator('#data .page-heading').scrollIntoViewIfNeeded();const outsideBounds=await bounds(),heading=await page.locator('#data .page-heading').boundingBox();await page.mouse.move(heading.x+heading.width/2,heading.y+heading.height/2);await page.mouse.wheel(0,300);await page.evaluate(()=>new Promise(requestAnimationFrame));check('Wheel outside the canvas does not change measurement ranges',same(await bounds(),outsideBounds));
  check('Mouse interactions never mutate persisted workspace records',digest(await workspace())===storedBefore);
  check('Saved report snapshot remains unchanged through all view interactions',digest(await api('/api/reports/'+report.id))===digest(snapshot));
  for(let i=0;i<fixture.charts.length;i++)check('Stored source series remains exact for '+fixture.charts[i].title,digest((await api('/api/charts/'+imported.charts[i].id)).series)===digest(fixture.charts[i].series));
  await page.reload();await page.waitForFunction(()=>window.PortableAPI?.request);await page.evaluate(async()=>{await PortableAPI.ready;});check('View interactions preserve source data and snapshots after reload',digest(await workspace())===storedBefore);
  check('Zoom workflow remains offline without JavaScript errors',network.length===0&&errors.length===0);
  await writeFile(path.join(root,'docs/browser-zoom-qa.json'),JSON.stringify({date:'2026-10-22',environment:'file:// offline Chrome; temporary profile and synthetic zero/null/tiny-Vrms fixtures',checks,errors,network},null,2)+'\n');process.stdout.write(JSON.stringify({checks:checks.length,errors,network},null,2)+'\n');
}catch(error){process.stderr.write(JSON.stringify({completedChecks:checks.length,lastCheck:checks.at(-1),errors},null,2)+'\n');throw error;}finally{if(context)await context.close();await rm(temporary,{recursive:true,force:true});}
