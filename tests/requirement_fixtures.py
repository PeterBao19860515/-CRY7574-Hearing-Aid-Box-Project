"""Small synthetic requirement-upload fixtures; never reads a user document.

Legacy fixtures are CFB containers with appropriately named streams. They test
the documented OLE signature/storage policy, not native Office conversion.
"""
import base64
import io
import json
import struct
import zipfile


def pdf():
    stream = b'1 0 0 rg 10 10 90 90 re f\n0 0 1 rg 120 10 90 90 re f\nBT /F1 12 Tf 12 130 Td (Synthetic Requirement QA) Tj ET\n'
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 160] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'endstream',
    ]
    body = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for i, value in enumerate(objects, 1):
        offsets.append(len(body))
        body.extend(str(i).encode() + b' 0 obj\n' + value + b'\nendobj\n')
    xref = len(body)
    body.extend(b'xref\n0 6\n0000000000 65535 f \n')
    for offset in offsets[1:]:
        body.extend(f'{offset:010d} 00000 n \n'.encode())
    body.extend(f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    return bytes(body)


def compound(stream_name):
    free, end, fat = 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFD
    header = bytearray(512)
    header[:8] = bytes.fromhex('d0cf11e0a1b11ae1')
    struct.pack_into('<HHHHH', header, 24, 0x003E, 3, 0xFFFE, 9, 6)
    struct.pack_into('<IIIIIIIII', header, 40, 0, 1, 0, 0, 4096, end, 0, end, 0)
    struct.pack_into('<109I', header, 76, 1, *([free] * 108))

    def entry(name, kind, child=free, start=end, size=0):
        out = bytearray(128)
        encoded = (name + '\0').encode('utf-16le')
        out[:len(encoded)] = encoded
        struct.pack_into('<HBBIII', out, 64, len(encoded), kind, 1, free, free, child)
        struct.pack_into('<IQ', out, 116, start, size)
        return out

    directory = entry('Root Entry', 5, child=1) + entry(stream_name, 2, start=2, size=4096) + bytes(256)
    table = struct.pack('<128I', end, fat, *range(3, 10), end, *([free] * 118))
    stream = ('Synthetic signature/storage fixture: ' + stream_name).encode().ljust(4096, b'\0')
    return bytes(header + directory + table + stream)


def office(kind):
    part = 'word/document.xml' if kind == 'docx' else 'ppt/presentation.xml'
    content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml' if kind == 'docx' else 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
    document = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic Requirement QA</w:t></w:r></w:p></w:body></w:document>' if kind == 'docx' else '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>'
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/' + part + '" ContentType="' + content_type + '"/></Types>')
        archive.writestr('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="' + part + '"/></Relationships>')
        archive.writestr(part, document)
    return output.getvalue()


def fixtures():
    html = b'<!doctype html><html><head><base href="https://requirement-invalid.example/"><meta http-equiv="refresh" content="0;url=https://requirement-invalid.example/"></head><body><script>parent.requirementUnsafe=1;fetch("https://requirement-invalid.example/script")</script><img src="https://requirement-invalid.example/image" onerror="parent.requirementUnsafe=1"><iframe srcdoc="<script>parent.requirementUnsafe=1</script>"></iframe><a href="javascript:parent.requirementUnsafe=1">Synthetic link</a><form action="https://requirement-invalid.example/post"><button>Send</button></form><h1>Synthetic inert HTML requirement</h1></body></html>'
    return [
        {'name': 'Synthetic Requirement.pdf', 'mime': 'application/pdf', 'bytes': pdf()},
        {'name': 'Synthetic Requirement.doc', 'mime': 'application/msword', 'bytes': compound('WordDocument')},
        {'name': 'Synthetic Requirement.ppt', 'mime': 'application/vnd.ms-powerpoint', 'bytes': compound('PowerPoint Document')},
        {'name': 'Synthetic Requirement.docx', 'mime': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'bytes': office('docx')},
        {'name': 'Synthetic Requirement.pptx', 'mime': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'bytes': office('pptx')},
        {'name': 'Synthetic inert Requirement.html', 'mime': 'text/html', 'bytes': html},
    ]


if __name__ == '__main__':
    print(json.dumps([{**{k: v for k, v in f.items() if k != 'bytes'}, 'contentBase64': base64.b64encode(f['bytes']).decode()} for f in fixtures()]))
