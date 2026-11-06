// Device appearance QA: synthetic records, disposable profiles, no user browser or network.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const target=process.env.CRY7574_QA_HTML||path.join(root,'dist/CRY7574 Hearing Aid Box Measurement Manage Software.html');
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-theme-'));
const checks=[],errors=[],network=[],contrast=[];
const sha=v=>createHash('sha256').update(v).digest('hex');
const contrastRatio=(hexA,hexB)=>{const lum=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const a=lum(hexA),b=lum(hexB);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
let context,page;
async function launch(profile='profile',blocked=false){
  context=await chromium.launchPersistentContext(path.join(temporary,profile),{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,acceptDownloads:true,viewport:{width:1500,height:1100}});
  await context.setOffline(true);
  context.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
  if(blocked)await context.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Synthetic storage disabled','SecurityError');};Storage.prototype.setItem=function(){throw new DOMException('Synthetic storage disabled','SecurityError');};});
  page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(target).href);await ready();
}
async function ready(){await page.waitForFunction(()=>window.WorkspaceApp?.getState()&&document.querySelector('#appearanceTheme')?.onchange);}
const api=(route,method='GET',body)=>page.evaluate(({route,method,body})=>PortableAPI.request(route,method==='GET'?undefined:{method,body}),{route,method,body});
const workspace=()=>page.evaluate(async()=>{const r=indexedDB.open(PortableAPI.storageName);const db=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspace'),req=tx.objectStore('workspace').get('primary');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}});
async function theme(value){await page.locator('#appearanceTheme').selectOption(value);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function refresh(){await page.evaluate(()=>WorkspaceApp.refresh(true));}
async function audit(label){
  const results=await page.evaluate(()=>{
    const rgba=c=>{const values=c.match(/[\d.]+/g)?.map(Number)||[];return values.length>=3?[values[0],values[1],values[2],values[3]??1]:[0,0,0,0];};
    const blend=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
    const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const background=el=>{const chain=[];for(let e=el;e;e=e.parentElement)chain.unshift(e);return chain.reduce((color,e)=>blend(rgba(getComputedStyle(e).backgroundColor),color),[255,255,255,1]);};
    const out=[];
    for(const el of document.querySelectorAll('h1,h2,h3,p,small,label,button,td,th,summary,.micro,.tag,.classification,.note-preview,.record-detail,.eyebrow,.trace-style-status,input,textarea,select,div,span,a,dt,dd,li,code')){
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      if(!r.width||!r.height||r.bottom<0||r.top>innerHeight||el.disabled||Number(s.opacity)<1||s.visibility==='hidden'||el.closest('[hidden]'))continue;
      const text=el.matches('input,textarea,select')?el.value:[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
      if(!text)continue;
      const bg=background(el),fg=blend(rgba(s.color),bg),a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      out.push({selector:el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+String(el.className||'').replaceAll(' ','.'),text:text.slice(0,65),ratio:+ratio.toFixed(3),foreground:s.color,background:bg.slice(0,3)});
    }
    for(const el of document.querySelectorAll('input[placeholder],textarea[placeholder]')){const r=el.getBoundingClientRect();if(!r.width||!r.height||r.top>innerHeight||r.bottom<0||el.value||el.closest('[hidden]'))continue;const style=getComputedStyle(el,'::placeholder'),color=rgba(style.color);color[3]*=Number(style.opacity);const bg=background(el),fg=blend(color,bg),a=luminance(fg),b=luminance(bg);out.push({selector:(el.id?'#'+el.id:el.name)+'::placeholder',text:el.placeholder,ratio:+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(3),foreground:style.color,background:bg.slice(0,3)});}
    return out;
  });
  contrast.push({label,results});
  const low=results.filter(r=>r.ratio<4.49);
  if(low.length)console.log(JSON.stringify({contrastFailures:label,low}));
  check(label+' body, muted text and controls meet 4.5:1 contrast',results.length>5&&low.length===0);
}
async function closeDialog(id){await page.locator(id+' .close').first().click();}
async function openBackups(){await page.locator('#openTools').click();await page.locator('.tool-tab[data-tool=backups]').click();}
try{
  await launch();
  check('Legacy/no device preference starts Light',await page.locator('#appearanceTheme').inputValue()==='light');
  const initial=await workspace();
  const library=await api('/api/libraries','POST',{name:'Synthetic theme QA library'});
  const raw=Buffer.from('Frequency,Theme trace\n20,0\n200,\n2000,1.23456789012345\n20000,2\n');
  const imported=await api('/api/import','POST',{name:'Synthetic theme source.csv',format:'csv',unit:'Vrms',libraryId:library.id,contentBase64:raw.toString('base64'),notes:'Synthetic notes for dark reading; not real measurement evidence.'});
  const id=imported.charts[0].id;
  await api('/api/charts/'+id+'/trace-style','PATCH',{seriesIndex:0,color:'#19c9a5',lineStyle:'dash-dot',width:2.4});
  const report=await api('/api/reports','POST',{chartId:id,title:'Synthetic frozen pre-theme report'});
  const reportBefore=await api('/api/reports/'+report.id);
  const card=await api('/api/schedule-cards','POST',{title:'Synthetic dark project',notes:'Notes should remain readable'});
  await api('/api/tasks','POST',{title:'Synthetic task',owner:'Synthetic DRI',cardId:card.id,status:'In progress',percent:35,statusDetail:'Readable current status',notes:'No actual project claim'});
  await api('/api/plan-items','POST',{title:'Synthetic dated phase',owner:'Synthetic DRI',type:'Phase',startDate:'2030-01-01',dueDate:'2030-01-31',status:'Planned',percent:0});
  const pdf=JSON.parse(execFileSync('python3',[path.join(root,'tests/requirement_fixtures.py')],{encoding:'utf8'}))[0];
  const doc=await api('/api/requirements','POST',{...pdf,note:'Synthetic requirement notes'});
  await api('/api/settings','PATCH',{decimalPlaces:3});await refresh();
  const before=await workspace();
  await theme('dark');
  check('Appearance Dark is applied and stored locally',await page.evaluate(()=>document.documentElement.dataset.theme==='dark'&&localStorage.getItem('CRY7574.appearance.theme')==='dark'));
  check('Theme change leaves complete IndexedDB workspace byte-equivalent',same(await workspace(),before));
  check('Theme never enters persisted workspace settings',!('theme'in(await api('/api/settings'))));
  await assert.rejects(()=>api('/api/settings','PATCH',{theme:'dark'}));
  check('Unsupported settings theme injection rejects without mutation',same(await workspace(),before));
  await page.locator('#filterLibrary').selectOption(library.id);
  await audit('Dark Data workspace');
  await page.screenshot({path:path.join(root,'docs/theme-dark-data.png'),fullPage:false});
  await page.locator('.record-check[data-id="'+id+'"]').check();await page.locator('#editSelected').click();
  await audit('Dark metadata edit dialog');await page.screenshot({path:path.join(root,'docs/theme-dark-dialog.png'),fullPage:false});
  await closeDialog('#editDialog');
  await page.locator('#plotSelected').click();await page.locator('#plotCanvas').waitFor({state:'visible'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const viewBefore=await page.evaluate(()=>WorkspacePlot.getView());
  const canvas=await page.evaluate(()=>{const original=CanvasRenderingContext2D.prototype.fillText,texts=[];CanvasRenderingContext2D.prototype.fillText=function(...args){if(this.canvas.id==='plotCanvas')texts.push({text:String(args[0]),color:this.fillStyle});return original.apply(this,args);};try{WorkspacePlot.draw();return {texts,background:[...document.querySelector('#plotCanvas').getContext('2d').getImageData(2,2,1,1).data],view:WorkspacePlot.getView(),palette:DeviceTheme.palette()};}finally{CanvasRenderingContext2D.prototype.fillText=original;}});
  check('Dark plot canvas paints a solid dark background',same(canvas.background,[28,32,43,255]));
  check('Actual canvas axis text meets 4.5:1 contrast',canvas.texts.length>3&&canvas.texts.every(t=>contrastRatio(t.color,'#1c202b')>=4.5));
  check('Dark grid keeps distinct minor, secondary, major and frame strokes',new Set([canvas.palette.minor,canvas.palette.secondary,canvas.palette.major,canvas.palette.frame]).size===4);
  await theme('light');const lightView=await page.evaluate(()=>WorkspacePlot.getView());await theme('dark');
  check('Changing theme preserves exact plot bounds',same(lightView.x,canvas.view.x)&&same(lightView.y,canvas.view.y)&&same((await page.evaluate(()=>WorkspacePlot.getView())).x,canvas.view.x)&&same((await page.evaluate(()=>WorkspacePlot.getView())).y,canvas.view.y));
  const [pngDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#exportPlotPng').click()]);const pngBytes=await readFile(await pngDownload.path());
  const png=await page.evaluate(async base64=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),image=await createImageBitmap(new Blob([bytes],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let tracePixels=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]===25&&pixels[i+1]===201&&pixels[i+2]===165)tracePixels++;return {graph:[...ctx.getImageData(4,224,1,1).data],header:[...ctx.getImageData(4,4,1,1).data],tracePixels};},pngBytes.toString('base64'));
  check('PNG retains the dark graph, readable light report header and saved trace color',same(png.graph,[28,32,43,255])&&same(png.header,[255,255,255,255])&&png.tracePixels>15);
  await writeFile(path.join(root,'docs/theme-dark-export.png'),pngBytes);
  await page.evaluate(()=>scrollTo(0,0));await audit('Dark Plot workspace');
  check('Displayed curve retains explicit saved stroke color',await page.locator('.trace-swatch line').first().getAttribute('stroke')==='#19c9a5'&&(await api('/api/charts/'+id)).series[0].style.color==='#19c9a5');
  await page.screenshot({path:path.join(root,'docs/theme-dark-plot.png'),fullPage:false});
  await page.locator('#tabSchedule').click();await audit('Dark Schedule task board');
  await page.locator('#scheduleOverallPlan').click();await audit('Dark Overall Plan');
  await page.locator('#addPlanMilestone').click();await audit('Dark Overall Plan dialog');await closeDialog('#planDialog');
  await page.locator('#tabRequirement').click();await audit('Dark Requirement');
  await page.locator('[data-requirement-edit="'+doc.id+'"]').click();await audit('Dark Requirement edit dialog');await closeDialog('#requirementEditDialog');
  await theme('light');check('Light toggle changes page background without changing data',await page.evaluate(()=>document.documentElement.dataset.theme==='light')&&same(await workspace(),before));
  await theme('dark');await page.reload();await ready();
  check('Dark choice survives page reload',await page.locator('#appearanceTheme').inputValue()==='dark'&&await page.evaluate(()=>document.documentElement.dataset.theme==='dark'));
  check('Reload retains decimal/language and every original source/style/sample',same(await workspace(),before)&&(await api('/api/settings')).decimalPlaces===3&&(await api('/api/reports/'+report.id)).id===report.id&&same(await api('/api/reports/'+report.id),reportBefore));
  for(const width of[1100,390]){await page.setViewportSize({width,height:1100});await page.locator('#tabData').click();await page.evaluate(()=>new Promise(requestAnimationFrame));check('Appearance/header fits at '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'docs/theme-dark-'+width+'.png'),fullPage:false});}
  await page.setViewportSize({width:1500,height:1100});
  await openBackups();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportBackup').click()]);const backup=JSON.parse(await readFile(await download.path()));
  check('Full backup retains original bytes and excludes device theme',backup.data.sources.find(s=>s.id===imported.source.id).contentBase64===raw.toString('base64')&&backup.data.sources.find(s=>s.id===imported.source.id).sha256===sha(raw)&&!('theme'in backup.data.settings));
  page.once('dialog',dialog=>dialog.accept());await Promise.all([page.waitForEvent('load'),page.locator('#restoreBackupFile').setInputFiles({name:'Synthetic theme-independent backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))})]);await ready();
  check('Restoring normal/legacy backup preserves local Dark preference and records',await page.locator('#appearanceTheme').inputValue()==='dark'&&same((await workspace()).charts,before.charts)&&same((await workspace()).requirements,before.requirements));
  await context.close();context=null;await launch();
  check('Dark preference survives full browser restart',await page.locator('#appearanceTheme').inputValue()==='dark'&&await page.evaluate(()=>document.documentElement.dataset.theme==='dark'));
  await page.evaluate(()=>localStorage.setItem('CRY7574.appearance.theme','invalid-theme'));await page.reload();await ready();
  check('Invalid cached appearance safely defaults Light',await page.locator('#appearanceTheme').inputValue()==='light'&&await page.evaluate(()=>document.documentElement.dataset.theme==='light'));
  await theme('dark');await page.evaluate(()=>localStorage.removeItem('CRY7574.appearance.theme'));await page.reload();await ready();
  check('Cleared device preference safely defaults Light',await page.locator('#appearanceTheme').inputValue()==='light');
  await context.close();context=null;await launch('storage-blocked',true);
  check('Unavailable localStorage still opens Light without JavaScript error',await page.locator('#appearanceTheme').inputValue()==='light');
  await theme('dark');
  check('Unavailable localStorage still allows in-memory Dark and honest warning',await page.evaluate(()=>document.documentElement.dataset.theme==='dark')&&/unavailable|not saved|cannot|could not|unable/i.test(await page.locator('#appearanceStatus').innerText()));
  check('All theme QA remains offline with zero JavaScript errors',errors.length===0&&network.length===0);
  const artifact=await readFile(target),suffix=target.includes('dist'+path.sep)?'public':'private';
  await writeFile(path.join(root,'docs/browser-theme-'+suffix+'-qa.json'),JSON.stringify({date:'2026-10-28',environment:'offline file:// Chromium, temporary profiles, synthetic CSV/task/plan/PDF only',artifact:{size:artifact.length,sha256:sha(artifact)},checks,contrast,errors,network},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,artifact:{size:artifact.length,sha256:sha(artifact)},errors,network},null,2));
}catch(error){console.error(JSON.stringify({checks:checks.length,last:checks.at(-1),errors,network}));throw error;}finally{if(context)await context.close();await rm(temporary,{recursive:true,force:true});}
