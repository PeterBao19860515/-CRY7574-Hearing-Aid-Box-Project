/* Secondary tools for the daily workspace. Uses the same persisted API as Data. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = selector => document.querySelector(selector);
  const timestamp = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('en-US') : value || 'Unknown';
  };
  const taskFields = ['id', 'title', 'owner', 'status', 'percent', 'weight', 'dueDate', 'notes'];
  let mounted = false;

  window.WorkspaceTools = {
    mount({request, refresh, getState, activeRecordId, enabledSeries, notify}) {
      if (mounted) throw Error('Workspace tools have already been mounted.');
      mounted = true;
      let reportDraft = null, openingReport = false, currentTab = 'reports';
      const pages = {reports:0, progress:0, backups:0};
      const pageSize = 50;
      const pageRows = (name, rows) => {
        pages[name] = Math.max(0, Math.min(pages[name], Math.ceil(rows.length / pageSize) - 1));
        return rows.slice(pages[name] * pageSize, (pages[name] + 1) * pageSize);
      };
      const pager = (name, count) => count > pageSize ? `<div class="pagination"><button type="button" data-tools-page="${name}" data-step="-1" ${pages[name] === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${pages[name] + 1} of ${Math.ceil(count / pageSize)} · ${count} total</span><button type="button" data-tools-page="${name}" data-step="1" ${(pages[name] + 1) * pageSize >= count ? 'disabled' : ''}>Next →</button></div>` : '';
      const state = () => getState() || {charts:[], reports:[], sources:[], tasks:[], summary:{}};
      const error = (dialog, message = '') => $(dialog + ' .form-error').textContent = message;
      const open = dialog => { if (!$(dialog).open) $(dialog).showModal(); };
      const setTab = name => {
        currentTab = name;
        for (const tab of ['reports', 'progress', 'backups']) {
          $('#tool' + tab[0].toUpperCase() + tab.slice(1)).hidden = tab !== name;
        }
        for (const button of document.querySelectorAll('.tool-tab')) button.classList.toggle('active', button.dataset.tool === name);
      };
      for (const button of document.querySelectorAll('.tool-tab')) button.onclick = () => { setTab(button.dataset.tool); render(); };
      $('#openTools').onclick = () => { open('#toolsDialog'); render(); };
      $('#toolsDialog').addEventListener('click', event => {
        const button = event.target.closest('button[data-tools-page]');
        if (!button || button.disabled || !(button.dataset.toolsPage in pages)) return;
        pages[button.dataset.toolsPage] += Number(button.dataset.step);
        render();
      });

      function render() {
        const data = state();
        $('#createReport').disabled = !data.charts.some(record => record.id === activeRecordId());
        if (!$('#toolsDialog').open) return;
        if (currentTab === 'reports') {
        $('#reportsList').innerHTML = data.reports.length ? pageRows('reports', [...data.reports].reverse()).map(report => {
          const sourceExists = data.sources.some(source => source.id === report.source.id);
          return `<article class="report-item"><strong>${esc(report.title)}</strong><p>${esc(timestamp(report.createdAt))} · ${esc(report.source.name)}<br>${esc(report.source.kind === 'reference' ? 'Alpair 5G reference — not CRY7574 validation' : 'Imported measurement — unvalidated')}</p><p>${esc((report.notes || '').slice(0, 300) || 'No engineering notes.')}</p><a class="button" href="/api/reports/${esc(report.id)}/preview" target="_blank" rel="noopener">Preview / print</a><a class="button" href="/api/reports/${esc(report.id)}/download">Download HTML</a>${sourceExists ? `<a class="button" href="/api/sources/${esc(report.source.id)}/download">Original source</a>` : ''}</article>`;
        }).join('') + pager('reports', data.reports.length) : '<p class="empty">No report snapshots yet. Open a measurement in Plot view and choose Report active record.</p>';
        }
        if (currentTab === 'progress') {
        $('#taskRows').innerHTML = data.tasks.length ? pageRows('progress', data.tasks).map(task => `<tr><td><strong>${esc(task.title)}</strong><small>${esc(task.notes || 'No notes recorded.')}</small></td><td>${esc(task.owner)}</td><td>${esc(task.status)}</td><td>${esc(task.percent)}%<small>Weight ${esc(task.weight)} · Due ${esc(task.dueDate || 'Not set')}</small></td><td><button type="button" data-task-id="${esc(task.id)}">Edit</button></td></tr>`).join('') + (data.tasks.length > pageSize ? `<tr><td colspan="5">${pager('progress', data.tasks.length)}</td></tr>` : '') : '<tr><td colspan="5">No project tasks recorded.</td></tr>';
        const weight = data.tasks.reduce((sum, task) => sum + task.weight, 0);
        const completion = weight ? data.tasks.reduce((sum, task) => sum + task.weight * task.percent, 0) / weight : 0;
        $('#projectCompletion').textContent = 'Recorded weighted completion: ' + completion.toFixed(1) + '% · ' + data.tasks.length + ' tasks';
        }
        if (currentTab === 'backups') {
        $('#sourceRows').innerHTML = data.sources.length ? pageRows('backups', data.sources).map(source => `<tr><td><strong>${esc(source.name)}</strong><small>${esc(source.kind === 'reference' ? 'Reference' : 'Imported')} · ${esc(timestamp(source.createdAt))}</small><code>SHA-256: ${esc(source.sha256)}</code></td><td>${(source.size / 1024).toFixed(1)} KB</td><td><a class="button" href="/api/sources/${esc(source.id)}/download">Original file</a></td></tr>`).join('') + (data.sources.length > pageSize ? `<tr><td colspan="3">${pager('backups', data.sources.length)}</td></tr>` : '') : '<tr><td colspan="3">No original source files remain in this workspace.</td></tr>';
        }
      }

      function openTask(task) {
        $('#taskForm').reset();
        error('#taskDialog');
        const values = {id:'', title:'', owner:'Andy', status:'Planned', percent:0, weight:1, dueDate:'', notes:'', ...task};
        for (const name of taskFields) $('#taskForm').elements.namedItem(name).value = values[name] ?? '';
        $('#taskDialog h2').textContent = task ? 'Edit project task' : 'Add project task';
        open('#taskDialog');
      }
      $('#addTask').onclick = () => openTask(null);
      $('#taskRows').onclick = event => {
        const button = event.target.closest('button[data-task-id]');
        if (!button) return;
        const task = state().tasks.find(task => task.id === button.dataset.taskId);
        if (task) openTask(task);
      };
      $('#taskForm').elements.namedItem('status').onchange = event => {
        if (event.target.value === 'Planned') $('#taskForm').elements.namedItem('percent').value = 0;
        if (event.target.value === 'Complete') $('#taskForm').elements.namedItem('percent').value = 100;
      };
      $('#taskForm').onsubmit = async event => {
        event.preventDefault();
        const form = event.currentTarget, button = form.querySelector('[type="submit"]');
        if (button.disabled) return;
        const values = Object.fromEntries(new FormData(form)), id = values.id;
        delete values.id;
        values.percent = Number(values.percent); values.weight = Number(values.weight);
        error('#taskDialog'); button.disabled = true;
        try {
          await request('/api/tasks' + (id ? '/' + id : ''), {method: id ? 'PATCH' : 'POST', body: values});
          if (!id) pages.progress = Math.floor(state().tasks.length / pageSize);
          await refresh();
          $('#taskDialog').close(); notify('Project task saved.');
        } catch (cause) { error('#taskDialog', cause.message || String(cause)); }
        finally { button.disabled = false; }
      };

      $('#createReport').onclick = async () => {
        if (openingReport) return;
        const id = activeRecordId();
        if (!id) { notify('Choose an active measurement record first.'); return; }
        openingReport = true; $('#createReport').disabled = true;
        try {
          const record = await request('/api/charts/' + id);
          if (id !== activeRecordId()) return;
          const names = enabledSeries ? enabledSeries(id) : record.series.map(series => series.name);
          if (!names.length) { notify('Enable at least one trace for the active record before creating its report.'); return; }
          reportDraft = {chartId:id, series:[...names]};
          $('#reportForm').reset(); error('#reportDialog');
          $('#reportForm').elements.namedItem('title').value = record.title;
          $('#reportScope').textContent = record.title + ' · ' + names.length + ' enabled series · ' + record.unit + ' · Snapshot uses the stored record at creation time.';
          open('#reportDialog');
        } catch (cause) { notify(cause.message || String(cause)); }
        finally { openingReport = false; render(); }
      };
      $('#reportDialog').addEventListener('close', () => { reportDraft = null; });
      $('#reportForm').onsubmit = async event => {
        event.preventDefault();
        if (!reportDraft) return;
        const form = event.currentTarget, button = form.querySelector('[type="submit"]');
        if (button.disabled) return;
        const draft = {...reportDraft}, values = Object.fromEntries(new FormData(form));
        error('#reportDialog'); button.disabled = true;
        try {
          await request('/api/reports', {method:'POST', body:{...values, ...draft}});
          await refresh();
          $('#reportDialog').close(); pages.reports = 0; setTab('reports'); open('#toolsDialog'); render();
          notify('Single-record report snapshot saved.');
        } catch (cause) { error('#reportDialog', cause.message || String(cause)); }
        finally { button.disabled = false; }
      };
      setTab('reports'); render();
      return {render};
    }
  };
})();
