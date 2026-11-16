"""Synthetic CSV/XLSX for explicit column mapping. No user file reads."""
import base64
import csv
import io
import json
import zipfile
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from ap_dual_fixture import workbook as dual_workbook


def rows(variant='good'):
    data = [['Synthetic mapped export'], ['Example unit', 'Source channel', 'dB SPL', 'Channel A'],
            ['External', 'Frequency', 'Inner', 'Ignored'],
            [40.2345678901234, 100, 20.1234567890123, '<img src=x onerror=window.mappingUnsafe=1>'],
            [15, 200, '', 'Synthetic missing Y'], [], [0, 400, 0, 'Synthetic zero'],
            [-5, 800, -2.5, 'Synthetic negative'], ['Excluded tail', 'not a frequency', 'not numeric']]
    if variant == 'duplicate':
        data[6][1] = 200
    elif variant == 'descending':
        data[6][1] = 150
    elif variant == 'negative-frequency':
        data[6][1] = -400
    elif variant == 'bad-value':
        data[6][2] = 'not a number'
    elif variant == 'missing-frequency':
        data[6][1] = ''
    elif variant == 'empty-unit':
        data[1][2] = ''
    return data


def csv_bytes(data):
    out = io.StringIO(newline='')
    csv.writer(out).writerows(data)
    return out.getvalue().encode()


def xlsx_bytes(data):
    def column(n):
        return chr(65+n)
    entries = []
    for n, row in enumerate(data, 1):
        cells = []
        for c, value in enumerate(row):
            ref = column(c)+str(n)
            if isinstance(value, (int, float)):
                cells.append('<c r="%s"><v>%s</v></c>' % (ref, value))
            elif value != '':
                cells.append('<c r="%s" t="inlineStr"><is><t>%s</t></is></c>' % (ref, escape(str(value))))
        entries.append('<row r="%d">%s</row>' % (n, ''.join(cells)))
    files = {'[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
             'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic map" sheetId="1" r:id="rId1"/></sheets></workbook>',
             'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
             'xl/worksheets/sheet1.xml': '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>%s</sheetData></worksheet>' % ''.join(entries)}
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, value in files.items():
            archive.writestr(name, value)
    return out.getvalue()


if __name__ == '__main__':
    data = {variant: {'csv': base64.b64encode(csv_bytes(rows(variant))).decode(), 'xlsx': base64.b64encode(xlsx_bytes(rows(variant))).decode()} for variant in ['good', 'duplicate', 'descending', 'negative-frequency', 'bad-value', 'missing-frequency', 'empty-unit']}
    data['rows'] = rows()
    data['dual'] = {variant: dual_workbook(variant) for variant in ['good', 'mismatch', 'linear', 'uncached_formula']}
    source = base64.b64decode(data['dual']['good'])
    single = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(source)) as old, zipfile.ZipFile(single, 'w', zipfile.ZIP_DEFLATED) as new:
        for name in old.namelist():
            content = old.read(name)
            if name == 'xl/worksheets/sheet1.xml':
                tree = ET.fromstring(content)
                for row in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                    for cell in list(row):
                        if cell.get('r', '').startswith(('C', 'D')):
                            row.remove(cell)
                        elif cell.get('r') == 'B4':
                            for text in cell.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                                text.text = 'dBSPL1'
                content = ET.tostring(tree)
            new.writestr(name, content)
    data['singleAP'] = base64.b64encode(single.getvalue()).decode()
    print(json.dumps(data))
