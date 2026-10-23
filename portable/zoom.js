/* Axis-aware view interaction. Measurement arrays remain immutable. */
(function(){
'use strict';
const canvas=$('#chartCanvas'),box=$('#zoomSelection');
let manualY=null,viewId=null,drag=null;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function stopDrag(){if(!drag)return;const pointer=drag.pointerId;drag=null;box.hidden=true;if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);}
function axisMode(){return $('#zoomAxes').value;}
function xBounds(lo,hi){const span=clamp(hi-lo,1e-6,24);lo=clamp(lo,-9,15-span);return [10**lo,10**(lo+span)];}
function yBounds(lo,hi){const center=(lo+hi)/2,minSpan=Math.max(1e-12,Math.abs(center)*Number.EPSILON*128),span=clamp(hi-lo,minSpan,2e15);lo=clamp(lo,-1e15,1e15-span);return [lo,lo+span];}
function syncControls(){if(!chart||!geometry)return;$('#xMin').value=String(range[0]);$('#xMax').value=String(range[1]);$('#yMin').value=String(geometry.lo);$('#yMax').value=String(geometry.hi);$('#yRangeUnit').textContent=chart.unit;$('#zoomState').textContent='X: '+range[0].toPrecision(5)+'–'+range[1].toPrecision(5)+' Hz · Y: '+geometry.lo.toPrecision(5)+'–'+geometry.hi.toPrecision(5)+' '+chart.unit+' · '+(manualY?'Fixed Y view':'Auto Y');}
const render=__ZOOM_RENDER__;
const previousDraw=draw;window.removeEventListener('resize',previousDraw);
draw=function(){if(chart&&chart.id!==viewId){stopDrag();manualY=null;viewId=chart.id;}render();syncControls();};
window.addEventListener('resize',()=>{stopDrag();draw();});
function resetView(){if(!chart)return;stopDrag();range=[chart.xmin,chart.xmax>chart.xmin?chart.xmax:chart.xmin*10];manualY=null;draw();}
function locationInPlot(event,strict=true,g=geometry){if(!g)return null;const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;if(strict&&(x<g.p.l||x>g.w-g.p.r||y<g.p.t||y>g.h-g.p.b))return null;return {x:clamp(x,g.p.l,g.w-g.p.r),y:clamp(y,g.p.t,g.h-g.p.b)};}
function fractions(point,g=geometry){return {x:(point.x-g.p.l)/(g.w-g.p.l-g.p.r),y:1-(point.y-g.p.t)/(g.h-g.p.t-g.p.b)};}
canvas.addEventListener('wheel',event=>{if(!chart||!geometry||drag)return;const point=locationInPlot(event);if(!point)return;event.preventDefault();const factor=Math.exp(clamp(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?geometry.h:1)*.0015,-1.2,1.2));if(factor===1)return;const f=fractions(point),mode=axisMode(),oldY=[geometry.lo,geometry.hi];if(mode==='both'||mode==='x'){const lo=Math.log10(range[0]),hi=Math.log10(range[1]),anchor=lo+f.x*(hi-lo),span=clamp((hi-lo)*factor,1e-6,24);range=xBounds(anchor-f.x*span,anchor+(1-f.x)*span);}if(mode==='both'||mode==='y'){const anchor=oldY[0]+f.y*(oldY[1]-oldY[0]),span=(oldY[1]-oldY[0])*factor;manualY=yBounds(anchor-f.y*span,anchor+(1-f.y)*span);}else if(!manualY)manualY=oldY;draw();},{passive:false});
function showBox(){if(!drag)return;const g=drag.g,mode=drag.mode,left=mode==='y'?g.p.l:Math.min(drag.start.x,drag.end.x),right=mode==='y'?g.w-g.p.r:Math.max(drag.start.x,drag.end.x),top=mode==='x'?g.p.t:Math.min(drag.start.y,drag.end.y),bottom=mode==='x'?g.h-g.p.b:Math.max(drag.start.y,drag.end.y);Object.assign(box.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});box.hidden=false;}
canvas.addEventListener('pointerdown',event=>{if(event.button!==0||!chart||!geometry||drag)return;const point=locationInPlot(event);if(!point)return;event.preventDefault();canvas.focus({preventScroll:true});drag={pointerId:event.pointerId,start:point,end:point,mode:axisMode(),x:[...range],y:[geometry.lo,geometry.hi],g:{...geometry,p:{...geometry.p}}};canvas.setPointerCapture(event.pointerId);showBox();});
canvas.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.pointerId)return;drag.end=locationInPlot(event,false,drag.g);showBox();});
canvas.addEventListener('pointerup',event=>{if(!drag||event.pointerId!==drag.pointerId)return;drag.end=locationInPlot(event,false,drag.g);const d=drag,dx=Math.abs(d.end.x-d.start.x),dy=Math.abs(d.end.y-d.start.y);stopDrag();if(d.mode!=='y'&&dx<6||d.mode!=='x'&&dy<6)return;const a=fractions(d.start,d.g),b=fractions(d.end,d.g);if(d.mode!=='y'){const lo=Math.log10(d.x[0]),span=Math.log10(d.x[1])-lo;range=xBounds(lo+Math.min(a.x,b.x)*span,lo+Math.max(a.x,b.x)*span);}if(d.mode!=='x'){const span=d.y[1]-d.y[0];manualY=yBounds(d.y[0]+Math.min(a.y,b.y)*span,d.y[0]+Math.max(a.y,b.y)*span);}else if(!manualY)manualY=d.y;draw();});
canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',()=>{drag=null;box.hidden=true;});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();stopDrag();}});canvas.addEventListener('dblclick',event=>{if(locationInPlot(event)){event.preventDefault();resetView();}});
$('#resetRange').onclick=resetView;$('#zoomAxes').onchange=()=>{stopDrag();$('#zoomHint').textContent='Wheel: zoom '+(axisMode()==='both'?'X and Y':axisMode().toUpperCase()+' only')+' around the pointer · Drag: zoom to rectangle · Double-click: reset view · Esc: cancel drag';};
$('#applyYRange').onclick=()=>{const lo=Number($('#yMin').value),hi=Number($('#yMax').value);if(!$('#yMin').value.trim()||!$('#yMax').value.trim()||!Number.isFinite(lo)||!Number.isFinite(hi)||hi<=lo||lo< -1e15||hi>1e15){toast('Enter finite Y limits with maximum greater than minimum (within ±1e15).');return;}manualY=yBounds(lo,hi);draw();};$('#autoYRange').onclick=()=>{manualY=null;draw();};
for(const id of ['yMin','yMax'])$('#'+id).addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('#applyYRange').click();}});
$('#applyRange').onclick=()=>{const lo=Number($('#xMin').value),hi=Number($('#xMax').value);if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<1e-9||hi>1e15||hi<=lo){toast('Enter positive X limits from 1e-9 to 1e15, with maximum greater than minimum.');return;}range=xBounds(Math.log10(lo),Math.log10(hi));draw();};
canvas.setAttribute('aria-label','Measurement chart. Choose axes and use wheel or drag to zoom. Use X and Y numeric controls for equivalent access; left/right arrows inspect original samples.');
if(chart)draw();
})();
