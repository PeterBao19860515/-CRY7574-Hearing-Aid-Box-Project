// Test Notes acceptance uses only an empty public app, a temporary profile and synthetic fixtures.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/peter/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.env.CRY7574_TEST_NOTES_QA_HTML || path.join(root, 'dist/CRY7574 Hearing Aid Box Measurement Manage Software.html');
const artifact = await readFile(target);
const seed = JSON.parse(artifact.toString().match(/<script[^>]*id="portable-seed"[^>]*>([\s\S]*?)<\/script>/)[1]);
assert.equal(seed.charts.length, 0);
assert.equal(seed.sources.length, 0);
assert.equal(seed.testNotes?.length ?? 0, 0);
const temporary = await mkdtemp(path.join(os.tmpdir(), 'cry-test-notes-'));
const fixtures = await Promise.all([
  ['Synthetic red-blue photo.png', 'image/png'],
  ['Synthetic moving scene.mp4', 'video/mp4'],
].map(async ([name, mime]) => ({
  name, mime, bytes: await readFile(path.join(root, 'tests/fixtures/media', name)),
})));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileBody = ({ name, mime, bytes }) => ({ name, mime, contentBase64: bytes.toString('base64') });
const checks = [];
const errors = [];
const external = [];
const check = (description, condition) => {
  assert.ok(condition, description);
  checks.push(description);
  if (checks.length % 10 === 0) console.log(JSON.stringify({ checks: checks.length, description }));
};

