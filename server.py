#!/usr/bin/env python3
"""CRY7574 Hearing Aid Box Measurement Manage Software. Python standard library only."""
import argparse, base64, binascii, csv, hashlib, html, io, json, math, re, sqlite3, threading, uuid, zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote, quote

ROOT = Path(__file__).resolve().parent
LIMIT = 20 * 1024 * 1024
REFERENCE_LABEL = 'Reference data — Alpair 5G, not CRY7574 validation'
LOCK = threading.RLock()

def now(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def uid(): return uuid.uuid4().hex

def db():
    c = sqlite3.connect(DATA / 'workspace.sqlite3', timeout=15)
    c.row_factory = sqlite3.Row
    return c

def initialize():
    DATA.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.executescript('''CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,payload TEXT NOT NULL,raw BLOB NOT NULL);
        CREATE TABLE IF NOT EXISTS charts(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT,description TEXT);''')
        if not c.execute('SELECT 1 FROM tasks LIMIT 1').fetchone():
            for title,owner,weight in [('Confirm CRY7574 measurement requirements','Andy',20),('Approve product and interface design','Andy',15),('Implement data workspace and project tracking','Lucas',30),('Integrate CRY7574 test acquisition and metadata','Lucas',20),('Validate acceptance criteria and test evidence','Jams',15)]:
                t=dict(id=uid(),title=title,owner=owner,status='Planned',percent=0,weight=weight,dueDate='',notes='Planned work. Completion requires recorded evidence.',updatedAt=now())
                c.execute('INSERT INTO tasks VALUES(?,?)',(t['id'],json.dumps(t)))
    raw=(ROOT/'reference/Alpair5G_Anechoic_Test_Report_English.html').read_bytes()
    source=dict(id='reference',name='Alpair5G_Anechoic_Test_Report_English.html',kind='reference',format='html',size=len(raw),sha256=hashlib.sha256(raw).hexdigest(),createdAt='Provided reference',label=REFERENCE_LABEL)
    with db() as c:
        c.execute('INSERT OR IGNORE INTO sources VALUES(?,?,?)',('reference',json.dumps(source),raw))
        for chart in REFERENCE['charts']:
            chart=dict(chart,id='ref-'+chart['key'],sourceId='reference',kind='reference',label=REFERENCE_LABEL)
            c.execute('INSERT OR IGNORE INTO charts VALUES(?,?)',(chart['id'],json.dumps(chart,allow_nan=False)))

def chart_defaults(chart):
    return {**dict(testDate='',testItem='',notes='',updatedAt=''),**chart}

def records(table):
    with db() as c: values=[json.loads(r[0]) for r in c.execute('SELECT payload FROM '+table)]
    return [chart_defaults(v) for v in values] if table=='charts' else values
def record(table,id):
    with db() as c: r=c.execute('SELECT payload FROM '+table+' WHERE id=?',(id,)).fetchone()
    if not r: raise LookupError('Item not found')
    value=json.loads(r[0])
    return chart_defaults(value) if table=='charts' else value
def activity(c,text): c.execute('INSERT INTO activity(at,description) VALUES(?,?)',(now(),text))
def metadata(chart):
    return {**{k:v for k,v in chart.items() if k!='series'},'seriesCount':len(chart['series']),'pointCount':sum(len(s['values']) for s in chart['series'])}
def state():
    tasks=records('tasks'); charts=records('charts'); reports=records('reports')
    with db() as c: log=[dict(r) for r in c.execute('SELECT * FROM activity ORDER BY id DESC LIMIT 40')]
    weight=sum(t['weight'] for t in tasks)
    return dict(summary=dict(overallProgress=round(sum(t['percent']*t['weight'] for t in tasks)/weight,1) if weight else 0,referenceCharts=sum(c['kind']=='reference' for c in charts),importedCharts=sum(c['kind']=='imported' for c in charts),reports=len(reports),cry7574TestRuns=0,lastUpdated=max([t['updatedAt'] for t in tasks]+[r['createdAt'] for r in reports]+[s['createdAt'] for s in records('sources') if s['kind']=='imported']+[c['updatedAt'] for c in charts if c['updatedAt']],default=now())),tasks=tasks,charts=[metadata(c) for c in charts],sources=records('sources'),reports=[{k:v for k,v in r.items() if k!='chart'} for r in reports],activity=log,groups=REFERENCE['groups'])

def textfield(v,name,limit=1000,required=False):
    if not isinstance(v,str) or len(v)>limit or (required and not v.strip()): raise ValueError(name+' must be '+('nonempty ' if required else '')+'text (max '+str(limit)+' characters)')
    return v.strip()
def number(v,name,low,high):
    if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not low<=v<=high: raise ValueError(name+' is out of range')
    return v

def valid_task(data,old=None):
    if not isinstance(data,dict): raise ValueError('Task must be an object')
    allowed={'title','owner','status','percent','weight','dueDate','notes'}
    if set(data)-allowed: raise ValueError('Unknown task fields')
    t={**dict(title='',owner='Andy',status='Planned',percent=0,weight=1,dueDate='',notes=''),**(old or {}),**data}
    t['title']=textfield(t['title'],'title',200,True);t['notes']=textfield(t['notes'],'notes',5000)
    t['owner']=textfield(t['owner'],'owner',100,True)
    if t['status'] not in ['Planned','In progress','Blocked','Complete']:raise ValueError('Invalid status')
    number(t['percent'],'percent',0,100);number(t['weight'],'weight',0.01,10000)
    if (t['status']=='Planned' and t['percent']!=0) or (t['status']=='Complete' and t['percent']!=100):raise ValueError('Planned tasks require 0%; Complete tasks require 100%')
    t['dueDate']=textfield(t['dueDate'],'dueDate',10)
    if t['dueDate']:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',t['dueDate']):raise ValueError('dueDate must use YYYY-MM-DD')
        try: datetime.strptime(t['dueDate'],'%Y-%m-%d')
        except ValueError: raise ValueError('dueDate must be a valid YYYY-MM-DD date')
    t.update(id=t.get('id',uid()),updatedAt=now());return t

def chart_fields(data,patch=False):
    if not isinstance(data,dict):raise ValueError('Chart details must be an object')
    allowed={'title','testDate','testItem','notes'}
    if patch and (not data or set(data)-allowed):raise ValueError('Only title, testDate, testItem and notes may be edited')
    out={}
    if 'title' in data:out['title']=textfield(data['title'],'title',200,True)
    if 'testDate' in data:
        date=textfield(data['testDate'],'testDate',10)
        if date:
            if not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}',date):raise ValueError('testDate must use YYYY-MM-DD')
            try:datetime.strptime(date,'%Y-%m-%d')
            except ValueError:raise ValueError('testDate must be a valid calendar date')
        out['testDate']=date
    if 'testItem' in data:out['testItem']=textfield(data['testItem'],'testItem',100)
    if 'notes' in data:out['notes']=textfield(data['notes'],'notes',5000)
    return out

