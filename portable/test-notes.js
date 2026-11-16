/* Test notes keep text and attachments together in a single save. */
(function () {
  'use strict';

  const fields = ['title', 'testTime', 'environment', 'procedure', 'description'];
  const mediaTypes = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', qt: 'video/quicktime',
  };
  const MiB = 1024 * 1024;
  const perPage = 30;
  const $ = id => document.getElementById(id);
  const translate = value => window.I18n?.t(value) ?? value;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  function action(text, onClick) {
    const button = element('button', text);
    button.type = 'button';
    button.onclick = onClick;
    return button;
  }

  async function encode(file, mime) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let start = 0; start < bytes.length; start += 32768) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
    }
    return { name: file.name, mime, contentBase64: btoa(binary) };
  }

  function mount({ request, notify }) {
    const editor = $('testNoteEditor');
    const form = $('testNoteForm');
    const richEditors = [...form.querySelectorAll('[data-test-note-field]')];
    let activeField = richEditors[0];
    let activeRange;
    let changedFields = new Set();
    let dirty = false;
    const deleteDialog = $('testNoteDeleteDialog');
    const deleteForm = $('testNoteDeleteForm');
    const grid = $('testNoteMediaGrid');
    let notes = [];
    let currentId = '';
    let visible = false;
    let page = 0;
    let loading = false;
    let loadError = '';
    let loadSequence = 0;
    let listSignature = '';
    let mediaSignature = '';
    let draft = null;
    let pending = [];
    let removed = new Set();
    let deleting = null;
    let saving = false;
    let deleteBusy = false;
    let mediaGeneration = 0;
    let mediaQueue = [];
    let mediaReading = false;
    const previewUrls = new Set();
    const inlineUrls = new Map();
    let inlineVersion = 0;
    let detailRevision = '';
    const imageExtensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
    const downloadUrls = new Set();
    const mediaJobs = new WeakMap();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const job = mediaJobs.get(entry.target);
        if (job) mediaQueue.push(job);
      }
      readPreviews();
    }, { rootMargin: '200px' });

    const noteById = id => notes.find(note => note.id === id);
    const timeText = value => value ? value.replace('T', ' ') : translate('Test time not recorded');
    const mediaPath = (id, mediaId) => '/api/test-notes/' + encodeURIComponent(id) + '/media/' + encodeURIComponent(mediaId);
    const localCount = (count, english, chinese) => window.I18n?.getLanguage() === 'zh' ? count + chinese : count + ' ' + english;

    function releaseInlineImages() {
      inlineVersion++;
      detailRevision = '';
      for (const url of inlineUrls.values()) Promise.resolve(url).then(value => { if (value) URL.revokeObjectURL(value); });
      inlineUrls.clear();
    }

    function hydrateImages(container, note) {
      const version = inlineVersion;
      for (const marker of container.querySelectorAll('[data-note-image]')) {
        const id = marker.dataset.noteImage;
        const file = pending.find(entry => entry.inlineId === id)?.file;
        const media = note?.media.find(item => item.id === id);
        marker.contentEditable = 'false';
        marker.hidden = removed.has(id);
        if (marker.firstChild || (!file && !media)) continue;
        const img = element('img');
        img.alt = file?.name || media.name;
        img.loading = 'lazy';
        img.draggable = false;
        marker.append(img);
        if (!inlineUrls.has(id)) {
          const url = file ? Promise.resolve(URL.createObjectURL(file))
            : request(mediaPath(note.id, id)).then(blob => URL.createObjectURL(blob)).catch(() => null);
          inlineUrls.set(id, url);
        }
        inlineUrls.get(id).then(url => {
          if (version === inlineVersion && img.isConnected && url) img.src = url;
        });
      }
    }

    function stopPreviews() {
      mediaGeneration++;
      mediaSignature = '';
      mediaQueue = [];
      observer.disconnect();
      for (const video of grid.querySelectorAll('video')) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      for (const url of previewUrls) URL.revokeObjectURL(url);
      previewUrls.clear();
      grid.replaceChildren();
    }

    async function readPreviews() {
      if (mediaReading) return;
      mediaReading = true;
      try {
        while (mediaQueue.length) {
          const job = mediaQueue.shift();
          if (job.generation !== mediaGeneration || !job.frame.isConnected) continue;
          try {
            const blob = await request(mediaPath(job.noteId, job.item.id));
            if (job.generation !== mediaGeneration || !job.frame.isConnected) continue;
            if (!(blob instanceof Blob) || blob.size !== job.item.size) throw Error('Original attachment is unavailable.');
            const url = URL.createObjectURL(blob);
            previewUrls.add(url);
            job.frame.onerror = () => {
              if (job.generation === mediaGeneration) {
                job.status.textContent = 'This browser cannot preview the attachment.';
                job.frame.hidden = true;
              }
            };
            job.frame.src = url;
            job.frame.hidden = false;
            job.status.textContent = '';
          } catch (error) {
            if (job.generation === mediaGeneration) job.status.textContent = translate('Preview unavailable') + ' · ' + error.message;
          }
        }
      } finally {
        mediaReading = false;
      }
    }

    async function download(noteId, media, button, status) {
      button.disabled = true;
      try {
        const blob = await request(mediaPath(noteId, media.id));
        if (!(blob instanceof Blob) || blob.size !== media.size) throw Error('Original attachment is unavailable.');
        const url = URL.createObjectURL(blob);
        downloadUrls.add(url);
        const link = element('a');
        link.href = url;
        link.download = media.name;
        link.click();
        setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url); }, 30000);
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    }

    function renderMedia(note) {
      const signature = JSON.stringify([note.id, note.media.map(item => [item.id, item.sha256])]);
      if (signature === mediaSignature) return;
      stopPreviews();
      mediaSignature = signature;
      $('testNoteMediaEmpty').hidden = note.media.length > 0;
      for (const item of note.media) {
        const card = element('article', undefined, 'test-note-media');
        card.dataset.testNoteMediaId = item.id;
        const preview = element('div', undefined, 'test-note-media-preview');
        const isVideo = item.mime.startsWith('video/');
        const frame = element(isVideo ? 'video' : 'img');
        frame.hidden = true;
        if (isVideo) {
          frame.controls = true;
          frame.playsInline = true;
          frame.preload = 'metadata';
          frame.setAttribute('aria-label', item.name);
        } else {
          frame.alt = item.name;
        }
        const status = element('p', 'Loading preview…', 'micro');
        status.dataset.i18n = '';
        status.setAttribute('role', 'status');
        preview.append(frame, status);
        const name = element('strong', item.name);
        name.dataset.userContent = '';
        const button = action('Download original', () => download(note.id, item, button, status));
        card.append(preview, name, button);
        grid.append(card);
        mediaJobs.set(card, { noteId: note.id, item, frame, status, generation: mediaGeneration });
        observer.observe(card);
      }
    }

    function renderDetail() {
      const note = noteById(currentId);
      if (!editor.hidden) {
        $('testNoteDetail').hidden = true;
        $('testNoteDetailEmpty').hidden = true;
        return;
      }
      $('testNoteDetail').hidden = !note;
      $('testNoteDetailEmpty').hidden = !!note || !notes.length;
      if (!note) {
        if (mediaSignature) stopPreviews();
        if (detailRevision) releaseInlineImages();
        return;
      }
      if (detailRevision !== note.revision) {
        releaseInlineImages();
        detailRevision = note.revision;
        $('testNoteDetailTitle').textContent = note.title;
        $('testNoteDetailTime').textContent = timeText(note.testTime);
        for (const [key, id] of [['environment', 'testNoteDetailEnvironment'], ['procedure', 'testNoteDetailProcedure'], ['description', 'testNoteDetailDescription']]) {
          TestNoteRichText.show($(id), note.richText?.[key], note[key]);
          hydrateImages($(id), note);
          $(id).parentElement.hidden = !note[key] && !note.richText?.[key];
        }
      }
      renderMedia(note);
    }

    function render() {
      if (!visible) return;
      const query = $('testNoteSearch').value.trim().toLocaleLowerCase();
      const matching = notes.filter(note => fields.some(key => note[key].toLocaleLowerCase().includes(query)));
      const pages = Math.max(1, Math.ceil(matching.length / perPage));
      page = Math.min(page, pages - 1);
      if (currentId && !noteById(currentId)) currentId = '';
      const signature = JSON.stringify([query, page, window.I18n?.getLanguage(), matching.map(note => [note.id, note.revision])]);
      if (signature !== listSignature) {
        listSignature = signature;
        $('testNotesList').replaceChildren(...matching.slice(page * perPage, (page + 1) * perPage).map(note => {
          const button = action('', () => {
            currentId = note.id;
            render();
            $('testNoteDetailTitle').focus({ preventScroll: true });
            if (matchMedia('(max-width: 760px)').matches) $('testNoteDetail').scrollIntoView({ block: 'start' });
          });
          button.className = 'test-note-list-item';
          button.dataset.testNoteOpen = note.id;
          const title = element('strong', note.title);
          title.dataset.userContent = '';
          button.append(title, element('small', timeText(note.testTime)), element('small', localCount(note.media.length, 'attachments', ' 个附件')));
          return button;
        }));
      }
      for (const button of $('testNotesList').querySelectorAll('button')) {
        button.setAttribute('aria-current', String(button.dataset.testNoteOpen === currentId));
        button.disabled = !editor.hidden;
      }
      $('testNotesEmpty').hidden = !!matching.length || loading || !!loadError;
      $('testNotesEmpty').textContent = translate(query ? 'No matching test notes.' : 'No test notes yet. Add a note to start recording a test.');
      $('testNotesLoadStatus').textContent = loadError || (loading ? translate('Loading test notes…') : '');
      $('testNotesCount').textContent = localCount(matching.length, 'test notes', ' 条测试笔记');
      $('testNotesPage').textContent = page + 1 + ' / ' + pages;
      $('testNotesPrev').disabled = page === 0;
      $('testNotesNext').disabled = page + 1 >= pages;
      renderDetail();
    }

    async function refresh(force = false) {
      if (!visible || loading && !force) return;
      const token = ++loadSequence;
      loading = true;
      loadError = '';
      render();
      try {
        const result = await request('/api/test-notes');
        if (token !== loadSequence) return;
        notes = result.notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
      } catch (error) {
        if (token === loadSequence) loadError = error.message;
      } finally {
        if (token === loadSequence) { loading = false; render(); }
      }
    }

    function edit(note = null) {
      if (!editor.hidden) return;
      releaseInlineImages();
      draft = note;
      changedFields = new Set();
      dirty = false;
      activeField = richEditors[0];
      activeRange = null;
      pending = [];
      removed = new Set();
      form.reset();
      $('testNoteError').textContent = '';
      $('testNoteEditorTitle').textContent = note ? 'Edit test note' : 'New test note';
      for (const key of ['title', 'testTime']) form.elements.namedItem(key).value = note?.[key] || '';
      for (const field of richEditors) {
        const key = field.dataset.testNoteField;
        TestNoteRichText.show(field, note?.richText?.[key], note?.[key]);
        hydrateImages(field, note);
      }
      renderAttachments();
      stopPreviews();
      editor.hidden = false;
      $('addTestNote').disabled = true;
      render();
      form.elements.namedItem('title').focus();
    }

    function closeEditor() {
      releaseInlineImages();
      editor.hidden = true;
      draft = null;
      pending = [];
      removed.clear();
      dirty = false;
      $('addTestNote').disabled = false;
      render();
      const returnTarget = noteById(currentId) ? $('editTestNote') : $('addTestNote');
      returnTarget.focus();
    }

    function rememberSelection() {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const field = richEditors.find(node => node.contains(range.startContainer) && node.contains(range.endContainer));
      if (!field) return;
      activeField = field;
      activeRange = range.cloneRange();
    }

    document.addEventListener('selectionchange', rememberSelection);
    for (const field of richEditors) {
      field.addEventListener('focus', () => {
        if (activeField !== field) activeRange = null;
        activeField = field;
      });
      field.addEventListener('input', () => changedFields.add(field.dataset.testNoteField));
      field.addEventListener('paste', event => {
        event.preventDefault();
        const files = Array.from(event.clipboardData?.files || []);
        if (files.length) {
          insertImages(field, files, window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null);
          return;
        }
        const html = event.clipboardData?.getData('text/html');
        if (html) {
          try {
            const safe = TestNoteRichText.clean(html, { allowImages: false }).html;
            if (safe) {
              document.execCommand('insertHTML', false, safe);
              return;
            }
          } catch {
            // Fall back to the clipboard's plain text when rich content is too large.
          }
        }
        document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '');
      });
      field.addEventListener('dragover', event => {
        event.preventDefault();
        if (!saving && Array.from(event.dataTransfer?.types || []).includes('Files')) {
          event.dataTransfer.dropEffect = 'copy';
          field.classList.add('test-note-drop-target');
        }
      });
      field.addEventListener('dragleave', event => {
        if (!field.contains(event.relatedTarget)) field.classList.remove('test-note-drop-target');
      });
      field.addEventListener('drop', event => {
        event.preventDefault();
        field.classList.remove('test-note-drop-target');
        const files = Array.from(event.dataTransfer?.files || []);
        const position = document.caretPositionFromPoint?.(event.clientX, event.clientY);
        let range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
        if (position) {
          range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
        }
        if (files.length) insertImages(field, files, range);
      });
    }
    function focusRange(field, range, collapse = false) {
      const within = range && field.contains(range.startContainer) && field.contains(range.endContainer);
      field.focus();
      if (!within || (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest('[data-note-image]')) {
        range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(false);
      } else if (collapse) {
        range = range.cloneRange();
        range.collapse(true);
      }
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function applyFormat(command, value, withColor = false) {
      rememberSelection();
      focusRange(activeField, activeRange);
      document.execCommand('styleWithCSS', false, withColor);
      try {
        document.execCommand(command, false, value || null);
        if (command === 'hiliteColor') document.execCommand('foreColor', false, '#202124');
      } finally {
        document.execCommand('styleWithCSS', false, false);
      }
      changedFields.add(activeField.dataset.testNoteField);
      dirty = true;
      rememberSelection();
    }

    for (const button of form.querySelectorAll('[data-note-command]')) {
      button.addEventListener('mousedown', event => event.preventDefault());
      button.onclick = () => applyFormat(button.dataset.noteCommand, button.dataset.noteValue);
    }
    for (const [id, command] of [['testNoteTextColor', 'foreColor'], ['testNoteHighlight', 'hiliteColor']]) {
      $(id).addEventListener('pointerdown', rememberSelection);
      $(id).onchange = event => {
        if (event.target.value) applyFormat(command, event.target.value, true);
        event.target.value = '';
      };
    }

    $('insertTestNoteImage').onclick = () => $('testNoteInlineFiles').click();
    $('testNoteInlineFiles').onchange = event => {
      const files = Array.from(event.target.files);
      event.target.value = '';
      if (files.length) insertImages(activeField, files, activeRange);
    };

    function insertImages(field, files, range) {
      if (saving) return;
      try {
        const entries = prepareFiles(files, true);
        focusRange(field, range, true);
        const selection = window.getSelection();
        const caret = selection.getRangeAt(0);
        const fragment = document.createDocumentFragment();
        let last;
        for (const entry of entries) {
          last = element('span');
          last.dataset.noteImage = entry.inlineId;
          last.contentEditable = 'false';
          fragment.append(last);
        }
        caret.insertNode(fragment);
        caret.setStartAfter(last);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
        pending.push(...entries);
        dirty = true;
        changedFields.add(field.dataset.testNoteField);
        hydrateImages(field, draft);
        renderAttachments();
        $('testNoteError').textContent = '';
        rememberSelection();
      } catch (error) {
        $('testNoteError').textContent = error.message;
      }
    }

    form.addEventListener('input', () => { dirty = true; });
    window.addEventListener('beforeunload', event => {
      if (!dirty && !saving) return;
      event.preventDefault();
      event.returnValue = '';
    });
    $('cancelTestNoteEdit').onclick = () => {
      if (!dirty || confirm(translate('Discard unsaved changes?'))) closeEditor();
    };

    function renderAttachments() {
      const items = [];
      for (const media of draft?.media || []) {
        const row = element('li');
        const name = element('span', media.name);
        name.dataset.userContent = '';
        const remove = action(removed.has(media.id) ? 'Undo removal' : 'Remove', () => {
          dirty = true;
          if (removed.has(media.id)) {
            if (draft.media.length - removed.size + pending.length >= 12) {
              $('testNoteError').textContent = translate('Remove a new attachment before undoing this removal.');
              return;
            }
            removed.delete(media.id);
          } else {
            removed.add(media.id);
          }
          $('testNoteError').textContent = '';
          for (const field of richEditors) hydrateImages(field, draft);
          renderAttachments();
          [...$('testNoteStagedFiles').querySelectorAll('[data-test-note-remove-media]')].find(button => button.dataset.testNoteRemoveMedia === media.id)?.focus();
        });
        row.dataset.removed = String(removed.has(media.id));
        remove.dataset.testNoteRemoveMedia = media.id;
        row.append(name, remove);
        items.push(row);
      }
      for (const [index, entry] of pending.entries()) {
        const row = element('li');
        const name = element('span', entry.file.name);
        name.dataset.userContent = '';
        const remove = action('Remove', () => {
          dirty = true;
          pending.splice(index, 1);
          if (entry.inlineId) {
            for (const field of richEditors) {
              for (const marker of field.querySelectorAll(`[data-note-image="${entry.inlineId}"]`)) marker.remove();
            }
            inlineUrls.get(entry.inlineId)?.then(url => { if (url) URL.revokeObjectURL(url); });
            inlineUrls.delete(entry.inlineId);
          }
          renderAttachments();
          $('chooseTestNoteFiles').focus();
        });
        remove.dataset.testNoteRemovePending = String(index);
        row.append(name, remove);
        items.push(row);
      }
      $('testNoteStagedFiles').replaceChildren(...items);
      const count = (draft?.media.length || 0) - removed.size + pending.length;
      $('testNoteFilesStatus').textContent = localCount(count, 'of 12 attachments', ' / 12 个附件');
    }

    $('chooseTestNoteFiles').onclick = () => $('testNoteFiles').click();
    $('testNoteFiles').onchange = event => {
      const files = Array.from(event.target.files);
      event.target.value = '';
      if (!files.length || saving) return;
      try {
        const next = prepareFiles(files);
        dirty = true;
        pending.push(...next);
        $('testNoteError').textContent = '';
        renderAttachments();
      } catch (error) {
        $('testNoteError').textContent = error.message;
      }
    };

    function prepareFiles(files, inline = false) {
      const next = files.map((file, index) => {
        let mime = mediaTypes[file.name.split('.').at(-1).toLowerCase()];
        if (inline && !mime && imageExtensions[file.type]) {
          mime = file.type;
          const name = `Screenshot-${Date.now()}-${index + 1}.${imageExtensions[mime]}`;
          file = new File([file], name, { type: mime });
        }
        if (inline && !imageExtensions[mime]) throw Error(translate('Insert a PNG, JPG, WebP or GIF screenshot.'));
        if (!mime) throw Error(translate('Choose JPG, PNG, WebP, GIF, MP4, WebM, MOV or QT files.'));
        if (!file.size || file.size > (mime.startsWith('image/') ? 20 : 50) * MiB) throw Error(file.name + ' · ' + translate('Attachment exceeds its file size limit or is empty.'));
        const inlineId = inline ? Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('') : undefined;
        return { file, mime, inlineId };
      });
      if ((draft?.media.length || 0) - removed.size + pending.length + next.length > 12) throw Error(translate('A test note can have up to 12 attachments.'));
      if ([...pending, ...next].reduce((total, item) => total + item.file.size, 0) > 50 * MiB) throw Error(translate('New attachments must total 50 MiB or less.'));
      return next;
    }

    function lock(dialog, value) {
      for (const control of dialog.querySelectorAll('input,textarea,button,select')) control.disabled = value;
    }

    form.onsubmit = async event => {
      event.preventDefault();
      if (saving) return;
      const body = Object.fromEntries(new FormData(form));
      const reviewed = draft;
      saving = true;
      lock(editor, true);
      for (const field of richEditors) field.contentEditable = 'false';
      $('testNoteError').textContent = '';
      try {
        body.richText = Object.fromEntries(richEditors
          .filter(field => changedFields.has(field.dataset.testNoteField) || (!reviewed && field.textContent.trim()))
          .map(field => [field.dataset.testNoteField, TestNoteRichText.clean(field.innerHTML).html]));
        body.files = [];
        for (const entry of pending) {
          const file = await encode(entry.file, entry.mime);
          if (entry.inlineId) file.inlineId = entry.inlineId;
          body.files.push(file);
        }
        if (reviewed) {
          body.expectedRevision = reviewed.revision;
          body.removeMediaIds = [...removed];
        }
        const result = await request(reviewed ? '/api/test-notes/' + encodeURIComponent(reviewed.id) : '/api/test-notes', {
          method: reviewed ? 'PATCH' : 'POST', body,
        });
        currentId = result.note?.id || result.id || reviewed?.id || '';
        if (!reviewed) { $('testNoteSearch').value = ''; page = 0; }
        closeEditor();
        await refresh(true);
        if (visible) $('testNoteDetailTitle').focus();
        notify?.(translate('Test note saved.'));
      } catch (error) {
        $('testNoteError').textContent = error.message;
      } finally {
        saving = false;
        lock(editor, false);
        for (const field of richEditors) field.contentEditable = 'true';
      }
    };

    function deleteReady() {
      $('confirmTestNoteDelete').disabled = deleteBusy || !$('testNoteDeleteConfirm').checked || !$('testNoteDeletePassword').value;
    }

    $('deleteTestNote').onclick = () => {
      deleting = noteById(currentId);
      if (!deleting) return;
      deleteForm.reset();
      $('testNoteDeleteScope').textContent = deleting.title;
      $('testNoteDeleteError').textContent = '';
      deleteReady();
      deleteDialog.showModal();
    };
    $('testNoteDeletePassword').oninput = deleteReady;
    $('testNoteDeleteConfirm').onchange = deleteReady;
    deleteForm.onsubmit = async event => {
      event.preventDefault();
      if (deleteBusy || !deleting || $('confirmTestNoteDelete').disabled) return;
      const body = { confirmed: true, password: $('testNoteDeletePassword').value, expectedRevision: deleting.revision };
      deleteBusy = true;
      lock(deleteDialog, true);
      $('testNoteDeleteError').textContent = '';
      try {
        await request('/api/test-notes/' + encodeURIComponent(deleting.id) + '/delete', { method: 'POST', body });
        currentId = '';
        deleteDialog.close();
        await refresh(true);
        notify?.(translate('Test note deleted.'));
      } catch (error) {
        $('testNoteDeleteError').textContent = error.message;
      } finally {
        deleteBusy = false;
        lock(deleteDialog, false);
        $('testNoteDeletePassword').value = '';
        $('testNoteDeleteConfirm').checked = false;
        deleteReady();
      }
    };
    deleteDialog.addEventListener('cancel', event => { if (deleteBusy) event.preventDefault(); });
    deleteDialog.addEventListener('close', () => { deleting = null; deleteForm.reset(); });
    $('addTestNote').onclick = () => edit();
    $('editTestNote').onclick = () => { const note = noteById(currentId); if (note) edit(note); };
    $('testNoteSearch').oninput = () => { page = 0; render(); };
    $('testNotesPrev').onclick = () => { page--; render(); };
    $('testNotesNext').onclick = () => { page++; render(); };
    window.addEventListener('cry-language-change', () => { render(); if (!editor.hidden && !saving) renderAttachments(); });
    window.addEventListener('pagehide', () => {
      stopPreviews();
      releaseInlineImages();
      for (const url of downloadUrls) URL.revokeObjectURL(url);
      downloadUrls.clear();
    });
    return {
      open() { if (!visible) { visible = true; refresh(); } },
      leave() { if (visible) { visible = false; loading = false; loadSequence++; stopPreviews(); if (editor.hidden) releaseInlineImages(); } },
      refresh,
    };
  }

  window.TestNotes = { mount };
})();
