// Real stdio/loopback security acceptance. Synthetic browser responses; isolated broker only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {request as rawRequest} from 'node:http';
import {mkdtemp,readFile,writeFile,stat,mkdir,rm} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await mkdtemp(path.join(os.tmpdir(),'cry7574-mcp-server-'));
const stateDir=path.join(temporary,'state'),checks=[],pending=new Map(),output=[],stderr=[];
const child=spawn(process.execPath,[path.join(root,'mcp/server.mjs')],{env:{...process.env,CRY7574_MCP_STATE_DIR:stateDir,CRY7574_MCP_PORT:'0',CRY7574_MCP_TOOL_TIMEOUT_MS:'700'},stdio:['pipe','pipe','pipe']});
let nextId=0,connection;
createInterface({input:child.stdout}).on('line',line=>{output.push(line);let message;try{message=JSON.parse(line);}catch{return;}if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}});
child.stderr.on('data',chunk=>stderr.push(String(chunk)));
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const rpc=(method,params)=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('QA request timed out: '+method));},7000);pending.set(id,message=>{clearTimeout(timer);resolve(message);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
const tool=(name,args={})=>rpc('tools/call',{name,arguments:args});
const result=message=>JSON.parse(message.result.content[0].text);
async function http(route,body={},headers={},method='POST',raw){return fetch(connection.url+route,{method,headers:{Authorization:'Bearer '+connection.token,'Content-Type':'application/json',...headers},...(method==='GET'?{}:{body:raw??JSON.stringify(body)}),signal:AbortSignal.timeout(4000)});}
async function body(route,args,headers={}){const response=await http(route,args,headers);return {status:response.status,data:await response.json()};}
async function connect(clientId){return body('/bridge/connect',{clientId,appName:'Synthetic MCP security QA',url:'file:///synthetic-test-only.html'});}
async function poll(sessionId){const reply=await body('/bridge/poll',{sessionId});assert.equal(reply.status,200);return reply.data.command;}
try{
 for(let i=0;i<100;i++){try{connection=JSON.parse(await readFile(path.join(stateDir,'connection.json'),'utf8'));break;}catch{await new Promise(resolve=>setTimeout(resolve,50));}}
 assert.ok(connection,'Broker connection file exists');
 check('Broker binds an ephemeral loopback URL with a private token',/^http:\/\/127\.0\.0\.1:\d+$/.test(connection.url)&&/^[a-f0-9]{64}$/.test(connection.token));
 check('Connection directory/file permissions are 0700/0600',((await stat(stateDir)).mode&0o777)===0o700&&((await stat(path.join(stateDir,'connection.json'))).mode&0o777)===0o600);
 check('Uninitialized stdio tool access rejects',(await rpc('tools/list')).error?.code===-32002);
 const initialized=await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'Independent disposable QA',version:'1'}});
 check('Real stdio initialize negotiates the current MCP version',initialized.result.protocolVersion==='2025-11-25'&&initialized.result.serverInfo.name==='cry7574');
 check('Earlier MCP protocol version remains compatible',(await rpc('initialize',{protocolVersion:'2025-03-26'})).result.protocolVersion==='2025-03-26');
 const listed=(await rpc('tools/list')).result.tools;
 check('Tools list exposes exactly the 17 allowlisted operations',listed.length===17&&new Set(listed.map(t=>t.name)).size===17);
 check('Delete schemas contain no password or bypass arguments',listed.filter(t=>t.name.startsWith('request_delete_')).every(t=>t.annotations.destructiveHint&&t.inputSchema.additionalProperties===false&&!JSON.stringify(t.inputSchema).includes('password')));
 check('Unknown JSON-RPC methods and tools reject',(await rpc('run/arbitrary')).error?.code===-32601&&(await tool('execute_javascript',{code:'1'})).error?.code===-32602);
 for(const[name,args]of [['get_record',{id:'fixture',limit:1001}],['get_record',{id:'fixture',seriesIndex:-1}],['show_plot',{recordIds:['same','same']}],['update_task',{id:'task',expectedRevision:'1',changes:{title:'Invalid'}}],['create_task',{title:'Unowned'}],['request_delete_task',{id:'task',password:'CRYSOUND'}],['update_record',{id:'record',changes:{series:[]}}]])check('MCP schema rejects malformed or bypass arguments: '+name,(await tool(name,args)).error?.code===-32602);
 check('Initial connection status reports disconnected without exposing its token',result(await tool('get_connection_status')).connected===false);
 check('Wrong bearer token rejects',(await http('/mcp/status',{}, {Authorization:'Bearer '+ '0'.repeat(64)})).status===401);
 check('Non-ASCII same-length auth rejects without crashing the daemon',(await http('/mcp/status',{}, {Authorization:'Bearer '+ '0'.repeat(63)+'é'})).status===401&&(await http('/mcp/status')).status===200);
 const rawHostStatus=await new Promise((resolve,reject)=>{const req=rawRequest(connection.url+'/mcp/status',{method:'POST',headers:{Host:'127.0.0.1:1',Authorization:'Bearer '+connection.token,'Content-Type':'application/json'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end('{}');});check('Wrong Host header rejects',rawHostStatus===403);
 for(const origin of ['https://untrusted.example','http://localhost:7574','file://'])check('Unapproved Origin rejects: '+origin,(await http('/mcp/status',{}, {Origin:origin})).status===403);
 check('Authenticated file-null and explicit loopback origins are accepted',(await http('/mcp/status',{}, {Origin:'null'})).status===200&&(await http('/mcp/status',{}, {Origin:'http://127.0.0.1:7574'})).status===200);
 const preflight=await http('/bridge/connect',{}, {Origin:'null','Access-Control-Request-Method':'POST',Authorization:''},'OPTIONS');
 check('File-origin preflight permits only the expected POST flow',preflight.status===204&&preflight.headers.get('Access-Control-Allow-Origin')==='null');
 check('Wrong-origin preflight and authenticated GET reject',(await http('/bridge/connect',{}, {Origin:'https://untrusted.example','Access-Control-Request-Method':'POST'},'OPTIONS')).status===403&&(await http('/mcp/status',{}, {},'GET')).status===401);
 check('Invalid JSON and non-JSON content type reject',(await http('/mcp/status',{}, {},'POST','{broken')).status===400&&(await http('/mcp/status',{}, {'Content-Type':'text/plain'})).status===415);
 check('Unknown authenticated bridge operations reject',(await http('/mcp/dispatch',{operation:'arbitrary_script',args:{}})).status===400);
 check('Tools cannot operate without a connected browser',(await tool('get_workspace_summary')).result.isError===true);
 const first=await connect('first-synthetic-browser'),session=first.data.sessionId;
 check('A single browser session connects',first.status===200&&typeof session==='string');
 check('A second browser cannot silently take over',(await connect('second-synthetic-browser')).status===409);
 check('Wrong-session polling rejects',(await http('/bridge/poll',{sessionId:'wrong'})).status===409);
 const requested=tool('list_records',{offset:4,limit:3}),command=await poll(session);
 check('Real stdio tool arguments reach one allowlisted browser command',command.operation==='list_records'&&command.args.offset===4&&command.args.limit===3);
 check('Spoofed command result cannot resolve another request',(await http('/bridge/result',{sessionId:session,id:'wrong-id',result:{records:['unsafe']}})).status===409);
 const sent=await body('/bridge/result',{sessionId:session,id:command.id,result:{records:[],total:0}});
 check('Matching browser result is returned through real stdio',sent.status===200&&result(await requested).total===0);
 check('Replayed result rejects',(await http('/bridge/result',{sessionId:session,id:command.id,result:{records:['replayed']}})).status===409);
 const uncertain=tool('create_task',{title:'Synthetic uncertain write',owner:'Fixture owner'}),writeCommand=await poll(session),timed=await uncertain;
 check('Delivered write times out explicitly without automatic retry',writeCommand.operation==='create_task'&&timed.result.isError===true&&/uncertain/i.test(timed.result.content[0].text)&&result(await tool('get_connection_status')).connected===false);
 check('Late results after uncertain timeout reject',(await http('/bridge/result',{sessionId:session,id:writeCommand.id,result:{id:'late-task'}})).status===409);
 const again=await connect('third-synthetic-browser'),nextSession=again.data.sessionId;
 const updating=tool('update_task',{id:'synthetic-task',expectedRevision:1,changes:{title:'Synthetic change'}}),updateCommand=await poll(nextSession);
 await http('/bridge/disconnect',{sessionId:nextSession});const disconnected=await updating;
 check('Disconnect cancels one active mutation and reports an uncertain outcome',updateCommand.operation==='update_task'&&disconnected.result.isError===true&&/uncertain/i.test(disconnected.result.content[0].text)&&!result(await tool('get_connection_status')).connected);
 const connected=await connect('import-synthetic-browser'),importSession=connected.data.sessionId,source=Buffer.from('Frequency,Value\n100,0\n200,\n400,1.23456789012345\n'),filePath=path.join(temporary,'Synthetic import.csv');await writeFile(filePath,source);
 const importing=tool('import_file',{filePath,libraryId:'synthetic-library'}),importCommand=await poll(importSession);
 check('Import reads only selected file bytes and transfers exact source payload',importCommand.operation==='import_file'&&importCommand.args.name==='Synthetic import.csv'&&Buffer.from(importCommand.args.contentBase64,'base64').equals(source)&&!('filePath'in importCommand.args));
 await http('/bridge/result',{sessionId:importSession,id:importCommand.id,result:{source:{id:'synthetic-source'},charts:[{id:'synthetic-chart'}]}});check('File import result returns without fabricated extra measurements',result(await importing).charts.length===1);
 check('Relative or unsupported file paths fail before dispatch',(await tool('import_file',{filePath:'relative.csv',libraryId:'synthetic-library'})).result.isError&&(await tool('import_file',{filePath:path.join(temporary,'secret.env'),libraryId:'synthetic-library'})).result.isError);
 await mkdir(path.join(temporary,'not-a-file.csv'));check('Import rejects a directory masquerading as CSV',(await tool('import_file',{filePath:path.join(temporary,'not-a-file.csv'),libraryId:'synthetic-library'})).result.isError);
 const maxBytes=Buffer.alloc(20*1024*1024,32),maxPath=path.join(temporary,'Synthetic exact20MiB.csv');await writeFile(maxPath,maxBytes);const maxImport=tool('import_file',{filePath:maxPath,libraryId:'synthetic-library'}),maxCommand=await poll(importSession);check('Exactly20MiB file crosses stdio and loopback dispatch without the old2MiB rejection',maxCommand.operation==='import_file'&&Buffer.from(maxCommand.args.contentBase64,'base64').equals(maxBytes));await http('/bridge/result',{sessionId:importSession,id:maxCommand.id,result:{source:{id:'max-source'},charts:[{id:'max-chart'}]}});check('Exactly20MiB transport returns the synthetic browser acknowledgement',result(await maxImport).source.id==='max-source');await writeFile(path.join(temporary,'Synthetic over20MiB.csv'),Buffer.alloc(20*1024*1024+1));check('A file one byte above20MiB rejects before browser dispatch',(await tool('import_file',{filePath:path.join(temporary,'Synthetic over20MiB.csv'),libraryId:'synthetic-library'})).result.isError);await http('/bridge/disconnect',{sessionId:importSession});check('Token never appears in stdio results, logs or source-transfer payload',!output.join('\n').includes(connection.token)&&!stderr.join('\n').includes(connection.token)&&!JSON.stringify(importCommand).includes(connection.token));
 const previousConnection=connection;process.kill(previousConnection.pid,'SIGTERM');await new Promise(resolve=>setTimeout(resolve,150));const restarted=result(await tool('get_connection_status'));connection=JSON.parse(await readFile(path.join(stateDir,'connection.json'),'utf8'));check('The same stdio process restarts a stopped broker without reconnecting a browser',restarted.connected===false&&connection.pid!==previousConnection.pid&&connection.token!==previousConnection.token);check('Restarted broker credentials remain absent from stdio and logs',!output.join('\n').includes(connection.token)&&!stderr.join('\n').includes(connection.token));check('Every stdout line remains valid JSON-RPC without log contamination',output.every(line=>{try{return JSON.parse(line).jsonrpc==='2.0';}catch{return false;}}));
 await writeFile(path.join(root,'docs/browser-mcp-server-qa.json'),JSON.stringify({date:'2026-10-23',environment:'real stdio + ephemeral authenticated loopback broker; synthetic browser/session responses; no user workspace',sources:Object.fromEntries(await Promise.all(['mcp/server.mjs','mcp/tools.mjs'].map(async file=>[file,createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')]))),checks},null,2)+'\n');process.stdout.write(JSON.stringify({checks:checks.length},null,2)+'\n');
}catch(error){process.stderr.write(JSON.stringify({completedChecks:checks.length,lastCheck:checks.at(-1)},null,2)+'\n');throw error;}finally{child.stdin.end();child.kill('SIGTERM');if(connection?.pid)try{process.kill(connection.pid,'SIGTERM');}catch{}await new Promise(resolve=>setTimeout(resolve,150));await rm(temporary,{recursive:true,force:true});}
