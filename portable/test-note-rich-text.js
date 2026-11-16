/* Canonical, offline formatting shared by the note editor and workspace storage. */
(function () {
  'use strict';

  const tags = new Set(['P', 'DIV', 'BR', 'H2', 'H3', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);
  const blocks = new Set(['P', 'DIV', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);
  const discard = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH']);
  const keys = ['environment', 'procedure', 'description'];

  const imageId = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);

  function copyColor(source, target, property) {
    const value = source.style?.[property] || '';
    // Only keep opaque RGB colors. No other CSS or HTML attributes are copied.
    if (/^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i.test(value) ||
        /^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/.test(value)) {
      target.style[property] = value;
    }
  }

  function clean(value, { removeImages = new Set(), allowImages = true } = {}) {
    if (typeof value !== 'string' || value.length > 200000) throw Error('Formatted text is too large.');
    const template = document.createElement('template');
    template.innerHTML = value;
    const output = document.createElement('div');
    function copy(source, target, depth) {
      if (depth > 60) throw Error('Formatting is nested too deeply.');
      for (const child of source.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          target.append(document.createTextNode(child.data));
        } else if (child.nodeType === Node.ELEMENT_NODE && !discard.has(child.tagName) &&
                   child.namespaceURI === 'http://www.w3.org/1999/xhtml') {
          const reference = child.getAttribute('data-note-image');
          if (child.tagName === 'SPAN' && imageId(reference)) {
            if (allowImages && !removeImages.has(reference)) {
              const marker = document.createElement('span');
              marker.dataset.noteImage = reference;
              target.append(marker);
            }
          } else if (tags.has(child.tagName) || child.tagName === 'SPAN') {
            const node = document.createElement(child.tagName.toLowerCase());
            copyColor(child, node, 'color');
            copyColor(child, node, 'backgroundColor');
            copy(child, node, depth + 1);
            if (child.tagName === 'SPAN' && !node.hasAttribute('style')) target.append(...node.childNodes);
            else target.append(node);
          } else {
            copy(child, target, depth + 1);
          }
        }
      }
    }
    copy(template.content, output, 0);
    // Reparse so flattened markup is stored as valid HTML.
    template.innerHTML = output.innerHTML;
    output.replaceChildren();
    copy(template.content, output, 0);
    let plain = '';
    function boundary() {
      if (plain && !plain.endsWith('\n')) plain += '\n';
    }
    function read(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        plain += node.data;
        return;
      }
      if (node.tagName === 'BR') {
        plain += '\n';
        return;
      }
      if (blocks.has(node.tagName)) boundary();
      for (const child of node.childNodes) read(child);
      if (blocks.has(node.tagName)) boundary();
    }
    read(output);
    plain = plain.trim();
    const images = Array.from(output.querySelectorAll('[data-note-image]'), marker => marker.dataset.noteImage);
    return { html: plain || images.length ? output.innerHTML : '', plain, images };
  }

  function show(element, html, plain) {
    if (html) {
      try {
        element.innerHTML = clean(html).html;
        return;
      } catch {
        // An unreadable formatting record can still be displayed as text.
      }
    }
    element.textContent = plain || '';
  }

  window.TestNoteRichText = { clean, keys, show, imageId };
})();