def validate_chart(ch):
    if not isinstance(ch,dict):raise ValueError('Chart must be an object')
    out=dict(title=textfield(ch.get('title','Imported measurement'),'title',200,True),unit=textfield(ch.get('unit','Value'),'unit',50),series=[])
    out.update(chart_fields(ch))
    out=chart_defaults(out)
    series=ch.get('series')
    if not isinstance(series,list) or not 1<=len(series)<=32:raise ValueError('Chart needs 1–32 series')
    names=set()
    for s in series:
        if not isinstance(s,dict): raise ValueError('Series must be an object')
        name=textfield(s.get('name','Series '+str(len(names)+1)),'series name',100,True)
        if name in names:raise ValueError('Series names must be unique')
        names.add(name); vals=s.get('values')
        if not isinstance(vals,list) or not 1<=len(vals)<=200000:raise ValueError('Series needs 1–200000 measurement points')
        result=[]
        for p in vals:
            if not isinstance(p,list) or len(p)!=2:raise ValueError('Each point must be [frequency, value or null]')
            x=number(p[0],'frequency',0.000001,1e12); y=p[1]
            if y is not None:number(y,'value',-1e12,1e12)
            result.append([x,y])
        if any(result[i][0]<result[i-1][0] for i in range(1,len(result))):raise ValueError('Frequencies must be in ascending order')
        out['series'].append(dict(name=name,values=result))
    xs=[p[0] for s in out['series'] for p in s['values']]; ys=[p[1] for s in out['series'] for p in s['values'] if p[1] is not None]
    if not ys:raise ValueError('Chart must contain at least one measured value')
    out.update(xmin=min(xs),xmax=max(xs),ymin=min(ys),ymax=max(ys));return out

