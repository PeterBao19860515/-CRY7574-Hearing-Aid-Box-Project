/* Shared display-only numeric formatting. No measurement values are rewritten. */
(function(){'use strict';
let decimalPlaces='auto';
const valid=value=>value==='auto'||Number.isInteger(value)&&value>=0&&value<=9;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function format(value,options={}){if(value===null)return 'Missing';if(typeof value!=='number'||!Number.isFinite(value))return String(value);if(Object.is(value,-0))value=0;const places=options.decimalPlaces??decimalPlaces;if(!valid(places))throw Error('Decimal places must be Auto or an integer from 0 to 9.');let result;if(places!=='auto')result=value.toFixed(places);else if(options.axis){const span=options.span??1;if(Math.abs(value)<Math.max(Math.abs(span)*1e-10,1e-14))value=0;result=value===0?'0':Math.abs(value)>=1e7||Math.abs(value)<1e-4?value.toExponential(2):Math.abs(span)<.1?value.toPrecision(3):value.toFixed(Math.abs(span)<10?2:1);}else result=String(value);return /^-0(?:\.0+)?$/.test(result)?result.slice(1):result;}
function cell(value,options={}){if(value===null)return '<span class="missing">Missing</span>';const formatted=format(value,options),roundedZero=value!==0&&Number(formatted)===0;return '<span class="display-number'+(roundedZero?' rounded-zero':'')+'" title="Original precision: '+escape(String(Object.is(value,-0)?0:value))+'" data-original="'+escape(String(Object.is(value,-0)?0:value))+'">'+(roundedZero?'≈':'')+escape(formatted)+'</span>';}
window.MeasurementDisplay={format,cell,valid,getDecimalPlaces:()=>decimalPlaces,setDecimalPlaces:value=>{if(!valid(value))throw Error('Invalid decimal display setting');decimalPlaces=value;}};
})();
