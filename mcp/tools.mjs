// Explicit MCP surface. No arbitrary JavaScript, SQL, API routes or password arguments.
const string=(maxLength=200)=>({type:'string',maxLength}), id={type:'string',minLength:1,maxLength:100}, date={type:'string',maxLength:10,pattern:'^(|[0-9]{4}-[0-9]{2}-[0-9]{2})$'};
const integer=(minimum,maximum)=>({type:'integer',minimum,maximum});
const object=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const tags={type:'array',maxItems:30,items:{type:'string',minLength:1,maxLength:50}};
const page={offset:integer(0,10000),limit:integer(1,100)};
const task={title:{...string(),minLength:1},owner:{...string(100),minLength:1},startDate:date,dueDate:date,status:{enum:['Planned','In progress','Blocked','Complete']},percent:{type:'number',minimum:0,maximum:100},weight:{type:'number',minimum:.01,maximum:10000},notes:string(5000)};
const details={title:{...string(),minLength:1},testDate:date,testItem:string(100),notes:string(5000),tags,libraryId:id,hidden:{type:'boolean'}};
const define=(name,description,inputSchema,readOnlyHint=false,destructiveHint=false)=>({name,description,inputSchema,annotations:{readOnlyHint,destructiveHint,idempotentHint:readOnlyHint,openWorldHint:false}});
export const TOOLS=[
 define('get_connection_status','Check whether the local browser workspace is connected. Does not read measurements.',object(),true),
 define('get_workspace_summary','Read workspace counts, recorded project progress, display settings and capacity. Reference measurements are not CRY7574 certification.',object(),true),
 define('list_libraries','List existing measurement and specification Libraries.',object(),true),
 define('create_library','Create a Library; purpose is measurements or specifications. Does not invent measurement data.',object({name:{...string(100),minLength:1},description:string(500),purpose:{enum:['measurements','specifications']}},['name'])),
 define('list_records','Search measurement metadata by title, notes, source, tag or Library. Values and original files are excluded; results are paginated.',object({...page,query:string(500),libraryId:id,tag:string(50),visibility:{enum:['visible','hidden','all']}}),true),
 define('get_record','Read record metadata and one original series page. No interpolation, rounding or source-file bytes. Defaults: seriesIndex 0, offset 0, limit 100; max 1000 points.',object({id,seriesIndex:integer(0,31),offset:integer(0,200000),limit:integer(1,1000)},['id']),true),
 define('update_record','Edit title, actual test date, test item, tags, notes, Library or visibility. Original measurement numbers and source bytes cannot be edited.',object({id,changes:object(details)},['id','changes'])),
 define('list_tasks','Search Schedule tasks by title, owner, notes or status. Includes current revision for guarded updates.',object({...page,query:string(500),status:{enum:['all','Planned','In progress','Blocked','Complete']}}),true),
 define('create_task','Create a Schedule task with an explicitly supplied owner. Dates remain unknown unless supplied. Planned requires 0%; Complete requires 100%.',object(task,['title','owner'])),
 define('update_task','Update a Schedule task using the expectedRevision from list_tasks. A stale revision is rejected; do not automatically retry an uncertain write.',object({id,expectedRevision:integer(1,Number.MAX_SAFE_INTEGER),changes:object(task)},['id','expectedRevision','changes'])),
 define('list_specifications','List saved specification definitions, units and availability. Does not automatically apply any specification.',object(page),true),
 define('show_plot','Open selected original records in Plot view (1–12, matching units, at most 32 series). Changes the visible view only.',object({recordIds:{type:'array',minItems:1,maxItems:12,uniqueItems:true,items:id}},['recordIds'])),
 define('show_schedule','Open the primary Schedule page in the connected browser.',object()),
 define('request_delete_task','OPEN a browser confirmation for deleting one task. This tool never deletes directly. User must confirm and type CRYSOUND in the browser; query later to check outcome.',object({id},['id']),false,true),
 define('request_delete_records','OPEN the existing reviewed deletion dialog for original records. User must confirm and type CRYSOUND in the browser. This response is not evidence of deletion.',object({ids:{type:'array',minItems:1,maxItems:5000,uniqueItems:true,items:id}},['ids']),false,true),
 define('request_delete_library','OPEN the existing reviewed Library deletion dialog. User reviews all affected records/media and types CRYSOUND in the browser. Does not delete immediately.',object({id},['id']),false,true),
 define('import_file','Import one explicitly selected local XLSX/CSV/JSON file (max 20 MiB) into a Library. Reads that file only, validates a preview, then saves unchanged source bytes. Use actual AP source units. Timeout outcomes are uncertain: check records before retrying.',object({filePath:{type:'string',minLength:1,maxLength:4096},libraryId:id,tags,testDate:date,unit:string(50),title:string(),testItem:string(100),notes:string(5000)},['filePath','libraryId']))
];
export function validate(schema,value,path='arguments'){
 if(schema.enum&&!schema.enum.includes(value))throw Error(path+' must be one of '+schema.enum.join(', '));
 if(schema.type==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error(path+' must be an object');
  for(const k of Object.keys(value))if(!Object.hasOwn(schema.properties,k))throw Error(path+' has unknown field: '+k);
  for(const k of schema.required||[])if(!Object.hasOwn(value,k))throw Error(path+' requires '+k);
  for(const[k,v]of Object.entries(value))validate(schema.properties[k],v,path+'.'+k);
 }else if(schema.type==='array'){
  if(!Array.isArray(value)||value.length<(schema.minItems??0)||value.length>(schema.maxItems??Infinity))throw Error(path+' has invalid array length');
  if(schema.uniqueItems&&new Set(value.map(v=>JSON.stringify(v))).size!==value.length)throw Error(path+' must contain unique values');
  value.forEach((v,i)=>validate(schema.items,v,path+'['+i+']'));
 }else if(schema.type==='string'){
  if(typeof value!=='string'||value.length<(schema.minLength??0)||value.length>(schema.maxLength??Infinity)||schema.pattern&&!new RegExp(schema.pattern).test(value))throw Error(path+' has invalid text');
 }else if(schema.type==='integer'||schema.type==='number'){
  if(typeof value!=='number'||!Number.isFinite(value)||schema.type==='integer'&&!Number.isSafeInteger(value)||value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity))throw Error(path+' has invalid number');
 }else if(schema.type==='boolean'&&typeof value!=='boolean')throw Error(path+' must be a boolean');
}
