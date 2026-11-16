# Schedule: editable Gantt HTML import

Local-only working update, based on V1.0.3. No release preparation, GitHub push or Miaoda publication is part of this feature request.

In **Schedule → Overall Plan · Gantt & milestones**, use **Import Gantt HTML**, choose the saved HTML, preview the task list and warnings, explicitly confirm, then import. The operation appends new plan entries; it never replaces existing plans or changes measurement records. If the original editor has unsaved browser drafts, use its **Download updated HTML** action first: importing a file reads that file only.

## Supported format and mapping

The supplied editable bilingual Gantt uses `cg-edited-data` JSON for saved exports. The initial template uses static data literals inside `cg-gantt-runtime`. Parsing reads only recognized data blocks; it does not execute JavaScript, insert source HTML, render the uploaded page or load its external resources. Arbitrary unrelated HTML is rejected. Original source bytes are retained with SHA-256 and can be downloaded as a file.

English names and descriptions already supplied by the document are used; no translation service is called. Source owners and actual stated dates are preserved. Source groups, workday durations, reserved-week notes, target months, original test dates and other prerequisites are retained as source information/notes, not converted into invented calendar dates or actual progress. The source's scheduling shifts are not applied again. With no explicit workflow progress, imported entries are Phase / Planned / 0%.

Only explicit **FS** edges become live scheduling predecessors. Required-input and conditional-input relationships retain their distinct meaning in notes/source information; they do not create stronger FS constraints. The preview explains these differences. Existing graph rules still reject missing, duplicate, self and circular FS references. Date/status conflicts are advisory.

Both phase dates may now independently be unknown. When both dates are known, start must not exceed finish. Incomplete dates are displayed explicitly without a fabricated duration bar, and FS date comparisons require the relevant known dates. Milestones may also remain undated.

## Persistence and recovery

A confirmed import reparses the exact file, checks the preview's plan revision, generates fresh internal IDs and adds the entire batch in one IndexedDB transaction. A changed plan requires a new preview. Failed validation or a capacity error rolls back the complete batch. Identical source SHA-256 is an idempotent no-op: edits and deliberate deletions remain respected. An edited HTML file has new bytes and imports as a new batch; it is not an update/merge of an old batch.

Original HTML and task-to-record mappings live in `data.planSources`, separate from measurement source files. Complete workspace backups include them. Restore validates source bytes/hash and source task mappings before any writes. Older backups default to an empty collection. Historical source files remain downloadable after individual imported plan records are deleted; normal guarded plan deletion still applies.

Limits: 5 MiB per Gantt HTML, 100 saved Gantt sources and 1,000 live Overall Plan entries, within the existing complete-backup size policy. State polling returns source metadata only. This local feature does not change the Miaoda application's database or published V1.0.5.
