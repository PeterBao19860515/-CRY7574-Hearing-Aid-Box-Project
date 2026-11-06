"""Synthetic AP container fixtures and independent read-only XML cell extraction. No real workbook output."""
import base64
import io
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def read_source(path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(t.text or '' for t in item.iter('{%s}t' % NS['s']))
                      for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        relationships = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        targets = {item.attrib['Id']: item.attrib['Target'] for item in relationships}
        output = []
        for sheet in workbook.findall('s:sheets/s:sheet', NS):
            rel = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = targets[rel]
            filename = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            tree = ET.fromstring(archive.read(filename))
            cells = {}
            for cell in tree.findall('.//s:sheetData/s:row/s:c', NS):
                value = cell.find('s:v', NS)
                kind = cell.attrib.get('t')
                if kind == 'inlineStr':
                    result = ''.join(t.text or '' for t in cell.findall('.//s:t', NS))
                elif value is None or value.text is None:
                    result = None
                elif kind == 's':
                    result = shared[int(value.text)]
                elif kind in ('str', 'e'):
                    result = value.text
                else:
                    result = float(value.text)
                cells[cell.attrib['r']] = result
            if not any(v is not None and v != '' for v in cells.values()):
                output.append({'worksheet': sheet.attrib['name'], 'empty': True})
                continue
            rows = sorted({int(key[1:]) for key in cells if key[0] in 'ABCD' and int(key[1:]) >= 5})
            values = []
            for row in rows:
                a, b, c, d = [cells.get(column + str(row)) for column in 'ABCD']
                if all(v is None for v in [a, b, c, d]):
                    continue
                values.append({'row': row, 'inner': [a, b], 'external': [c, d],
                               'isolation': [a, None if b is None or d is None else d - b]})
            output.append({'worksheet': sheet.attrib['name'], 'title': cells.get('A1'),
                           'channels': [cells.get('A2'), cells.get('C2')],
                           'units': [cells.get('B4'), cells.get('D4')], 'values': values})
        return output

def cell(ref, value):
    if value is None:
        return '<c r="%s"/>' % ref
    if isinstance(value, str):
        return '<c r="%s" t="inlineStr"><is><t>%s</t></is></c>' % (ref, escape(value))
    return '<c r="%s"><v>%s</v></c>' % (ref, value)

def workbook(variant='good'):
    grid = [100, 200, 400, 800]
    inner = [0, None, -2.5, 20.1234567890123]
    outer = [0, 15, -5, 40.2345678901234]
    other = list(grid)
    units = ['dBSPL', 'dBSPL']
    if variant == 'mismatch': other[1] = 201
    if variant == 'duplicate': grid[1] = other[1] = 100
    if variant == 'descending': grid[2] = other[2] = 50
    if variant == 'missing_frequency': other[1] = None
    if variant == 'linear': units = ['Vrms', 'Vrms']
    if variant == 'unrelated_db': units = ['dBV', 'dBV']
    if variant == 'mixed_units': units[1] = 'Vrms'
    if variant == 'all_missing_inner': inner = [None] * 4
    header = [
        ['Synthetic AP dual channel — QA only', None, None, None],
        ['Ch1', None, 'Ch2', None], ['X', 'Y', 'X', 'Y'],
        ['Hz', units[0], 'Hz', units[1]],
    ]
    data = header + [[grid[i], inner[i], other[i], outer[i]] for i in range(4)]
    rows = []
    for index, values in enumerate(data, 1):
        xml = ''.join(cell(column + str(index), value) for column, value in zip('ABCD', values))
        if variant == 'uncached_formula' and index == 6:
            xml = xml.replace('<c r="D6"><v>15</v></c>', '<c r="D6"><f>10+5</f></c>')
        if variant == 'extra_column' and index == 5:
            xml += cell('E5', 123)
        rows.append('<row r="%d">%s</row>' % (index, xml))
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        archive.writestr('xl/workbook.xml', '<workbook xmlns="%s" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic 01" sheetId="1" r:id="rId1"/><sheet name="Synthetic empty" sheetId="2" r:id="rId2"/></sheets></workbook>' % NS['s'])
        archive.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>')
        archive.writestr('xl/worksheets/sheet1.xml', '<worksheet xmlns="%s"><sheetData>%s</sheetData></worksheet>' % (NS['s'], ''.join(rows)))
        archive.writestr('xl/worksheets/sheet2.xml', '<worksheet xmlns="%s"><sheetData/></worksheet>' % NS['s'])
    return base64.b64encode(stream.getvalue()).decode()

if __name__ == '__main__':
    if len(sys.argv) > 1:
        print(json.dumps(read_source(sys.argv[1])))
    else:
        print(json.dumps({name: workbook(name) for name in ['good', 'mismatch', 'duplicate', 'descending', 'missing_frequency', 'linear', 'unrelated_db', 'mixed_units', 'all_missing_inner', 'uncached_formula', 'extra_column']}))
