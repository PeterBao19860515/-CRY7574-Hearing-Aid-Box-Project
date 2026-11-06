# Requirement full-text search

The local standalone application searches titles, filenames, Notes and extracted document text. New uploads are indexed after the original document is saved. To index documents already in the workspace, open **Requirement → Rebuild index**. Each card also has **Index document** or **Rebuild index**.

Search uses a literal, case-insensitive phrase with normalized whitespace. Results show up to three matching text excerpts per document, highlight the phrase and identify the PDF page, presentation slide or extracted section when available. Word/HTML section numbers describe extracted blocks; they are not printed page numbers. Existing metadata search continues to work when body extraction is unavailable.

| Format | Searchable content | Important limits |
| --- | --- | --- |
| DOCX | Main body paragraphs and table rows | Headers, footnotes, comments and embedded objects are excluded |
| PPTX | Slide text, in presentation order | Images, speaker notes and embedded objects are excluded |
| PDF | Extractable text, with PDF page numbers | Image-only/scanned content requires OCR; locked or damaged files show a failure |
| HTML/HTM | Inert text extraction | Scripts, styles, active elements and explicitly hidden content are excluded |
| DOC/PPT | Title, filename and Note | Original file remains downloadable; save a DOCX/PPTX copy for body indexing |

The cards distinguish **Indexed**, **Partially indexed**, **No extractable text**, **Unsupported for text indexing**, **Text extraction failed** and **Not indexed**. Partial coverage and extraction failures must not be interpreted as a complete search returning no matches. Blank or image-only pages/slides may have no searchable text.

Extracted indexes are disposable local caches. They do not change original documents, Notes, document revisions, measurement data or frozen reports. The complete workspace backup retains the original documents; it excludes text caches. After restoring a backup, rebuild indexes from those originals. Cache identity includes the document SHA-256 and extraction version; document deletion and workspace restoration invalidate it.

Extraction is bounded to 1,000,000 text characters and 2,000 segments per document, up to 500 PDF pages or presentation slides. Office ZIP limits also apply. A document that reaches an extraction limit is marked partial. The combined text cache is limited to 32 MiB; older derived indexes may be evicted and can be rebuilt. The coverage summary shows currently searchable documents. Parsing and PDF resources run locally without a CDN or a translation/OCR service.

This is a local feature update. It does not publish a cloud release, push code or increment the product version.