def parse_xlsx(raw):
    """Read native AP exports and normalized frequency worksheets without conversion."""
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            infos=z.infolist()
            if len(infos)>1000 or sum(i.file_size for i in infos)>40*1024*1024 or any(i.file_size>20*1024*1024 for i in infos):raise ValueError('Workbook uncompressed size exceeds safe limits')
            def read_xml(path):
                content=z.read(path)
                if b'<!DOCTYPE' in content.upper() or b'<!ENTITY' in content.upper():raise ValueError('XML document types and entities are not supported')
                return ET.fromstring(content)
            strings=[]
            if 'xl/sharedStrings.xml' in z.namelist():
                strings=[''.join(si.itertext()) for si in read_xml('xl/sharedStrings.xml').findall('s:si',ns)]
            workbook=read_xml('xl/workbook.xml');rels=read_xml('xl/_rels/workbook.xml.rels')
            targets={r.get('Id'):r.get('Target') for r in rels if r.get('TargetMode')!='External'}
            sheets=[]
            for sheet in workbook.findall('s:sheets/s:sheet',ns):
                rid=sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id');target=targets.get(rid,'')
                path=target.lstrip('/') if target.startswith('/') else 'xl/'+target
                if '..' in path.split('/') or not path.startswith('xl/'):raise ValueError('Unsupported workbook worksheet path')
                tree=read_xml(path);rows=[];seen_rows=set()
                for row in tree.findall('s:sheetData/s:row',ns):
                    cells={};rownum=None
                    for cell in row.findall('s:c',ns):
                        ref=cell.get('r','');m=re.fullmatch(r'([A-Z]+)([1-9][0-9]*)',ref)
                        if not m:raise ValueError('Workbook cell addresses are required')
                        col=0
                        for letter in m.group(1):col=col*26+ord(letter)-64
                        if col>33:raise ValueError('Workbook supports at most 32 measurement series')
                        cell_row=int(m.group(2))
                        if rownum is not None and rownum!=cell_row:raise ValueError('Inconsistent workbook row addresses')
                        if col in cells:raise ValueError('Duplicate workbook cell address')
                        rownum=cell_row;typ=cell.get('t');v=cell.find('s:v',ns);formula=cell.find('s:f',ns)
                        if formula is not None and (v is None or not v.text or typ in ['e','str','b']):raise ValueError('Formula cells require a cached numeric value; recalculate and save the workbook')
                        if typ=='inlineStr':value=''.join(cell.find('s:is',ns).itertext()) if cell.find('s:is',ns) is not None else ''
                        elif typ=='s':
                            try:
                                index=int(v.text)
                                if index<0:raise IndexError()
                                value=strings[index]
                            except (ValueError,IndexError,AttributeError):raise ValueError('Invalid shared string index')
                        elif typ in ['e','b']:raise ValueError('Workbook error and boolean cells are not valid measurements')
                        else:value=v.text if v is not None and v.text is not None else ''
                        cells[col]=value
                    if cells and any(str(v).strip() for v in cells.values()):
                        if rownum in seen_rows:raise ValueError('Duplicate workbook row')
                        seen_rows.add(rownum);rows.append((rownum,cells))
                if rows:sheets.append((sheet.get('name','Worksheet'),rows))
            def ap_signature(rows):
                byrow=dict(rows)
                return (str(byrow.get(3,{}).get(1,'')).strip()=='X' and str(byrow.get(3,{}).get(2,'')).strip()=='Y' and str(byrow.get(4,{}).get(1,'')).strip()=='Hz')
            has_ap=any(ap_signature(rows) for _,rows in sheets)
            charts=[];skipped=[];warnings=[]
            for name,rows in sheets:
                if name=='Summary' and has_ap:
                    if len(rows)%3:raise ValueError('Unsupported Audio Precision Summary layout; no worksheets were imported')
                    sections=[];cells=[]
                    for i in range(0,len(rows),3):
                        title,head,values=rows[i][1],rows[i+1][1],rows[i+2][1]
                        if not str(title.get(1,'')).startswith('Summary:') or any(str(title.get(j,'')).strip() for j in title if j>1) or [head.get(j,'') for j in [1,2,3]]!=['Channel','Passed Lower Limit','Passed Upper Limit'] or not str(values.get(1,'')).strip() or any(str(c.get(j,'')).strip() for c in [head,values] for j in c if j>3):raise ValueError('Unsupported Audio Precision Summary layout; no worksheets were imported')
                        sections.append(dict(title=title[1],channel=values[1],lowerLimit=values.get(2,''),upperLimit=values.get(3,'')))
                    for rn,row in rows:
                        for col,val in row.items():
                            if str(val).strip():cells.append(dict(cell=chr(64+col)+str(rn),value=val))
                    skipped.append(dict(worksheet=name,reason='Audio Precision Summary retained as source metadata, not a measurement chart or pass/fail decision.',metadata=dict(sections=sections,cells=cells)))
                    continue
                if ap_signature(rows):
                    byrow=dict(rows)
                    if any(str(value).strip() for _,row in rows for col,value in row.items() if col>2):raise ValueError('Audio Precision import supports one X/Y channel pair (A:B) only; additional nonempty columns are unsupported')
                    title=textfield(byrow.get(1,{}).get(1,''),'AP measurement title',200,True);channel=textfield(byrow.get(2,{}).get(1,''),'AP channel',100,True)
                    source_unit=textfield(byrow[4].get(2,''),'AP source unit',50,True)
                    if any(str(byrow.get(r,{}).get(2,'')).strip() for r in [1,2]):raise ValueError('Unsupported Audio Precision title/channel header layout')
                    values=[];source_rows=[]
                    for rn,row in rows:
                        if rn<5:continue
                        try:x=float(row.get(1,''));y=float(row[2]) if str(row.get(2,'')).strip() else None
                        except (ValueError,TypeError):raise ValueError('Audio Precision frequencies and nonblank values must be numeric')
                        values.append([x,y]);source_rows.append(rn)
                    if '-> Smooth' in title:item='Smoothed RMS Level';processing='AP-provided smoothed'
                    elif title=='RMS Level':item='Frequency Response';processing='raw'
                    elif title=='THD Ratio':item='THD';processing='raw'
                    elif title=='Distortion Product Ratio (H2:H5)':item=title;processing='raw'
                    else:item=title[:100];processing='raw'
                    provenance=dict(format='audio-precision-xlsx',measurementTitle=title,worksheet=name,channel=channel,headerRows=dict(title=1,channel=2,axes=3,units=4),xColumn='A',yColumn='B',xHeader='X',yHeader='Y',xUnit='Hz',sourceUnit=source_unit,dataStartRow=5,rowCount=len(values),sourceRows=source_rows)
                    charts.append(dict(title=title,unit='dB SPL' if source_unit=='dBSPL1' else source_unit,sourceUnit=source_unit,processing=processing,testItem=item,provenance=provenance,series=[dict(name=channel,values=values)]))
                    if source_unit=='Vrms':warnings.append(name+': source unit is Vrms. Values remain Vrms; no SPL conversion is applied.')
                    continue
                header=rows[0][1];width=max(header)
                if str(header.get(1,'')).strip().lower() not in ['frequency','frequency (hz)','frequency_hz'] or width<2:raise ValueError('Unrecognized nonempty worksheet '+name+': requires a Frequency header or supported Audio Precision X/Y/Hz layout; no worksheets were imported')
                names=[str(header.get(i,'')).strip() for i in range(2,width+1)]
                if any(not n for n in names) or len(set(names))!=len(names):raise ValueError('Worksheet series headers must be nonempty and unique')
                series=[dict(name=n,values=[]) for n in names]
                for _,row in rows[1:]:
                    if max(row)>width:raise ValueError('Workbook data extends beyond series headers')
                    try:x=float(row.get(1,''));values=[float(row[i]) if str(row.get(i,'')).strip() else None for i in range(2,width+1)]
                    except (ValueError,TypeError):raise ValueError('Workbook frequencies and nonblank values must be numeric')
                    for ser,v in zip(series,values):ser['values'].append([x,v])
                charts.append(dict(title=name,unit='Value',series=series))
            if not charts:raise ValueError('Workbook contains no measurement worksheets')
            if has_ap:
                warnings.insert(0,'Audio Precision source values are preserved: no smoothing, resampling, conversion or pass/fail decision is performed. Test dates remain unknown unless supplied.')
                if any(ch.get('sourceUnit')=='dBSPL1' for ch in charts):warnings.append('dBSPL1 is displayed as dB SPL; original sourceUnit is retained. Numeric values are unchanged.')
                if skipped:warnings.append('Summary lower/upper entries (including N/A) are source metadata only, not configured limits or PASS results.')
            return dict(charts=charts,formatDetected='audio-precision-xlsx' if has_ap else 'generic-xlsx',skippedSheets=skipped,warnings=warnings)
    except (zipfile.BadZipFile,KeyError,ET.ParseError,RuntimeError) as exc:raise ValueError('Invalid XLSX workbook: '+str(exc))

