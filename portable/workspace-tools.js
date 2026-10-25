/* Secondary tools for the daily workspace. Uses the same persisted API as Data. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = selector => document.querySelector(selector);
  const timestamp = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('en-US') : value || 'Unknown';
  };
  const taskFields = ['id', 'title', 'owner', 'status', 'percent', 'weight', 'startDate', 'dueDate', 'notes', 'cardId', 'statusDetail'];
  let mounted = false;

  window.WorkspaceTools = {
    mount({request, refresh, getState, activeRecordId, enabledSeries, notify}) {
      if (mounted) throw Error('Workspace tools have already been mounted.');
      mounted = true;
      let reportDraft = null, openingReport = false, currentTab = 'reports', taskDraftRevision = null, taskDeleteTarget = null, taskSaving = false, taskDeleteBusy = false;
      const pages = {reports:0, progress:0, backups:0};
      let cardPage=0, cardDraftRevision=null, cardDeleteTarget=null, cardBusy=false;const taskPages=new Map();
      const pageSize = 50;
      const pageRows = (name, rows) => {
        pages[name] = Math.max(0, Math.min(pages[name], Math.ceil(rows.length / pageSize) - 1));
        return rows.slice(pages[name] * pageSize, (pages[name] + 1) * pageSize);
      };
      const pager = (name, count) => count > pageSize ? `<div class="pagination"><button type="button" data-tools-page="${name}" data-step="-1" ${name === 'progress' ? 'id="taskPrev"' : ''} ${pages[name] === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${pages[name] + 1} of ${Math.ceil(count / pageSize)} · ${count} total</span><button type="button" data-tools-page="${name}" data-step="1" ${name === 'progress' ? 'id="taskNext"' : ''} ${(pages[name] + 1) * pageSize >= count ? 'disabled' : ''}>Next →</button></div>` : '';
      const state = () => getState() || {charts:[], reports:[], sources:[], tasks:[], summary:{}};
      const error = (dialog, message = '') => $(dialog + ' .form-error').textContent = message;
      const open = dialog => { if (!$(dialog).open) $(dialog).showModal(); };
      const openSchedule = () => { $('#scheduleTaskBoard')?.click(); if ($('#toolsDialog').open) $('#toolsDialog').close(); window.WorkspaceApp?.showView('schedule'); render(); };
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
      for (const id of ['taskSearch', 'taskStatusFilter']) $('#'+id).addEventListener(id === 'taskSearch' ? 'input' : 'change', () => { pages.progress = 0;cardPage=0;taskPages.clear(); render(); });
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

      function scheduleGroups(data) {
        const query=$('#taskSearch').value.trim().toLocaleLowerCase('en-US'),filter=$('#taskStatusFilter').value;
        const byCard=new Map();for(const task of data.tasks){const key=task.cardId||'';if(!byCard.has(key))byCard.set(key,[]);byCard.get(key).push(task);}
        const cards=[...(data.scheduleCards||[])].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.title.localeCompare(b.title,'en'));
        if(byCard.has(''))cards.push({id:'',title:'Ungrouped tasks',notes:'Tasks not assigned to a project or workgroup.'});
        return cards.map(card=>{const titleMatch=!!query&&card.title.toLocaleLowerCase('en-US').includes(query),all=byCard.get(card.id)||[],tasks=all.filter(t=>(!query||titleMatch||[t.title,t.owner,t.notes,t.statusDetail].join(' ').toLocaleLowerCase('en-US').includes(query))&&(filter==='all'||(filter==='overdue'?isOverdue(t):t.status===filter))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.title.localeCompare(b.title,'en'));return {card,all,tasks,titleMatch};}).filter(g=>g.tasks.length||(!query&&filter==='all')||(g.titleMatch&&filter==='all'));
      }
      function renderSchedule(data) {
          const groups=scheduleGroups(data),matching=groups.flatMap(g=>g.tasks).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.title.localeCompare(b.title,'en')),current=pageRows('progress',matching);
          cardPage=Math.max(0,Math.min(cardPage,Math.ceil(groups.length/6)-1));const visible=groups.slice(cardPage*6,cardPage*6+6);
          $('#taskRows').innerHTML=current.length?current.map(task=>`<tr data-task-id="${esc(task.id)}" data-overdue="${isOverdue(task)}"><td><strong>${esc(task.title)}</strong><small>${esc(task.statusDetail||task.notes||'No written update.')}</small></td><td>${esc(task.owner)}</td><td>${esc(task.startDate||'Not set')}</td><td>${esc(task.dueDate||'Not set')}${isOverdue(task)?'<span class="task-overdue">Overdue</span>':''}</td><td>${esc(task.status)}</td><td>${esc(task.percent)}%</td><td><button type="button" data-task-id="${esc(task.id)}">Edit</button> <button type="button" class="danger-text" data-task-delete="${esc(task.id)}">Delete</button></td></tr>`).join(''):'<tr><td colspan="7">No tasks match these filters.</td></tr>';
          $('#taskCards').innerHTML=visible.map(({card,all,tasks})=>{
            let page=Math.max(0,Math.min(taskPages.get(card.id)||0,Math.ceil(tasks.length/10)-1));taskPages.set(card.id,page);const rows=tasks.slice(page*10,page*10+10),weight=all.reduce((n,t)=>n+t.weight,0),completion=weight?all.reduce((n,t)=>n+t.weight*t.percent,0)/weight:0;
            return `<article class="schedule-group-card" data-card-id="${esc(card.id)}"><header><div><h3 title="${esc(card.title)}">${esc(card.title)}</h3><p class="card-notes" title="${esc(card.notes||'')}">${esc(card.notes||'')}</p><small>${all.length} tasks · ${completion.toFixed(1)}% weighted progress</small></div><div class="card-actions"><button type="button" data-add-card-task="${esc(card.id)}">＋ Add task</button>${card.id?`<button type="button" data-edit-card="${esc(card.id)}">Edit card</button><button type="button" class="danger-text" data-delete-card="${esc(card.id)}">Delete card</button>`:''}</div></header><div class="schedule-card-scroll"><table><thead><tr><th>Task</th><th>Current Status</th><th>Progress</th><th>DRI</th></tr></thead><tbody>${rows.length?rows.map(task=>`<tr data-task-id="${esc(task.id)}" data-status="${esc(task.status)}" data-overdue="${isOverdue(task)}"><td><strong title="${esc(task.title)}">${esc(task.title)}</strong><small>${esc(task.startDate||'Start not set')} → ${esc(task.dueDate||'Due not set')}${isOverdue(task)?'<span class="task-overdue">Overdue</span>':''}</small><div class="task-row-actions"><button type="button" data-task-id="${esc(task.id)}">Edit</button><button type="button" class="danger-text" data-task-delete="${esc(task.id)}">Delete</button></div></td><td><div class="task-status-detail" ${task.statusDetail?'':'hidden'} title="${esc(task.statusDetail||'')}">${esc(task.statusDetail||'')}</div><span class="task-status">${esc(task.status)}</span></td><td><strong>${esc(task.percent)}%</strong><progress max="100" value="${task.percent}" aria-label="Completion for ${esc(task.title)}"></progress></td><td class="task-dri" title="${esc(task.owner)}">${esc(task.owner)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">No tasks in this card. Add a task to begin.</td></tr>'}</tbody></table></div>${tasks.length>10?`<div class="pagination"><button type="button" data-card-task-page="${esc(card.id)}" data-step="-1" ${page===0?'disabled':''}>← Previous tasks</button><span>Tasks ${page*10+1}–${Math.min(tasks.length,(page+1)*10)} of ${tasks.length}</span><button type="button" data-card-task-page="${esc(card.id)}" data-step="1" ${(page+1)*10>=tasks.length?'disabled':''}>Next tasks →</button></div>`:''}</article>`;
          }).join('');
          $('#taskCardsEmpty').hidden=!!visible.length;
          $('#taskCardsPager').innerHTML=groups.length>6?`<div class="pagination"><button type="button" id="scheduleCardsPrev" ${cardPage===0?'disabled':''}>← Previous cards</button><span>Cards ${cardPage*6+1}–${Math.min(groups.length,(cardPage+1)*6)} of ${groups.length}</span><button type="button" id="scheduleCardsNext" ${(cardPage+1)*6>=groups.length?'disabled':''}>Next cards →</button></div>`:'';
          $('#flatTasksPager').innerHTML=pager('progress',matching.length);
          $('#taskMatchCount').textContent=groups.length+' matching cards · '+matching.length+' matching tasks · Up to 6 cards and 10 task rows per card. Empty cards appear in All statuses; title searches can match a whole card.';
          const weight=data.tasks.reduce((n,t)=>n+t.weight,0),completion=weight?data.tasks.reduce((n,t)=>n+t.weight*t.percent,0)/weight:0;
          $('#scheduleStats').innerHTML='<div><small>Project / workgroup cards</small><strong>'+(data.scheduleCards||[]).length+'</strong></div><div><small>Total tasks</small><strong>'+data.tasks.length+'</strong></div><div><small>Overdue</small><strong>'+data.tasks.filter(isOverdue).length+'</strong></div><div><small>Overall weighted progress</small><strong>'+completion.toFixed(1)+'%</strong><progress max="100" value="'+completion+'" aria-label="Overall weighted task completion"></progress></div>';
          $('#projectCompletion').textContent='Recorded weighted completion: '+completion.toFixed(1)+'% · '+data.tasks.filter(t=>t.status==='Complete').length+' complete / '+data.tasks.length+' tasks';
          if($('#taskGanttDetails').open)renderGantt(current);
      }
      function clearTaskFilters(){pages.progress=0;cardPage=0;taskPages.clear();$('#taskSearch').value='';$('#taskStatusFilter').value='all';}
      function revealCard(cardId){const groups=scheduleGroups(state()),index=groups.findIndex(g=>g.card.id===cardId);if(index>=0)cardPage=Math.floor(index/6);taskPages.set(cardId,0);}
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
      function openTask(task,cardId='') {
        $('#taskForm').reset(); error('#taskDialog'); taskDraftRevision = task?.revision ?? null;
        $('#taskCardSelect').innerHTML='<option value="">Ungrouped tasks</option>'+(state().scheduleCards||[]).map(card=>`<option value="${esc(card.id)}">${esc(card.title)}</option>`).join('');
        const values = {id:'', title:'', owner:'', status:'Planned', percent:0, weight:1, startDate:'', dueDate:'', notes:'',cardId,statusDetail:'', ...task};
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
      $('#taskCards').onclick=event=>{const add=event.target.closest('[data-add-card-task]'),edit=event.target.closest('[data-edit-card]'),remove=event.target.closest('[data-delete-card]'),page=event.target.closest('[data-card-task-page]');if(add){openTask(null,add.dataset.addCardTask);return;}if(edit){openCard(state().scheduleCards.find(c=>c.id===edit.dataset.editCard));return;}if(remove){requestScheduleCardDeletion(remove.dataset.deleteCard);return;}if(page&&!page.disabled){taskPages.set(page.dataset.cardTaskPage,(taskPages.get(page.dataset.cardTaskPage)||0)+Number(page.dataset.step));render();return;}taskAction(event);};$('#taskRows').onclick=taskAction;
      $('#taskCardsPager').onclick=event=>{if(event.target.disabled)return;if(event.target.id==='scheduleCardsPrev')cardPage--;if(event.target.id==='scheduleCardsNext')cardPage++;render();};
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
        try { await request('/api/tasks' + (id ? '/' + id : ''), {method:id?'PATCH':'POST',body:values}); if(!id)clearTaskFilters(); await refresh(true);if(!id){revealCard(values.cardId);render();} $('#taskDialog').close(); notify('Project task saved.'); }
        catch(cause) { error('#taskDialog',cause.message||String(cause)); if(/Task changed|Task not found/.test(cause.message)) await refresh(true).catch(()=>{}); }
        finally { taskSaving=false; lockTask('#taskDialog',false); }
      };
      function taskDeleteReady() { $('#confirmTaskDelete').disabled = taskDeleteBusy || !taskDeleteTarget || !$('#taskDeletePassword').value || !$('#taskDeleteConfirm').checked; }
      $('#taskDeletePassword').oninput=taskDeleteReady; $('#taskDeleteConfirm').onchange=taskDeleteReady;
      $('#taskDeleteDialog').addEventListener('cancel',event=>{if(taskDeleteBusy)event.preventDefault();});
      $('#taskDeleteDialog').addEventListener('close',()=>{$('#taskDeleteForm').reset();taskDeleteTarget=null;taskDeleteReady();});
      $('#taskDeleteForm').onsubmit=async event=>{event.preventDefault();if(taskDeleteBusy||!taskDeleteTarget||!$('#taskDeleteConfirm').checked)return;taskDeleteBusy=true;lockTask('#taskDeleteDialog',true);error('#taskDeleteDialog');try{await request('/api/tasks/'+taskDeleteTarget.id+'/delete',{method:'POST',body:{password:$('#taskDeletePassword').value,confirmed:true,expectedRevision:taskDeleteTarget.revision}});$('#taskDeleteDialog').close();await refresh(true);notify('Task deleted.');}catch(cause){error('#taskDeleteDialog',cause.message||String(cause));if(/Task changed|Task not found/.test(cause.message)){taskDeleteTarget=null;await refresh(true).catch(()=>{});}}finally{taskDeleteBusy=false;lockTask('#taskDeleteDialog',false);$('#taskDeletePassword').value='';$('#taskDeleteConfirm').checked=false;taskDeleteReady();}};

      function openCard(card){$('#scheduleCardForm').reset();error('#scheduleCardDialog');cardDraftRevision=card?.revision??null;for(const name of ['id','title','notes'])$('#scheduleCardForm').elements.namedItem(name).value=card?.[name]||'';$('#scheduleCardDialog h2').textContent=card?'Edit project / workgroup card':'New project / workgroup card';open('#scheduleCardDialog');}
      $('#addScheduleCard').onclick=()=>openCard(null);
      $('#scheduleCardDialog').addEventListener('cancel',event=>{if(cardBusy)event.preventDefault();});
      $('#scheduleCardForm').onsubmit=async event=>{event.preventDefault();if(cardBusy)return;const values=Object.fromEntries(new FormData(event.currentTarget)),id=values.id;delete values.id;if(id)values.expectedRevision=cardDraftRevision;cardBusy=true;lockTask('#scheduleCardDialog',true);error('#scheduleCardDialog');try{const card=await request('/api/schedule-cards'+(id?'/'+id:''),{method:id?'PATCH':'POST',body:values});if(!id)clearTaskFilters();await refresh(true);if(!id){revealCard(card.id);render();}$('#scheduleCardDialog').close();notify('Schedule card saved.');}catch(cause){error('#scheduleCardDialog',cause.message);if(/changed|not found/.test(cause.message))await refresh(true).catch(()=>{});}finally{cardBusy=false;lockTask('#scheduleCardDialog',false);}};
      function cardDeleteReady(){$('#confirmScheduleCardDelete').disabled=cardBusy||!cardDeleteTarget||!$('#scheduleCardDeletePassword').value||!$('#scheduleCardDeleteConfirm').checked;}
      function requestScheduleCardDeletion(id){if(cardBusy||taskSaving||taskDeleteBusy||document.querySelector('dialog[open]'))return false;const card=(state().scheduleCards||[]).find(c=>c.id===id);if(!card)return false;cardDeleteTarget={...card};$('#scheduleCardDeleteForm').reset();error('#scheduleCardDeleteDialog');const count=state().tasks.filter(t=>t.cardId===id).length;$('#scheduleCardDeleteScope').textContent='Delete “'+card.title+'”? '+count+' tasks currently belong to this card. Only an empty card can be deleted; move any tasks first. No tasks will be deleted.';cardDeleteReady();open('#scheduleCardDeleteDialog');return true;}
      $('#scheduleCardDeletePassword').oninput=cardDeleteReady;$('#scheduleCardDeleteConfirm').onchange=cardDeleteReady;
      $('#scheduleCardDeleteDialog').addEventListener('cancel',event=>{if(cardBusy)event.preventDefault();});$('#scheduleCardDeleteDialog').addEventListener('close',()=>{$('#scheduleCardDeleteForm').reset();cardDeleteTarget=null;cardDeleteReady();});
      $('#scheduleCardDeleteForm').onsubmit=async event=>{event.preventDefault();if(cardBusy||!cardDeleteTarget||!$('#scheduleCardDeleteConfirm').checked)return;cardBusy=true;lockTask('#scheduleCardDeleteDialog',true);error('#scheduleCardDeleteDialog');try{await request('/api/schedule-cards/'+cardDeleteTarget.id+'/delete',{method:'POST',body:{password:$('#scheduleCardDeletePassword').value,confirmed:true,expectedRevision:cardDeleteTarget.revision}});$('#scheduleCardDeleteDialog').close();await refresh(true);notify('Empty schedule card deleted.');}catch(cause){error('#scheduleCardDeleteDialog',cause.message);if(/changed|not found/.test(cause.message))cardDeleteTarget=null;await refresh(true).catch(()=>{});}finally{cardBusy=false;lockTask('#scheduleCardDeleteDialog',false);$('#scheduleCardDeletePassword').value='';$('#scheduleCardDeleteConfirm').checked=false;cardDeleteReady();}};

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
      return {render,requestTaskDeletion,requestScheduleCardDeletion};
    }
  };
})();
