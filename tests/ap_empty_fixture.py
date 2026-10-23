"""Synthetic AP workbooks for missing-Y regression; no original workbook is copied."""
import base64, io, json, sys, zipfile
from xml.sax.saxutils import escape

def workbook(variant='good'):
    if variant=='generic_all_missing':
        from test_acceptance import xlsx_fixture
        import re
        source=zipfile.ZipFile(io.BytesIO(xlsx_fixture()))
        output=io.BytesIO()
        with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
            for name in source.namelist():
                content=source.read(name)
                if name=='xl/worksheets/sheet1.xml':content=re.sub(rb'<c r="[BC][2-9][0-9]*">.*?</c>',b'',content)
                archive.writestr(name,content)
        return output.getvalue()
    ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    def text(ref,value): return f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>'
    def ap(name,title,unit,values):
        headers=[text('A1',title),text('A2','Ch1'),text('A3','X')+text('B3','Y'),text('A4','Hz')+text('B4',unit)]
        rows=[f'<row r="{i}">{content}</row>' for i,content in enumerate(headers,1)]
        for number,(x,y) in enumerate(values,5):
            row=f'<c r="A{number}"><v>{x}</v></c>'
            if y is not None:row+=f'<c r="B{number}"><v>{y}</v></c>'
            if name=='THD Ratio (17)' and number==5:
                if variant=='uncached_formula':row+='<c r="B5"><f>0/0</f></c>'
                if variant=='extra_column':row+=text('C5','Unexpected extra channel')
            rows.append(f'<row r="{number}">{row}</row>')
        return name,f'<worksheet xmlns="{ns}"><sheetData>{"".join(rows)}</sheetData></worksheet>'
    missing=[(100,None),(200,None),(300,None)]
    if variant=='zero_frequency':missing[0]=(0,None)
    if variant=='descending_frequency':missing=[(100,None),(300,None),(200,None)]
    sheets=[] if variant=='all_missing_only' else [ap('RMS Level','RMS Level','dBSPL',[(100,0),(200,None),(300,1.23456789012345)]),ap('RMS Level (1)','RMS Level','dBSPL',[(100,1),(200,0),(300,None)])]
    sheets += [ap('THD Ratio (17)','THD Ratio','%',missing),ap('Distortion Ratio (17)','Distortion Product Ratio (H2:H5)','%',[(100,None),(200,None),(300,None)])]
    summary=text('A1','Summary: Signal Path1.Stepped Frequency Sweep.RMS Level')
    summary=f'<row r="1">{summary}</row><row r="2">{text("A2","Channel")}{text("B2","Passed Lower Limit")}{text("C2","Passed Upper Limit")}</row><row r="3">{text("A3","Ch1")}{text("B3","Failed")}{text("C3","Passed")}</row>'
    sheets.append(('Summary',f'<worksheet xmlns="{ns}"><sheetData>{summary}</sheetData></worksheet>'))
    files={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1))+'</Types>',
    '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':f'<workbook xmlns="{ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+''.join(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>'for i,(name,_)in enumerate(sheets,1))+'</sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'for i in range(1,len(sheets)+1))+'</Relationships>'}
    files.update({f'xl/worksheets/sheet{i}.xml':xml for i,(_,xml)in enumerate(sheets,1)})
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED)as archive:
        for name,content in files.items():archive.writestr(name,content)
    return output.getvalue()
if __name__=='__main__':print(json.dumps({variant:base64.b64encode(workbook(variant)).decode()for variant in ['good','zero_frequency','descending_frequency','uncached_formula','extra_column','all_missing_only','generic_all_missing']}))