def prepare_import(d):
    """Validate and parse once, without database changes; shared by preview/save."""
    if not isinstance(d,dict):raise ValueError('Import must be an object')
    name=textfield(d.get('name',''),'name',200,True)
    if '/' in name or '\\' in name:raise ValueError('Use a filename, not a path')
    fmt=d.get('format')
    if fmt not in ['csv','json','xlsx']:raise ValueError('Supported formats: xlsx, csv, json. Save legacy .xls files as .xlsx or CSV.')
    try:raw=base64.b64decode(d.get('contentBase64',''),validate=True)
    except (binascii.Error,ValueError,TypeError):raise ValueError('Invalid base64 upload')
    if not raw or len(raw)>LIMIT:raise ValueError('Upload must be between 1 byte and 20 MB')
    parsed=dict(formatDetected=fmt,skippedSheets=[],warnings=[])
    if fmt=='xlsx':parsed=parse_xlsx(raw);charts=parsed['charts']
    else:
        try:txt=raw.decode('utf-8-sig')
        except UnicodeDecodeError:raise ValueError('Upload must use UTF-8 encoding')
        if fmt=='json':
            try:value=json.loads(txt,parse_constant=lambda x: (_ for _ in ()).throw(ValueError('Non-finite JSON number')))
            except json.JSONDecodeError:raise ValueError('Invalid JSON file')
            charts=value.get('charts',[value]) if isinstance(value,dict) else None
        else:
            rows=list(csv.reader(io.StringIO(txt)))
            if len(rows)<2 or len(rows[0])<2 or rows[0][0].strip().lower() not in ['frequency','frequency (hz)','frequency_hz']:raise ValueError('CSV needs Frequency,Value header and measurement rows')
            headers=[h.strip() for h in rows[0][1:]]
            if any(not h for h in headers) or len(set(headers))!=len(headers):raise ValueError('CSV series headers must be nonempty and unique')
            series=[dict(name=h,values=[]) for h in headers]
            for row in rows[1:]:
                if not row or all(not v.strip() for v in row):continue
                if len(row)!=len(headers)+1:raise ValueError('CSV row width does not match header')
                try:x=float(row[0]);values=[float(v) if v.strip() else None for v in row[1:]]
                except ValueError:raise ValueError('CSV frequencies and nonblank values must be numeric')
                for ser,v in zip(series,values):ser['values'].append([x,v])
            charts=[dict(title=Path(name).stem,unit='Value',series=series)]
    if not isinstance(charts,list) or not 1<=len(charts)<=100:raise ValueError('Import needs 1–100 charts')
    raw_charts=charts;charts=[validate_chart(c) for c in raw_charts]
    for chart,original in zip(charts,raw_charts):
        # Only the native workbook parser may establish immutable AP provenance.
        if fmt=='xlsx' and original.get('provenance',{}).get('format')=='audio-precision-xlsx':
            for field in ['sourceUnit','processing','provenance']:chart[field]=original[field]
    common=chart_fields({k:d[k] for k in ['title','testDate','testItem','notes'] if k in d})
    for chart in charts:
        original_title=chart['title'];overrides=common.copy()
        if chart.get('provenance',{}).get('format')=='audio-precision-xlsx' and not overrides.get('testItem','').strip():overrides.pop('testItem',None)
        chart.update(overrides)
        if 'title' in common and len(charts)>1:chart['title']=textfield(common['title']+' · '+original_title,'combined chart title',200,True)
        chart['sourceName']=name
    if fmt in ['xlsx','csv'] and 'unit' in d:
        unit=textfield(d['unit'],'unit',50,True)
        fixed=[]
        for chart in charts:
            if chart.get('provenance',{}).get('format')=='audio-precision-xlsx':fixed.append(chart['title'])
            else:chart['unit']=unit
        if fixed and unit!='Value':parsed['warnings'].append('Generic unit override was ignored for Audio Precision measurements; their source units are fixed.')
    source=dict(name=name,kind='imported',format=fmt,size=len(raw),sha256=hashlib.sha256(raw).hexdigest(),label='User import — unvalidated; device identity and calibration not verified',formatDetected=parsed['formatDetected'],skippedSheets=parsed['skippedSheets'],warnings=parsed['warnings'])
    return raw,source,charts

