/* Secondary tools for the daily workspace. Uses the same persisted API as Data. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = selector => document.querySelector(selector);
  const timestamp = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('en-US') : value || 'Unknown';
  };
  const taskFields = ['id', 'title', 'owner', 'status', 'percent', 'weight', 'startDate', 'dueDate', 'notes'];
  let mounted = false;

  window.WorkspaceTools = {
    mount({request, refresh, getState, activeRecordId, enabledSeries, notify}) {
      if (mounted) throw Error('Workspace tools have already been mounted.');
      mounted = true;
      let reportDraft = null, openingReport = false, currentTab = 'reports', taskDraftRevision = null, taskDeleteTarget = null, taskSaving = false, taskDeleteBusy = false;
      const pages = {reports:0, progress:0, backups:0};
      const pageSize = 50;
      const pageRows = (name, rows) => {
        pages[name] = Math.max(0, Math.min(pages[name], Math.ceil(rows.length / pageSize) - 1));
        return rows.slice(pages[name] * pageSize, (pages[name] + 1) * pageSize);
      };
      const pager = (name, count) => count > pageSize ? `<div class="pagination"><button type="button" data-tools-page="${name}" data-step="-1" ${name === 'progress' ? 'id="taskPrev"' : ''} ${pages[name] === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${pages[name] + 1} of ${Math.ceil(count / pageSize)} · ${count} total</span><button type="button" data-tools-page="${name}" data-step="1" ${name === 'progress' ? 'id="taskNext"' : ''} ${(pages[name] + 1) * pageSize >= count ? 'disabled' : ''}>Next →</button></div>` : '';
      const state = () => getState() || {charts:[], reports:[], sources:[], tasks:[], summary:{}};
      const error = (dialog, message = '') => $(dialog + ' .form-error').textContent = message;
      const open = dialog => { if (!$(dialog).open) $(dialog).showModal(); };
      const openSchedule = () => { if ($('#toolsDialog').open) $('#toolsDialog').close(); window.WorkspaceApp?.showView('schedule'); render(); };
      const setTab = name => {
        if(name === 'progress'){openSchedule();return;}
        currentTab = name;
        for (const tab of ['reports', 'backups']) {
          $('#tool' + tab[0].toUpperCase() + tab.slice(1)).hidden = tab !== name;
        }
        for (const button of document.querySelectorAll('.tool-tab')) button.classList.toggle('active', button.dataset.tool === name);
      };
      for (const button of document.querySelectorAll('.tool-tab')) button.onclick = () => { setTab(button.dataset.tool); render(); };
      $('#openTools').onclick = () => { open('#toolsDialog'); render(); };
      for (const id of ['taskSearch', 'taskStatusFilter']) $('#'+id).addEventListener(id === 'taskSearch' ? 'input' : 'change', () => { pages.progress = 0; render(); });
      $('#taskGanttDetails').addEventListener('toggle', () => { if ($('#taskGanttDetails').open) render(); });
      const pageClick = event => {
        const button = event.target.closest('button[data-tools-page]');
        if (!button || button.disabled || !(button.dataset.toolsPage in pages)) return;
        pages[button.dataset.toolsPage] += Number(button.dataset.step);
        render();
      };
      $('#toolsDialog').addEventListener('click',pageClick);$('#scheduleView').addEventListener('click',pageClick);

      function render() {
        const data = state();
        $('#createReport').disabled = !data.charts.some(record => record.id === activeRecordId());
        if (!$('#scheduleView').hidden) renderSchedule(data);
        if (!$('#toolsDialog').open) return;
        if (currentTab === 'reports') {
        $('#reportsList').innerHTML = data.reports.length ? pageRows('reports', [...data.reports].reverse()).map(report => {
          const sourceExists = data.sources.some(source => source.id === report.source.id);
          return `<article class="report-item"><strong>${esc(report.title)}</strong><p>${esc(timestamp(report.createdAt))} · ${esc(report.source.name)}<br>${esc(report.source.kind === 'reference' ? 'Alpair 5G reference — not CRY7574 validation' : 'Imported measurement — unvalidated')}</p><p>${esc((report.notes || '').slice(0, 300) || 'No engineering notes.')}</p><a class="button" href="/api/reports/${esc(report.id)}/preview" target="_blank" rel="noopener">Preview / print</a><a class="button" href="/api/reports/${esc(report.id)}/download">Download HTML</a>${sourceExists ? `<a class="button" href="/api/sources/${esc(report.source.id)}/download">Original source</a>` : ''}</article>`;
        }).join('') + pager('reports', data.reports.length) : '<p class="empty">No report snapshots yet. Open a measurement in Plot view and choose Report active record.</p>';
        }
        if (currentTab === 'backups') {
        $('#sourceRows').innerHTML = data.sources.length ? pageRows('backups', data.sources).map(source => `<tr><td><strong>${esc(source.name)}</strong><small>${esc(source.kind === 'reference' ? 'Reference' : 'Imported')} · ${esc(timestamp(source.createdAt))}</small><code>SHA-256: ${esc(source.sha256)}</code></td><td>${(source.size / 1024).toFixed(1)} KB</td><td><a class="button" href="/api/sources/${esc(source.id)}/download">Original file</a></td></tr>`).join('') + (data.sources.length > pageSize ? `<tr><td colspan="3">${pager('backups', data.sources.length)}</td></tr>` : '') : '<tr><td colspan="3">No original source files remain in this workspace.</td></tr>';
        }
      }

      function renderSchedule(data) {
          const query = $('#taskSearch').value.trim().toLocaleLowerCase('en-US'), filter = $('#taskStatusFilter').value;
          const matching = data.tasks.filter(task => (!query || [task.title, task.owner, task.notes].join(' ').toLocaleLowerCase('en-US').includes(query)) && (filter === 'all' || (filter === 'overdue' ? isOverdue(task) : task.status === filter))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.title.localeCompare(b.title,'en'));
          const current = pageRows('progress', matching);
          $('#taskRows').innerHTML = current.length ? current.map(task => `<tr data-task-id="${esc(task.id)}" data-overdue="${isOverdue(task)}"><td><strong>${esc(task.title)}</strong><small>${esc(task.notes || 'No notes recorded.')}</small></td><td>${esc(task.owner)}</td><td>${esc(task.startDate || 'Not set')}</td><td>${esc(task.dueDate || 'Not set')}${isOverdue(task) ? '<span class="task-overdue">Overdue</span>' : ''}</td><td>${esc(task.status)}</td><td>${esc(task.percent)}%</td><td><button type="button" data-task-id="${esc(task.id)}">Edit</button> <button type="button" class="danger-text" data-task-delete="${esc(task.id)}">Delete</button></td></tr>`).join('') : '<tr><td colspan="7">No tasks match these filters.</td></tr>';
          const colors = {'Planned':'planned','In progress':'in-progress','Blocked':'blocked','Complete':'complete'};
          $('#taskCards').innerHTML = current.map(task=>`<article class="task-card task-${colors[task.status]}" data-task-id="${esc(task.id)}" data-status="${esc(task.status)}" data-overdue="${isOverdue(task)}"><header><h3 title="${esc(task.title)}">${esc(task.title)}</h3><span class="task-status">${esc(task.status)}</span></header><dl><div><dt>Owner</dt><dd title="${esc(task.owner)}">${esc(task.owner)}</dd></div><div><dt>Start date</dt><dd>${esc(task.startDate||'Not set')}</dd></div><div><dt>Due date</dt><dd>${esc(task.dueDate||'Not set')}${isOverdue(task)?'<span class="task-overdue">Overdue</span>':''}</dd></div></dl><div class="task-card-completion"><strong>${esc(task.percent)}% complete</strong><progress max="100" value="${task.percent}" aria-label="Completion for ${esc(task.title)}"></progress></div><p class="task-card-notes" title="${esc(task.notes||'No notes recorded.')}">${esc(task.notes||'No notes recorded.')}</p><footer><button type="button" data-task-id="${esc(task.id)}">Edit</button><button type="button" class="danger-text" data-task-delete="${esc(task.id)}">Delete</button></footer></article>`).join('');
          $('#taskCardsEmpty').hidden=!!current.length;
          $('#taskCardsPager').innerHTML=pager('progress',matching.length);
          $('#taskMatchCount').textContent = matching.length + ' matching tasks · Page ' + (pages.progress + 1) + ' · ' + current.length + ' shown · Latest changes first. Overdue uses your local calendar; completed tasks are excluded.';
          const weight = data.tasks.reduce((sum, task) => sum + task.weight, 0);
          const completion = weight ? data.tasks.reduce((sum, task) => sum + task.weight * task.percent, 0) / weight : 0;
          $('#scheduleStats').innerHTML='<div><small>Total tasks</small><strong>'+data.tasks.length+'</strong></div><div><small>Complete</small><strong>'+data.tasks.filter(t=>t.status==='Complete').length+'</strong></div><div><small>Overdue</small><strong>'+data.tasks.filter(isOverdue).length+'</strong></div><div><small>Overall weighted progress</small><strong>'+completion.toFixed(1)+'%</strong><progress max="100" value="'+completion+'" aria-label="Overall weighted task completion"></progress></div>';
          $('#projectCompletion').textContent = 'Recorded weighted completion: ' + completion.toFixed(1) + '% · ' + data.tasks.length + ' tasks';
          if ($('#taskGanttDetails').open) renderGantt(current);
      }

      function localToday() {
        const now = new Date();
        return String(now.getFullYear()).padStart(4, '0') + '-' + String(now.getMonth()+1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      }
      function isOverdue(task) { return !!task.dueDate && task.dueDate < localToday() && task.status !== 'Complete'; }
      function renderGantt(current) {
        const dated = current.filter(task => task.startDate && task.dueDate);
        $('#taskGanttInfo').textContent = dated.length + ' dated tasks from this page · ' + (current.length-dated.length) + ' without both dates omitted. Bars cover the recorded inclusive date range.';
        if (!dated.length) { $('#taskGantt').innerHTML = '<p class="empty">Set both Start date and Due date to show a task here. No dates are inferred.</p>'; return; }
        const day = value => new Date(value+'T00:00:00Z').getTime()/86400000, first = Math.min(...dated.map(t=>day(t.startDate))), last = Math.max(...dated.map(t=>day(t.dueDate))), span = last-first+1, x = value => 260+700*(value-first)/span;
        const ticks = Array.from({length:5}, (_,i)=>first+Math.round((span-1)*i/4)).filter((v,i,a)=>!i || v!==a[i-1]);
        const labels = ticks.map(value=>`<line x1="${x(value)}" y1="38" x2="${x(value)}" y2="${50+dated.length*28}" stroke="#e6e0ed"/><text x="${x(value)}" y="22" font-size="11" text-anchor="${value === first ? 'start' : value === last ? 'end' : 'middle'}" fill="#756784">${new Date(value*86400000).toISOString().slice(0,10)}</text>`).join('');
        const colors = {'Planned':'#a49bad','In progress':'#7045ce','Blocked':'#bf6579','Complete':'#239c8c'};
        const rows = dated.map((task,i)=>{const y=48+i*28, start=x(day(task.startDate)), width=Math.max(2,700*(day(task.dueDate)-day(task.startDate)+1)/span);return `<g data-task-id="${esc(task.id)}"><title>${esc(task.title)} · ${esc(task.startDate)} to ${esc(task.dueDate)} · ${esc(task.status)} · ${esc(task.percent)}%</title><text x="8" y="${y+12}" font-size="11" fill="#4c3e5c">${esc(task.title.length>34?task.title.slice(0,31)+'…':task.title)}</text><rect x="${start}" y="${y}" width="${width}" height="17" rx="3" fill="#eee8f4"/><rect x="${start}" y="${y}" width="${width*task.percent/100}" height="17" rx="3" fill="${colors[task.status]}"/><rect x="${start}" y="${y}" width="${width}" height="17" rx="3" fill="none" stroke="${colors[task.status]}"/></g>`;}).join('');
        $('#taskGantt').innerHTML = `<svg viewBox="0 0 1000 ${70+dated.length*28}" role="img" aria-label="Task schedule for the current filtered page">${labels}${rows}</svg>`;
      }
      function openTask(task) {
        $('#taskForm').reset(); error('#taskDialog'); taskDraftRevision = task?.revision ?? null;
        const values = {id:'', title:'', owner:'', status:'Planned', percent:0, weight:1, startDate:'', dueDate:'', notes:'', ...task};
        for (const name of taskFields) $('#taskForm').elements.namedItem(name).value = values[name] ?? '';
        $('#taskDialog h2').textContent = task ? 'Edit project task' : 'Add project task'; open('#taskDialog');
      }
      $('#addTask').onclick = () => openTask(null);
      function requestTaskDeletion(id) {
        if(taskSaving||taskDeleteBusy||document.querySelector('dialog[open]'))return false;
        const task=state().tasks.find(task=>task.id===id);if(!task)return false;
        taskDeleteTarget={...task};$('#taskDeleteForm').reset();error('#taskDeleteDialog');$('#taskDeleteScope').textContent='Permanently delete “'+task.title+'” owned by '+task.owner+'? Only this task will be removed.';taskDeleteReady();open('#taskDeleteDialog');return true;
      }
      const taskAction = event => {
        const edit = event.target.closest('button[data-task-id]'), remove = event.target.closest('button[data-task-delete]');
        const task = state().tasks.find(task => task.id === (edit?.dataset.taskId || remove?.dataset.taskDelete));
        if (!task) return;
        if (edit) openTask(task); else if (remove) requestTaskDeletion(task.id);
      };
      $('#taskCards').onclick=taskAction;$('#taskRows').onclick=taskAction;
      $('#taskForm').elements.namedItem('status').onchange = event => {
        if (event.target.value === 'Planned') $('#taskForm').elements.namedItem('percent').value = 0;
        if (event.target.value === 'Complete') $('#taskForm').elements.namedItem('percent').value = 100;
      };
      function lockTask(dialog, busy) { for (const button of document.querySelectorAll(dialog+' button')) button.disabled = busy; }
      $('#taskDialog').addEventListener('cancel', event => { if(taskSaving) event.preventDefault(); });
      $('#taskForm').onsubmit = async event => {
        event.preventDefault(); if (taskSaving) return;
        const form = event.currentTarget, values = Object.fromEntries(new FormData(form)), id = values.id; delete values.id;
        values.percent = Number(values.percent); values.weight = Number(values.weight); if(id) values.expectedRevision = taskDraftRevision;
        error('#taskDialog'); taskSaving=true; lockTask('#taskDialog',true);
        try { await request('/api/tasks' + (id ? '/' + id : ''), {method:id?'PATCH':'POST',body:values}); if(!id){pages.progress=0;$('#taskSearch').value='';$('#taskStatusFilter').value='all';} await refresh(true); $('#taskDialog').close(); notify('Project task saved.'); }
        catch(cause) { error('#taskDialog',cause.message||String(cause)); if(/Task changed|Task not found/.test(cause.message)) await refresh(true).catch(()=>{}); }
        finally { taskSaving=false; lockTask('#taskDialog',false); }
      };
      function taskDeleteReady() { $('#confirmTaskDelete').disabled = taskDeleteBusy || !taskDeleteTarget || !$('#taskDeletePassword').value || !$('#taskDeleteConfirm').checked; }
      $('#taskDeletePassword').oninput=taskDeleteReady; $('#taskDeleteConfirm').onchange=taskDeleteReady;
      $('#taskDeleteDialog').addEventListener('cancel',event=>{if(taskDeleteBusy)event.preventDefault();});
      $('#taskDeleteDialog').addEventListener('close',()=>{$('#taskDeleteForm').reset();taskDeleteTarget=null;taskDeleteReady();});
      $('#taskDeleteForm').onsubmit=async event=>{event.preventDefault();if(taskDeleteBusy||!taskDeleteTarget||!$('#taskDeleteConfirm').checked)return;taskDeleteBusy=true;lockTask('#taskDeleteDialog',true);error('#taskDeleteDialog');try{await request('/api/tasks/'+taskDeleteTarget.id+'/delete',{method:'POST',body:{password:$('#taskDeletePassword').value,confirmed:true,expectedRevision:taskDeleteTarget.revision}});$('#taskDeleteDialog').close();await refresh(true);notify('Task deleted.');}catch(cause){error('#taskDeleteDialog',cause.message||String(cause));if(/Task changed|Task not found/.test(cause.message)){taskDeleteTarget=null;await refresh(true).catch(()=>{});}}finally{taskDeleteBusy=false;lockTask('#taskDeleteDialog',false);$('#taskDeletePassword').value='';$('#taskDeleteConfirm').checked=false;taskDeleteReady();}};

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
      return {render,requestTaskDeletion};
    }
  };
})();