const server = createServer((request, response) => {
  if (request.url === '/favicon.ico') {
    response.writeHead(204);
    response.end();
  } else if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(artifact);
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let context;
let page;
const api = (route, method = 'GET', body) => page.evaluate(
  ({ route, method, body }) => PortableAPI.request(route, method === 'GET' ? undefined : { method, body }),
  { route, method, body },
);
const ready = () => page.waitForFunction(() => window.WorkspaceApp?.getState());
const list = async () => (await api('/api/test-notes')).notes;

async function storeSnapshot() {
  return page.evaluate(async () => {
    const request = indexedDB.open(PortableAPI.storageName);
    const database = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const entries = await new Promise((resolve, reject) => {
        const transaction = database.transaction('workspace');
        const store = transaction.objectStore('workspace');
        const keys = store.getAllKeys();
        const values = store.getAll();
        transaction.oncomplete = () => resolve(keys.result.map((key, i) => [key, values.result[i]]));
        transaction.onerror = () => reject(transaction.error);
      });
      return Promise.all(entries.map(async ([key, value]) => {
        if (!(value instanceof Blob)) return [key, value];
        const digest = await crypto.subtle.digest('SHA-256', await value.arrayBuffer());
        const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        return [key, { sha256, size: value.size, type: value.type }];
      }));
    } finally {
      database.close();
    }
  });
}

async function rejectAtomic(description, route, method, body) {
  const before = await storeSnapshot();
  await assert.rejects(api(route, method, body));
  assert.deepEqual(await storeSnapshot(), before, description);
  check(description, true);
}

async function mediaBlob(noteId, mediaId) {
  return page.evaluate(async ({ noteId, mediaId }) => {
    const blob = await PortableAPI.request(`/api/test-notes/${noteId}/media/${mediaId}`);
    if (!(blob instanceof Blob)) throw Error('Expected original attachment Blob');
    return { mime: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
  }, { noteId, mediaId });
}

async function openBackups() {
  await page.locator('#openTools').click();
  await page.locator('[data-tool=backups]').click();
}

async function exportBackup() {
  await openBackups();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#exportBackup').click()]);
  const result = JSON.parse(await readFile(await download.path(), 'utf8'));
  await page.locator('#toolsDialog .close').first().click();
  return result;
}

async function restoreBackup(backup, invalid = false) {
  const before = invalid ? await storeSnapshot() : null;
  await openBackups();
  page.once('dialog', dialog => dialog.accept());
  const file = { name: 'Synthetic Test Notes backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) };
  if (invalid) {
    await page.locator('#restoreBackupFile').setInputFiles(file);
    await page.waitForFunction(() => document.querySelector('#portableBackupStatus').dataset.state === 'error');
    assert.deepEqual(await storeSnapshot(), before);
    await page.locator('#toolsDialog .close').first().click();
  } else {
    await Promise.all([page.waitForEvent('load'), page.locator('#restoreBackupFile').setInputFiles(file)]);
    await ready();
  }
}

async function openNote(id) {
  await page.locator('#tabTestNotes').click();
  await page.locator(`[data-test-note-open="${id}"]`).click();
  await page.locator('#editTestNote').waitFor({ state: 'visible' });
}

const sample = {
  title: 'Synthetic Test Notes acceptance',
  testTime: '2030-02-28T09:15',
  environment: 'Synthetic bench 2 at 23 C',
  procedure: 'Step 1: attach fixture\nStep 2: record measurement',
  description: 'Keep <em>literal source text</em> and blank lines.\n\nSynthetic only.',
};

try {
  context = await chromium.launchPersistentContext(path.join(temporary, 'profile'), {
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    acceptDownloads: true,
    viewport: { width: 1500, height: 1100 },
  });
  context.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(`${origin}/`)) external.push(request.url());
  });
  await context.route('**/*', route => /^https?:/.test(route.request().url()) && !route.request().url().startsWith(`${origin}/`) ? route.abort() : route.continue());
  page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(origin);
  await ready();

  check('Test Notes tab follows Requirement and opens with keyboard', await page.locator('#tabRequirement + #tabTestNotes').count() === 1);
  await page.locator('#tabTestNotes').focus();
  await page.keyboard.press('Enter');
  await page.locator('#testNotesView').waitFor({ state: 'visible' });
  check('Empty Test Notes list starts without sample records', (await list()).length === 0);
  await page.locator('#addTestNote').click();
  check('A new note does not infer a test time', await page.locator('#testNoteForm [name=testTime]').inputValue() === '');
  for (const [name, value] of Object.entries(sample)) {
    await page.locator(`#testNoteForm [name=${name}], #testNoteForm [data-test-note-field=${name}]`).fill(value);
  }
  check('Test note is edited in the workspace alongside its list', await page.locator('#testNotesView #testNoteEditor').isVisible() && !await page.locator('#testNoteForm').evaluate(node => !!node.closest('dialog')));
  const procedure = page.locator('[data-test-note-field=procedure]');
  await procedure.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.locator('[data-note-command=bold]').click();
  check('Toolbar bold formats the selected text directly in the editor', (await procedure.locator('b, strong').allTextContents()).join('\n') === sample.procedure);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#chooseTestNoteFiles').click()]);
  await chooser.setFiles(fixtures.map(({ name, mime, bytes }) => ({ name, mimeType: mime, buffer: bytes })));
  await page.locator('#saveTestNote').click();
  await page.locator('#testNoteEditor').waitFor({ state: 'hidden' });
  const [created] = await list();
  check('Actual form persists title/time/environment/procedure/description and two attachments', Object.entries(sample).every(([key, value]) => created[key] === value) && created.media.length === 2);
  check('Note summary exposes attachment metadata with revision and without original bodies', typeof created.revision === 'string' && created.media.every(item => !('contentBase64' in item)));
  await openNote(created.id);
  check('Saved bold renders in the note and keeps its plain text searchable', (await page.locator('#testNoteDetailProcedure :is(b, strong)').allTextContents()).join('\n') === sample.procedure && created.procedure === sample.procedure);
  check('Description markup is rendered as literal text', (await page.locator('#testNoteDetail').innerText()).includes('<em>literal source text</em>') && await page.locator('#testNoteDetail em').count() === 0);
  const image = page.locator('#testNoteMediaGrid img').first();
  const video = page.locator('#testNoteMediaGrid video').first();
  await page.waitForFunction(() => document.querySelector('#testNoteMediaGrid img')?.naturalWidth > 0);
  await image.evaluate(element => element.decode());
  check('Photo preview decodes actual original pixels', await image.evaluate(element => {
    const canvas = document.createElement('canvas');
    canvas.width = element.naturalWidth;
    canvas.height = element.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(element, 0, 0);
    return canvas.width > 0 && canvas.height > 0 && context.getImageData(20, 20, 1, 1).data[0] > 160;
  }));
  await page.waitForFunction(() => document.querySelector('#testNoteMediaGrid video')?.readyState >= 1);
  check('Video preview has native controls and awaits user playback', await video.evaluate(element => element.controls && !element.autoplay && element.paused && element.videoWidth > 0));
  await video.evaluate(element => element.play());
  await page.waitForFunction(() => document.querySelector('#testNoteMediaGrid video')?.currentTime > .1);
  await video.evaluate(element => element.pause());
  check('Original video plays locally', await video.evaluate(element => element.currentTime > .1));
  for (const fixture of fixtures) {
    const attachment = created.media.find(item => item.name === fixture.name);
    const original = await mediaBlob(created.id, attachment.id);
    check(`Original ${fixture.mime} bytes and SHA match the uploaded file`, original.mime === fixture.mime && Buffer.from(original.bytes).equals(fixture.bytes) && attachment.sha256 === sha(fixture.bytes));
  }
  const originalPhoto = created.media.find(item => item.mime === 'image/png');
  const [originalDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(`[data-test-note-media-id="${originalPhoto.id}"]`).getByRole('button', { name: 'Download original' }).click(),
  ]);
  check('Original download preserves exact name and photo bytes', originalDownload.suggestedFilename() === fixtures[0].name && (await readFile(await originalDownload.path())).equals(fixtures[0].bytes));
  const beforeEdit = await exportBackup();
  const savedNote = beforeEdit.data.testNotes.find(note => note.id === created.id);
  check('Complete backup contains the saved rich formatting', /<(b|strong)>/.test(savedNote.richText.procedure));
  const sanitized = await api('/api/test-notes', 'POST', {
    title: 'Synthetic rich paste',
    richText: { description: '<h2 onclick="window.testNoteExecuted=true">Results</h2><img src="https://invalid.example/pixel" onerror="window.testNoteExecuted=true"><script>window.testNoteExecuted=true</script><ol><li>Check signal</li></ol>' },
  });
  check('Rich content retains supported headings and lists while stripping active markup and remote images',
    sanitized.description === 'Results\nCheck signal' && sanitized.richText.description === '<h2>Results</h2><ol><li>Check signal</li></ol>');
  await api(`/api/test-notes/${sanitized.id}/delete`, 'POST', { confirmed: true, password: 'CRYSOUND', expectedRevision: sanitized.revision });
  check('Complete backup contains both original attachment byte streams', savedNote.media.every(item => item.contentBase64 === fixtures.find(fixture => fixture.name === item.name).bytes.toString('base64')));

  const photo = created.media.find(item => item.mime === 'image/png');
  await page.locator('#editTestNote').click();
  await page.locator(`[data-test-note-remove-media="${photo.id}"]`).click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cancelTestNoteEdit').click();
  check('Canceled removal leaves the saved attachment and revision intact', (await list()).find(note => note.id === created.id).media.length === 2 && (await list())[0].revision === created.revision);
  await page.locator('#editTestNote').click();
  await page.locator('#testNoteForm [name=title]').fill('Synthetic revised Test Note');
  await page.locator(`[data-test-note-remove-media="${photo.id}"]`).click();
  await page.locator('#saveTestNote').click();
  await page.locator('#testNoteEditor').waitFor({ state: 'hidden' });
  const revised = (await list()).find(note => note.id === created.id);
  check('Saving an edit removes only the staged photo and keeps the original time', revised.title === 'Synthetic revised Test Note' && revised.revision !== created.revision && revised.testTime === sample.testTime && revised.media.length === 1 && revised.media[0].mime === 'video/mp4');
  await assert.rejects(mediaBlob(created.id, photo.id));
  check('Removed attachment cannot be retrieved through its old note route', true);

  await rejectAtomic('Stale revision edit leaves metadata and all Blobs unchanged', `/api/test-notes/${created.id}`, 'PATCH', { ...sample, expectedRevision: created.revision, files: [] });
  await rejectAtomic('Invalid local date/time cannot save a note', '/api/test-notes', 'POST', { ...sample, testTime: '2030-02-30T09:15', files: [] });
  await rejectAtomic('Mixed valid/invalid attachment batch is atomic', '/api/test-notes', 'POST', {
    ...sample,
    files: [fileBody(fixtures[0]), { name: 'Synthetic invalid image.png', mime: 'image/png', contentBase64: Buffer.from('not a PNG').toString('base64') }],
  });
  await rejectAtomic('Wrong deletion password cannot remove the saved note', `/api/test-notes/${created.id}/delete`, 'POST', { expectedRevision: revised.revision, confirmed: true, password: 'crysound' });
  await rejectAtomic('Missing confirmation cannot remove the saved note', `/api/test-notes/${created.id}/delete`, 'POST', { expectedRevision: revised.revision, confirmed: false, password: 'CRYSOUND' });
  await rejectAtomic('Stale deletion revision leaves the latest note and Blob intact', `/api/test-notes/${created.id}/delete`, 'POST', { expectedRevision: created.revision, confirmed: true, password: 'CRYSOUND' });

  await page.reload();
  await ready();
  await openNote(created.id);
  check('Reload preserves the edited note and original video', (await page.locator('#testNoteDetail').innerText()).includes(revised.title) && Buffer.from((await mediaBlob(created.id, revised.media[0].id)).bytes).equals(fixtures[1].bytes));
  await page.locator('#testNoteSearch').fill('Synthetic revised');
  check('Search finds a saved note by title', await page.locator(`[data-test-note-open="${created.id}"]`).isVisible());
  await page.locator('#testNoteSearch').fill('No synthetic match');
  check('Search can show no matching notes', await page.locator('[data-test-note-open]').count() === 0);
  await page.locator('#testNoteSearch').fill('');
  await page.locator(`[data-test-note-open="${created.id}"]`).click();
  await page.setViewportSize({ width: 390, height: 1100 });
  check('Narrow Test Notes workspace stays within the page', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.setViewportSize({ width: 320, height: 1100 });
  check('At 320 px the five tabs fit in rows of three and two', await page.evaluate(() => {
    const rows = new Map();
    for (const id of ['tabData', 'tabPlot', 'tabSchedule', 'tabRequirement', 'tabTestNotes']) {
      const tab = document.getElementById(id);
      const box = tab.getBoundingClientRect();
      if (box.width < 40 || box.left < 0 || box.right > innerWidth + 1 || tab.scrollWidth > tab.clientWidth + 1) return false;
      const top = Math.round(box.top);
      rows.set(top, (rows.get(top) ?? 0) + 1);
    }
    return JSON.stringify([...rows.values()]) === '[3,2]' && document.documentElement.scrollWidth <= innerWidth + 1;
  }));
  await page.setViewportSize({ width: 1500, height: 1100 });
  await page.locator('#deleteTestNote').click();
  check('Deletion confirmation initially keeps the destructive action disabled', await page.locator('#confirmTestNoteDelete').isDisabled());
  await page.locator('#testNoteDeletePassword').fill('CRYSOUND');
  await page.locator('#testNoteDeleteConfirm').check();
  await page.locator('#confirmTestNoteDelete').click();
  await page.locator('#testNoteDeleteDialog').waitFor({ state: 'hidden' });
  check('Reviewed UI deletion removes the note and its remaining attachment', (await list()).length === 0);
  await assert.rejects(mediaBlob(created.id, revised.media[0].id));

  const invalidBackup = structuredClone(beforeEdit);
  invalidBackup.data.testNotes[0].media[0].contentBase64 = Buffer.from('tampered synthetic bytes').toString('base64');
  await restoreBackup(invalidBackup, true);
  check('Tampered attachment backup rejects atomically', (await list()).length === 0);
  const invalidHash = structuredClone(beforeEdit);
  invalidHash.data.testNotes[0].media[0].sha256 = '0'.repeat(64);
  await restoreBackup(invalidHash, true);
  check('Tampered attachment SHA rejects atomically', (await list()).length === 0);
  await restoreBackup(beforeEdit);
  const [restored] = await list();
  check('Valid backup restores original note identity and both original attachments', restored.id === created.id && restored.title === created.title && restored.media.length === 2 && restored.richText.procedure === created.richText.procedure);
  for (const attachment of restored.media) {
    const original = await mediaBlob(restored.id, attachment.id);
    assert.equal(sha(Buffer.from(original.bytes)), attachment.sha256);
  }
  const legacy = structuredClone(beforeEdit);
  delete legacy.data.testNotes;
  await restoreBackup(legacy);
  check('Legacy backup opens with an empty note collection and clears old note attachment keys', (await list()).length === 0 && !(await storeSnapshot()).some(([key]) => String(key).startsWith('test-note-media:')));
  await page.locator('#tabTestNotes').click();
  await page.locator('#addTestNote').click();
  await page.locator('#testNoteForm [name=title]').fill('Synthetic colored screenshots');
  const notesEditor = page.locator('[data-test-note-field=description]');
  await notesEditor.fill('Before screenshot');
  await notesEditor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.locator('#testNoteTextColor').selectOption('#c74444');
  check('Text color applies to the selected text', await notesEditor.evaluate(node => [...node.querySelectorAll('[style]')].some(span => span.style.color === 'rgb(199, 68, 68)' && span.textContent === 'Before screenshot')));
  const environmentEditor = page.locator('[data-test-note-field=environment]');
  await environmentEditor.fill('Highlighted context');
  await environmentEditor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.locator('#testNoteHighlight').selectOption('#f4d35e');
  check('Highlight applies to the selected text', await environmentEditor.evaluate(node => [...node.querySelectorAll('[style]')].some(span => span.style.backgroundColor === 'rgb(244, 211, 94)' && span.textContent === 'Highlighted context')));
  async function sendScreenshot(field, eventType) {
    await field.evaluate((target, { bytes, eventType }) => {
      target.focus();
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const transfer = new DataTransfer();
      transfer.items.add(new File([Uint8Array.from(bytes)], eventType + '.png', { type: 'image/png' }));
      const box = target.getBoundingClientRect();
      if (eventType === 'drop') {
        target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true, clientX: box.right - 5, clientY: box.bottom - 5 }));
      } else {
        target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
      }
    }, { bytes: [...fixtures[0].bytes], eventType });
  }
  await sendScreenshot(notesEditor, 'drop');
  await sendScreenshot(page.locator('[data-test-note-field=procedure]'), 'paste');
  check('Dropped and pasted images are placed in their respective fields in the draft', await notesEditor.locator('[data-note-image] img').count() === 1 && await page.locator('[data-test-note-field=procedure] [data-note-image] img').count() === 1);
  await page.locator('#saveTestNote').click();
  await page.locator('#testNoteEditor').waitFor({ state: 'hidden' });
  const [withScreenshots] = await list();
  await openNote(withScreenshots.id);
  await page.waitForFunction(() => document.querySelector('#testNoteDetailDescription [data-note-image] img')?.naturalWidth > 0);
  check('Saved note renders the dropped screenshot and image-only pasted field', await page.locator('#testNoteDetailProcedure [data-note-image] img').isVisible() && withScreenshots.media.length === 2 && withScreenshots.procedure === '');
  check('Saved colors survive canonicalization', withScreenshots.richText.description.includes('color: rgb(199, 68, 68)') && withScreenshots.richText.environment.includes('background-color: rgb(244, 211, 94)'));
  const screenshotsBackup = await exportBackup();
  await restoreBackup(screenshotsBackup);
  check('Backup restore retains inline positions, colors, and image bytes', JSON.stringify((await list())[0].richText) === JSON.stringify(withScreenshots.richText) && Buffer.from((await mediaBlob(withScreenshots.id, withScreenshots.media[0].id)).bytes).equals(fixtures[0].bytes));
  const [note] = await list();
  await rejectAtomic('Inline references cannot target images outside this note', `/api/test-notes/${note.id}`, 'PATCH', {
    expectedRevision: note.revision, richText: { description: '<span data-note-image="00000000000000000000000000000000"></span>' },
  });
  const dropped = note.media.find(media => media.name === 'drop.png');
  const afterRemoval = await api(`/api/test-notes/${note.id}`, 'PATCH', { expectedRevision: note.revision, removeMediaIds: [dropped.id] });
  check('Removing an original also clears its inline reference while retaining note text', !afterRemoval.richText.description.includes('data-note-image') && afterRemoval.description === 'Before screenshot' && afterRemoval.media.length === 1);
  check('Test Notes ran with zero page errors or unexpected requests', errors.length === 0 && external.length === 0);
  assert.equal(sha(await readFile(target)), sha(artifact), 'Candidate changed during acceptance');
  const result = { date: '2026-11-12', artifact: { sha256: sha(artifact), size: artifact.length }, checks, errors, external };
  await writeFile('/private/tmp/cry7574-test-notes-qa.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ checks: checks.length, artifact: result.artifact, errors, external }));
} catch (error) {
  console.error(JSON.stringify({ completed: checks.length, last: checks.at(-1), errors, external }));
  throw error;
} finally {
  if (context) await context.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