def preview_import(d):
    _,source,charts=prepare_import(d)
    return dict(name=source['name'],size=source['size'],sha256=source['sha256'],formatDetected=source['formatDetected'],charts=[metadata(c) for c in charts],skippedSheets=source['skippedSheets'],warnings=source['warnings'])

def import_data(d):
    raw,source,charts=prepare_import(d)
    source.update(id=uid(),createdAt=now())
    with db() as c:
        c.execute('INSERT INTO sources VALUES(?,?,?)',(source['id'],json.dumps(source),raw))
        for ch in charts:
            ch.update(id=uid(),sourceId=source['id'],kind='imported',label=source['label'],updatedAt=datetime.now(timezone.utc).isoformat(timespec='microseconds'))
            c.execute('INSERT INTO charts VALUES(?,?)',(ch['id'],json.dumps(ch,allow_nan=False)))
        activity(c,'Imported '+source['name']+' ('+str(len(charts))+' charts; unvalidated)')
    return dict(source=source,charts=[metadata(c) for c in charts],formatDetected=source['formatDetected'],skippedSheets=source['skippedSheets'],warnings=source['warnings'])

def export_csv(ch):
    f=io.StringIO(newline='');w=csv.writer(f);w.writerow(['Chart','Series','Frequency_Hz','Value','Unit','Source_ID','Source_SHA256','Classification'])
    sha=record('sources',ch['sourceId'])['sha256']
    def safe_cell(value):
        value=str(value)
        return "'"+value if value.lstrip().startswith(('=','+','-','@')) or value.startswith(('\t','\r')) else value
    for s in ch['series']:
        for x,y in s['values']:w.writerow([safe_cell(ch['title']),safe_cell(s['name']),x,'' if y is None else y,safe_cell(ch['unit']),ch['sourceId'],sha,safe_cell(ch['label'])])
    return f.getvalue().encode('utf-8-sig')

