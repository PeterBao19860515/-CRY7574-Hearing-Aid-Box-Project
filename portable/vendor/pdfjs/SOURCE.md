# Mozilla PDF.js offline distribution

Pinned package: `pdfjs-dist` **5.6.205**. Source: https://github.com/mozilla/pdf.js and https://www.npmjs.com/package/pdfjs-dist/v/5.6.205 . API reference: https://mozilla.github.io/pdf.js/api/ .

Copied unchanged from the locally installed published distribution: `build/pdf.min.mjs`, `build/pdf.worker.min.mjs`, `cmaps/` and `standard_fonts/`. Mozilla PDF.js is Apache-2.0; included CMap and standard-font license notices retain their respective upstream terms. The standalone builder also embeds all license texts in the inert `document-index-assets` JSON block.

The app lazily imports these bundled modules using Blob URLs. HTTP/HTTPS uses a dedicated module worker; double-click `file:` uses PDF.js's official main-thread worker implementation because opaque file-origin module workers can be blocked by the browser. Both parse the same original PDF bytes. No scripts, PDF forms, annotations or document JavaScript are executed, and no image/OCR rendering is performed. `isEvalSupported` and XFA are disabled. CMaps and standard-font bytes come only from the embedded byte map; there is no CDN or network fallback. Extraction has text/page limits and a cooperative 60-second budget (a dedicated worker can additionally be terminated).
