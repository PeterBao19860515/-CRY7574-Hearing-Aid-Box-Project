/* Saved trace appearance is separate from immutable numeric samples. */
(function(){'use strict';
const colors=['#7445ce','#00a7ac','#df9540','#cd5d94','#4b83bd','#7e9d52','#a76fcb','#bd774f'];
const lines=['solid','dashed','dotted','dash-dot'];
function validate(style,partial=false){if(!style||typeof style!=='object'||Array.isArray(style))throw Error('Trace style must be an object');const keys=Object.keys(style);if(!keys.length||keys.some(k=>!['color','lineStyle','width'].includes(k))||!partial&&keys.length!==3)throw Error('Trace style accepts color, lineStyle and width only');const out={};if('color'in style){if(typeof style.color!=='string'||!/^#[0-9a-f]{6}$/i.test(style.color))throw Error('Trace color must use #RRGGBB');out.color=style.color.toLowerCase();}if('lineStyle'in style){if(!lines.includes(style.lineStyle))throw Error('Choose solid, dashed, dotted or dash-dot');out.lineStyle=style.lineStyle;}if('width'in style){if(typeof style.width!=='number'||!Number.isFinite(style.width)||style.width<.5||style.width>6)throw Error('Trace width must be from 0.5 to 6 pixels');out.width=style.width;}return out;}
function defaultStyle(recordId,index){let hash=0;for(const char of String(recordId||''))hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;return {color:colors[(hash+index)%colors.length],lineStyle:'solid',width:1.6};}
function dash(style){const line=typeof style==='string'?style:style?.lineStyle,width=typeof style==='object'&&Number.isFinite(style?.width)?style.width:0,gap=Math.max(4,width+2),long=Math.max(8,width*2);return ({solid:[],dashed:[long,gap],dotted:[2,gap],'dash-dot':[long,gap,2,gap]})[line]?.slice()||[];}
window.TraceAppearance={validate,defaultStyle,dash};
})();