def report_provenance_html(ch,source):
    p=ch.get('provenance')
    if not p:return ''
    esc=lambda v:html.escape(str(v),quote=True)
    source_rows=p.get('sourceRows',[])
    fields=[('Original file',source['name']),('AP measurement title',p['measurementTitle']),('Worksheet',p['worksheet']),('Channel',p['channel']),('Source unit',ch['sourceUnit']),('Display unit',ch['unit']),('Processing',ch['processing']),('Axis headers',p['xHeader']+' / '+p['yHeader']+'; '+p['xUnit']),('Header rows',json.dumps(p['headerRows'])),('Data cells',p['xColumn']+str(p['dataStartRow'])+':'+p['xColumn']+str(source_rows[-1] if source_rows else p['dataStartRow'])+' / '+p['yColumn']+str(p['dataStartRow'])+':'+p['yColumn']+str(source_rows[-1] if source_rows else p['dataStartRow'])),('Retained source rows',p['rowCount'])]
    result='<h2>Audio Precision source provenance</h2><table>'+''.join('<tr><th>'+esc(k)+'</th><td>'+esc(v)+'</td></tr>' for k,v in fields)+'</table><p>Numeric values are preserved without conversion, resampling or additional smoothing. AP-provided smoothed data is a separate source trace, not a replacement for raw RMS data. dBSPL1 is only a display-label mapping to dB SPL; original sourceUnit remains dBSPL1. Per-point original worksheet row numbers are stored in the frozen measurement snapshot below.</p>'
    skipped=source.get('skippedSheets',[])
    if skipped:
        result+='<h3>Source worksheets excluded from charts</h3>'
        for sheet in skipped:
            result+='<p><strong>'+esc(sheet['worksheet'])+'</strong>: '+esc(sheet['reason'])+'</p>'
            result+='<table><tr><th>Source Summary section</th><th>Channel</th><th>Source lower entry</th><th>Source upper entry</th></tr>'
            for section in sheet.get('metadata',{}).get('sections',[]):
                result+='<tr>'+''.join('<td>'+esc(section.get(k,''))+'</td>' for k in ['title','channel','lowerLimit','upperLimit'])+'</tr>'
            result+='</table><p>Summary entries, including N/A, are retained source text. They are not interpreted as configured limits, a pass or a fail.</p>'
    return result

