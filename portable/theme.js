/* Device appearance only. Never stored in measurement data, backups or reports. */
(function(){'use strict';
const key='CRY7574.appearance.theme',control=document.getElementById('appearanceTheme'),status=document.getElementById('appearanceStatus');
let current='light';
try{const saved=localStorage.getItem(key);if(saved==='dark'||saved==='light')current=saved;}catch{/* Light remains usable when storage is blocked. */}
function palette(){return current==='dark'?{background:'#1c202b',minor:'#2b3342',secondary:'#3c4759',major:'#5b687e',frame:'#99a8bd',tickMinor:'#64748b',tick:'#b4c1d4',text:'#e6eaf2',textSecondary:'#c3cddd',axisText:'#d1d9e6',cursor:'#c5b4e4',marker:'#1c202b',specText:'#d1c6e2'}:{background:'#ffffff',minor:'#e9edf1',secondary:'#d3d9e0',major:'#b1bac6',frame:'#818c9b',tickMinor:'#b8c0ca',tick:'#7b8796',text:'#465363',textSecondary:'#647182',axisText:'#526071',cursor:'#9d8cab',marker:'white',specText:'#635169'};}
function apply(value,persist=false){
  if(value!=='light'&&value!=='dark')return;
  current=value;document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;
  if(control)control.value=value;
  if(persist){try{localStorage.setItem(key,value);if(status){status.hidden=true;status.textContent='';}}catch{if(status){status.textContent='Theme changed for this session. Browser storage is unavailable.';status.hidden=false;}}}
  window.dispatchEvent(new CustomEvent('cry-theme-change',{detail:{theme:current}}));
}
window.DeviceTheme={get:()=>current,palette};
if(control)control.onchange=()=>apply(control.value,true);
window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue==='dark'?'dark':'light');});
apply(current);
})();
