"""Synthetic cover pixels/containers only. Never opens a user document."""
import base64
import io
import json
import zipfile
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
from requirement_search_fixtures import docx, pptx
from requirement_fixtures import compound


def page_pdf(image_only=False):
    out = io.BytesIO()
    pdf = canvas.Canvas(out, pagesize=(300, 200), pageCompression=1)
    if image_only:
        image = Image.new('RGB', (300, 200), (235, 40, 55))
        image.paste((30, 180, 80), (150, 0, 300, 200))
        pdf.drawImage(ImageReader(image), 0, 0, 300, 200)
    else:
        pdf.setFillColorRGB(.92, .08, .12)
        pdf.rect(0, 0, 150, 200, fill=1, stroke=0)
        pdf.setFillColorRGB(.08, .72, .18)
        pdf.rect(150, 0, 150, 200, fill=1, stroke=0)
        pdf.setFillColorRGB(0, 0, 0)
        pdf.drawString(10, 100, 'Synthetic page one cover')
    pdf.showPage()
    pdf.setFillColorRGB(.05, .05, .95)
    pdf.rect(0, 0, 300, 200, fill=1, stroke=0)
    pdf.drawString(10, 100, 'Synthetic second page must not be cover')
    pdf.showPage()
    pdf.save()
    return out.getvalue()


def office_cover(data):
    image = Image.new('RGB', (240, 160), (210, 45, 190))
    out = io.BytesIO()
    image.save(out, format='JPEG', quality=95)
    archive = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as old, zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as new:
        for name in old.namelist():
            new.writestr(name, old.read(name))
        new.writestr('docProps/thumbnail.jpeg', out.getvalue())
    return archive.getvalue()


def fixtures():
    html = b'''<!doctype html><html><head><script>window.coverUnsafe=1;fetch('https://cover-fixture.invalid/script')</script><style>.HiddenStyleCoverTrap{color:red}</style></head><body><h1>Visible synthetic HTML heading</h1><p>Inert excerpt, not a rendered web page.</p><img src="https://cover-fixture.invalid/pixel" onerror="window.coverUnsafe=1"><iframe src="https://cover-fixture.invalid/frame"></iframe></body></html>'''
    data = [('Page one colors.pdf', 'application/pdf', page_pdf()),
            ('Scanned colors.pdf', 'application/pdf', page_pdf(True)),
            ('Embedded word.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', office_cover(docx())),
            ('Embedded slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', office_cover(pptx())),
            ('No embedded cover.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', docx()),
            ('Inert cover.html', 'text/html', html),
            ('Legacy document.doc', 'application/msword', compound('WordDocument')),
            ('Broken render.pdf', 'application/pdf', b'%PDF-1.7\nSynthetic broken xref\n%%EOF\n')]
    return [{'name': n, 'mime': m, 'contentBase64': base64.b64encode(b).decode()} for n, m, b in data]


if __name__ == '__main__':
    print(json.dumps(fixtures()))