def report_html(r):
    esc=lambda v:html.escape(str(v),quote=True)
    ch=r['chart']; source=r['source']; rows=''.join('<tr><td><span style="display:inline-block;width:16px;height:4px;margin-right:8px;vertical-align:middle;background:'+['#7047eb','#00a9b1','#e59035','#d05796'][i%4]+'"></span>'+esc(s['name'])+'</td><td>'+str(len(s['values']))+'</td><td>'+str(sum(p[1] is None for p in s['values']))+'</td></tr>' for i,s in enumerate(ch['series']))
    paths=[]; colors=['#7047eb','#00a9b1','#e59035','#d05796']; xs=[p[0] for s in ch['series'] for p in s['values']]; ys=[p[1] for s in ch['series'] for p in s['values'] if p[1] is not None]
    lo,hi=min(xs),max(xs); ymin,ymax=(min(ys),max(ys)) if ys else (ch.get('ymin',0),ch.get('ymax',1)); hi=max(hi,lo*1.01); ymax=ymax if ymax>ymin else ymin+max(abs(ymin)*0.01,1e-9)
    for i,s in enumerate(ch['series']):
        segments=[];segment=[]
        for x,y in s['values']:
            if y is None:
                if segment:segments.append(segment);segment=[]
            else:segment.append(f'{50+800*(math.log10(x)-math.log10(lo))/(math.log10(hi)-math.log10(lo)):.2f},{300-260*(y-ymin)/(ymax-ymin):.2f}')
        if segment:segments.append(segment)
        paths += [('<circle cx="'+seg[0].split(',')[0]+'" cy="'+seg[0].split(',')[1]+'" r="3" fill="'+colors[i%4]+'" />') if len(seg)==1 else ('<polyline fill="none" stroke="'+colors[i%4]+'" stroke-width="1.5" points="'+' '.join(seg)+'" />') for seg in segments]
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+esc(r['title'])+'</title><style>body{font:16px system-ui;color:#25213b;max-width:1050px;margin:50px auto;padding:24px}h1{color:#5533ac}h2{margin-top:34px}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}.notice{padding:18px;background:#f4efff;border-left:4px solid #7047eb}pre{white-space:pre-wrap;overflow-wrap:anywhere}svg{width:100%;background:#faf9fe;border:1px solid #ddd}small{color:#666}@media print{body{margin:0;padding:10px}button{display:none}}</style><h3>CRYSOUND · CRY7574 Hearing Aid Box Measurement Manage Software</h3><h1>'+esc(r['title'])+'</h1><p class="notice">'+esc(ch['label'])+'</p><p>Report ID: '+esc(r['id'])+'<br>Snapshot created: '+esc(r['createdAt'])+'</p><h2>'+esc(ch['title'])+'</h2><svg role="img" aria-label="Measurement curves, log frequency" viewBox="0 0 900 350"><path d="M50 30V300H850" fill="none" stroke="#aaa"/>'+''.join(paths)+'<text x="350" y="335">Frequency (Hz), logarithmic · '+esc(lo)+'–'+esc(hi)+'</text><text x="55" y="20">'+esc(ch['unit'])+' · '+esc(ymin)+'–'+esc(ymax)+'</text></svg><table><tr><th>Series</th><th>Original points</th><th>Missing values</th></tr>'+rows+'</table><h2>Measurement details</h2><p>Test date: '+esc(ch.get('testDate') or 'Unknown')+'<br>Test item: '+esc(ch.get('testItem') or 'Uncategorized')+'</p><h3>Measurement notes</h3><pre>'+esc(ch.get('notes') or 'No measurement notes recorded.')+'</pre>'+report_provenance_html(ch,source)+'<h2>Engineering notes</h2><pre>'+esc(r['notes'] or 'No notes provided.')+'</pre><h2>Traceability</h2><p>Source: '+esc(source['name'])+'<br>Chart ID: '+esc(ch['id'])+'</p><pre>SHA-256: '+esc(source['sha256'])+'</pre><details><summary>Original measurement snapshot (JSON)</summary><pre>'+esc(json.dumps(ch,ensure_ascii=False,indent=2))+'</pre></details><h2>Limitations</h2><p>This engineering snapshot is not a CRY7574 compliance or validation certificate. Reference Alpair 5G data does not establish CRY7574 performance. Uploaded files have not been verified for device identity, calibration or test conditions. No approved CRY7574 acceptance limits are configured; no automatic pass/fail conclusion is issued. Missing values remain gaps. Curves use a logarithmic frequency axis. Original points are available in the companion CSV export; this report stores the selected series at creation time.</p><small>CRY7574 Hearing Aid Box Measurement Manage Software · Use your browser Print command to save as PDF.</small></html>').encode()

