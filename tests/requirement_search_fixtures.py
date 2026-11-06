"""Synthetic full-text document containers only. Never reads a user document."""
import base64
import io
import json
import sys
import zipfile
from xml.sax.saxutils import escape
from pathlib import Path

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def package(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return output.getvalue()


def docx(paragraphs=None):
    paragraphs = paragraphs or ['A readable introduction.', 'AuroraDOCXKey in body only.', 'Search documents',
                                '<img src=x onerror=window.fullTextUnsafe=1> literal text', '中文正文关键字']
    text = ''.join('<w:p><w:r><w:t>%s</w:t></w:r></w:p>' % escape(value) for value in paragraphs)
    table = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>TableCobaltKeyword</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
    return package({'[Content_Types].xml': '<Types xmlns="%s"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' % 'http://schemas.openxmlformats.org/package/2006/content-types',
                    '_rels/.rels': '<Relationships xmlns="%s"><Relationship Id="rId1" Type="%s/officeDocument" Target="word/document.xml"/></Relationships>' % (REL, R),
                    'word/document.xml': '<w:document xmlns:w="%s"><w:body>%s%s</w:body></w:document>' % (W, text, table)})


def pptx(count=2):
    # Physical file names are deliberately not slide order. slide1 is an unreferenced trap.
    names = [7, 2] if count == 2 else list(range(1, count + 1))
    ids = ''.join('<p:sldId id="%d" r:id="r%d"/>' % (256+i, i) for i in range(len(names)))
    relationships = ''.join('<Relationship Id="r%d" Type="%s/slide" Target="slides/slide%d.xml"/>' % (i, R, n) for i, n in enumerate(names))
    files = {'[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>',
             'ppt/presentation.xml': '<p:presentation xmlns:p="%s" xmlns:r="%s"><p:sldIdLst>%s</p:sldIdLst></p:presentation>' % (P, R, ids),
             'ppt/_rels/presentation.xml.rels': '<Relationships xmlns="%s">%s</Relationships>' % (REL, relationships)}
    for index, n in enumerate(names):
        text = ('PPTFirstQuasar body keyword' if index == 0 else 'PPTSecondNeptune body keyword') if count == 2 else ('PPTCapTailExcluded' if index == count-1 else 'PPTBoundedPage %d' % (index+1))
        files['ppt/slides/slide%d.xml' % n] = '<p:sld xmlns:p="%s" xmlns:a="%s"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>%s</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>' % (P, A, text)
    if count == 2:
        files['ppt/slides/slide1.xml'] = '<p:sld xmlns:p="%s" xmlns:a="%s"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>OrphanSlideMustNotIndex</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>' % (P, A)
    return package(files)


def pdf(kind='text', pages=2):
    from reportlab.pdfgen import canvas
    output = io.BytesIO()
    document = canvas.Canvas(output, pagesize=(300, 200), pageCompression=1)
    for number in range(1, pages + 1):
        if kind == 'image' or kind == 'mixed' and number == 2:
            from PIL import Image, ImageDraw
            from reportlab.lib.utils import ImageReader
            image = Image.new('RGB', (200, 70), 'white')
            ImageDraw.Draw(image).text((10, 20), 'ScannedImageOnlyKeyword', fill='black')
            document.drawImage(ImageReader(image), 10, 20, 200, 70)
        else:
            text = 'MixedPDFAuriga text page' if kind == 'mixed' else ('PDFFirstOrion body only' if number == 1 else 'PDFSecondVega body only') if pages == 2 else ('PDFCapTailExcluded' if number == pages else 'PDFBoundedPage %d' % number)
            document.drawString(20, 100, text)
        document.showPage()
    document.save()
    return output.getvalue()


def fixtures():
    from pypdf import PdfReader, PdfWriter
    encrypted = io.BytesIO()
    writer = PdfWriter()
    for page in PdfReader(io.BytesIO(pdf())).pages:
        writer.add_page(page)
    writer.encrypt('synthetic-password')
    writer.write(encrypted)
    html = b'''<!doctype html><html><head><style>.StyleTrapMustNotIndex{color:red}</style><script>window.fullTextUnsafe=1;fetch('https://fulltext-fixture.invalid/script')</script></head><body><h1>HeliosHTMLBodyKey</h1><p>&lt;img src=x onerror=window.fullTextUnsafe=1&gt; literal snippet</p><script>ScriptTrapMustNotIndex</script><template>TemplateTrapMustNotIndex</template><iframe src="https://fulltext-fixture.invalid/frame"></iframe><img src="https://fulltext-fixture.invalid/pixel" onerror="window.fullTextUnsafe=1"><p>Visible ending.</p></body></html>'''
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from requirement_fixtures import compound
    data = [
        ('Body-only word.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', docx()),
        ('Ordered deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pptx()),
        ('Text pages.pdf', 'application/pdf', pdf()),
        ('Image only.pdf', 'application/pdf', pdf('image', 1)),
        ('Mixed pages.pdf', 'application/pdf', pdf('mixed', 2)),
        ('Encrypted.pdf', 'application/pdf', encrypted.getvalue()),
        ('Corrupt container.pdf', 'application/pdf', b'%PDF-1.7\nSynthetic invalid object and xref\n%%EOF\n'),
        ('Visible source.html', 'text/html', html),
        ('Old word.doc', 'application/msword', compound('WordDocument')),
        ('Old slides.ppt', 'application/vnd.ms-powerpoint', compound('PowerPoint Document')),
        ('Too many pages.pdf', 'application/pdf', pdf(pages=501)),
        ('Too many slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pptx(501)),
        ('Too many sections.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', docx(['DOCXBoundedSection %d' % i for i in range(2001)] + ['DOCXCapTailExcluded'])),
        ('Long body.html', 'text/html', ('<html><body><p>' + 'SyntheticToken ' * 75000 + 'HTMLCapTailExcluded</p></body></html>').encode()),
    ]
    return [{'name': name, 'mime': mime, 'contentBase64': base64.b64encode(body).decode()} for name, mime, body in data]

if __name__ == '__main__':
    print(json.dumps(fixtures()))