class Handler(BaseHTTPRequestHandler):
    server_version='CRY7574/1.0'
    def log_message(self,*a):pass
    def send(self,status,body,ctype='application/json',filename=None):
        if not isinstance(body,bytes):body=json.dumps(body,allow_nan=False).encode()
        self.send_response(status); self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(body)));self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','no-referrer')
        if filename:self.send_header('Content-Disposition',"attachment; filename=\""+re.sub('[^a-zA-Z0-9._-]','_',filename)+"\"; filename*=UTF-8''"+quote(filename,safe=''))
        if ctype.startswith('text/html'):self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'")
        self.end_headers();self.wfile.write(body)
    def trusted(self):
        host=self.headers.get('Host',''); expected={'127.0.0.1:'+str(self.server.server_port),'localhost:'+str(self.server.server_port)}
        if host not in expected:return False
        origin=self.headers.get('Origin')
        return not origin or origin in {'http://'+h for h in expected}
    def do_GET(self):self.handle_request('GET')
    def do_POST(self):self.handle_request('POST')
    def do_PATCH(self):self.handle_request('PATCH')
    def handle_request(self,method):
        try:
            if not self.trusted():self.send(403,dict(error='Only local workspace requests are allowed'));return
            p=unquote(urlsplit(self.path).path); parts=p.strip('/').split('/')
            if method=='GET':
                if p=='/api/state':self.send(200,state());return
                if len(parts)>=3 and parts[:2]==['api','charts']:
                    ch=record('charts',parts[2])
                    if len(parts)==3:self.send(200,ch);return
                    if len(parts)==4 and parts[3]=='export.csv':self.send(200,export_csv(ch),'text/csv; charset=utf-8',parts[2]+'.csv');return
                if len(parts)==4 and parts[:2]==['api','sources'] and parts[3]=='download':
                    s=record('sources',parts[2]);
                    with db() as c:raw=c.execute('SELECT raw FROM sources WHERE id=?',(parts[2],)).fetchone()[0]
                    self.send(200,raw,'application/octet-stream',s['name']);return
                if len(parts)==3 and parts[:2]==['api','reports']:self.send(200,record('reports',parts[2]));return
                if len(parts)==4 and parts[:2]==['api','reports'] and parts[3] in ['download','preview']:self.send(200,report_html(record('reports',parts[2])),'text/html; charset=utf-8','CRY7574-report-'+parts[2]+'.html' if parts[3]=='download' else None);return
                if p in ['/docs/product-design.html','/docs/data-management-design.html','/docs/audio-precision-import-guide.html']:self.send(200,(ROOT/'docs'/p.rsplit('/',1)[1]).read_bytes(),'text/html; charset=utf-8');return
                files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'}
                if p in files:
                    self.send(200,(ROOT/'static'/files[p]).read_bytes(),{'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[Path(files[p]).suffix]);return
                raise LookupError('Route not found')
            if self.headers.get('Content-Type','').split(';')[0]!='application/json':raise ValueError('Content-Type must be application/json')
            try:length=int(self.headers.get('Content-Length','0'))
            except ValueError:raise ValueError('Invalid Content-Length')
            if length>LIMIT*4//3+8192:self.send(413,dict(error='Upload exceeds 20 MB limit'));return
            if length<=0:raise ValueError('JSON request body required')
            try:d=json.loads(self.rfile.read(length),parse_constant=lambda x: (_ for _ in ()).throw(ValueError('Non-finite JSON number')))
            except (json.JSONDecodeError,UnicodeDecodeError):raise ValueError('Invalid JSON request')
            if method=='POST' and p=='/api/import/preview':self.send(200,preview_import(d));return
            if method=='POST' and p=='/api/import':self.send(201,import_data(d));return
            if method=='PATCH' and len(parts)==3 and parts[:2]==['api','charts']:
                changes=chart_fields(d,patch=True)
                with LOCK:
                    ch=record('charts',parts[2]);ch.update(changes);ch['updatedAt']=datetime.now(timezone.utc).isoformat(timespec='microseconds')
                    with db() as c:
                        c.execute('UPDATE charts SET payload=? WHERE id=?',(json.dumps(ch,allow_nan=False),ch['id']))
                        activity(c,'Updated measurement details: '+ch['title']+' · '+', '.join(changes))
                self.send(200,ch);return
            if (method=='POST' and p=='/api/tasks') or (method=='PATCH' and len(parts)==3 and parts[:2]==['api','tasks']):
                with LOCK:
                    t=valid_task(d,record('tasks',parts[2]) if method=='PATCH' else None)
                    with db() as c:
                        c.execute('INSERT OR REPLACE INTO tasks VALUES(?,?)',(t['id'],json.dumps(t)));activity(c,('Created ' if method=='POST' else 'Updated ')+t['title']+' · '+t['status']+' · '+str(t['percent'])+'%')
                self.send(201 if method=='POST' else 200,t);return
            if method=='POST' and p=='/api/reports':
                if not isinstance(d,dict):raise ValueError('Report must be an object')
                ch=record('charts',d.get('chartId',''));selected=d.get('series')
                if selected is not None:
                    if not isinstance(selected,list) or not selected or any(n not in [s['name'] for s in ch['series']] for n in selected):raise ValueError('Select valid series')
                    ch['series']=[s for s in ch['series'] if s['name'] in selected]
                r=dict(id=uid(),title=textfield(d.get('title','Engineering measurement report'),'title',200,True),notes=textfield(d.get('notes',''),'notes',10000),createdAt=now(),chartId=ch['id'],chart=ch,source=record('sources',ch['sourceId']))
                with db() as c:c.execute('INSERT INTO reports VALUES(?,?)',(r['id'],json.dumps(r)));activity(c,'Created report snapshot: '+r['title'])
                self.send(201,{k:v for k,v in r.items() if k!='chart'});return
            raise LookupError('Route not found')
        except (ValueError,TypeError,KeyError) as e:self.send(400,dict(error=str(e)))
        except LookupError as e:self.send(404,dict(error=str(e)))
        except Exception as e:
            print('Server error:',repr(e));self.send(500,dict(error='Internal workspace error; see server log'))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=7574);parser.add_argument('--data-dir',type=Path,default=ROOT/'data');args=parser.parse_args()
    DATA=args.data_dir.resolve();REFERENCE=json.loads((ROOT/'reference/measurement-data.json').read_text());initialize()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);print('CRY7574 Hearing Aid Box Measurement Manage Software: http://127.0.0.1:'+str(server.server_port),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
