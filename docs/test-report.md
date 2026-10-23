# CRY7574 Verification Report

Updated: 23 October 2026 (Asia/Shanghai). Initial acceptance: 20 October 2026. Test Manager: Jams. Product Manager and browser reviewer: Andy. Development Manager: Lucas.

## Current V1.0.1 release verification

The final V1.0.1 private application (**3,928,176 bytes**, SHA-256 `c9fbf226629f630be32c0631c78c8717241dff754de74880eaa54353aa3528c9`) and empty public application (**421,405 bytes**, SHA-256 `4c8d1ab7136e7239a8aef6040ccc6359f0294e3570eaf94527625b5cf14fb758`) each pass **13 focused release-version checks**. The final public build also passes all **12 empty-workspace release checks**. These use disposable browsers and isolated MCP brokers; no actual user browser/MCP workspace is operated.

`VERSION`, HTML meta, visible header/footer labels, real stdio serverInfo.version, status.serverVersion, connected status.appVersion and browser workspace-summary appVersion all agree on `1.0.1` (visible labels use `V1.0.1`). Targeted version-label CSS fixes the initial inherited 8 px text: final 11 px labels remain visible/readable at 1500, 1100 and 390 px with no document overflow. Initial HTML rendering runs offline; focused MCP queries then use only the isolated local bridge. Read-only queries leave measurements and tasks unchanged, expose no credentials, and record zero JavaScript errors or external HTTP/HTTPS requests.

The public build starts with one empty Measurements Library and no charts, sources, tasks, reports, media, comparisons or specifications. Synthetic preview/import, exact original-byte download, actual Plot, user-created bound/profile and reload remain functional. Evidence: `docs/browser-version-qa.json`, `docs/browser-version-public-qa.json`, `docs/browser-public-release-qa.json`; helper: `tests/workspace-version-qa.mjs`.

Read-only publication review of the **33 staged paths** found no private root application, seed, source workbook/video, local database or MCP pairing configuration, no credential-signature candidates and no newly staged binaries. Staged VERSION/manifest versions, distribution hash and every build-input hash agree; the private seed is excluded. Ignore rules cover private data/reference directories, original workbooks, the private root HTML, browser evidence and `mcp/.local/`. Previously public legacy report pages are unchanged; this review concerns new publication content. Andy independently passed **10 temporary-Git release-workflow checks** for initial V1.0.1, idempotent prepare, rejected skipped/unbumped versions, stale source/artifact rejection, pre-push guard behavior and the next V1.0.2 increment (`tests/release-qa.py`). Commit/push confirmation is separate from this pre-publication QA record.

## Local Codex MCP bridge

The MCP server passes **49 independent stdio/loopback security and correctness checks**. The private application (**3,927,817 bytes**, SHA-256 `5d4c1fc79d100ec44ebc7a48bc7ac7198c35125b531d4694f88a0836e30fb53b`) and empty public application (**421,046 bytes**, SHA-256 `456a0a2da4387930c6df870ba73da4293b37d12261d470b6a1b69db06cfc920f`) each pass **40 actual-browser MCP checks**. These use real Node stdio, isolated ephemeral loopback daemons, file-origin Chrome and disposable browser storage. Zero JavaScript errors or external HTTP/HTTPS requests were recorded. Only the authenticated local bridge is contacted; no real user database or source file is used.

Real initialize negotiation supports the current and retained earlier MCP versions, and tools/list exposes exactly 17 explicit operations. Authenticated file-origin connection is opt-in: loading configuration alone does not connect; a second actual browser tab cannot take over; reload disconnects without automatic reconnection. Tools read the current PortableAPI workspace rather than a separate database. Synthetic CSV import preserves exact bytes/SHA and returns safe metadata, while selected-series point pagination preserves original zero, missing values and full precision. Record metadata, task create/edit/stale guards, actual Plot navigation and primary Schedule navigation pass.

Host, Origin, bearer token, JSON/schema and operation checks reject invalid requests. Unknown operations, oversized point pages, raw numeric editing, duplicate plot IDs and MCP password/bypass fields reject. Same-character-count non-ASCII authentication is explicitly tested: review identified a string/UTF-8 byte-length mismatch that could throw before authentication; the fixed byte-length check returns rejection and leaves the daemon healthy. Configuration permissions are 0700 for its directory and 0600 for its file. Tokens never appear in stdout/logs, browser storage, workspace data or backups; stdout stays valid JSON-RPC.

Destructive tools immediately return confirmationRequired/deleted=false and open the existing browser review dialog. They cannot supply a password. Canceling task/record/Library review changes nothing, pending reviews block unrelated mutations, and only explicit browser password/confirmation completes the selected synthetic task deletion. Measurement arrays/source bytes, media and other stored entities remain unchanged. Delivered timeout and disconnect report uncertain outcomes without automatic mutation retries. An actual browser fixture commits one task then delays its acknowledgement beyond timeout: exactly one task remains, and explicit manual reconnect can inspect it. The same stdio process can restart its own stopped broker without silently connecting a browser.

Exactly 20 MiB file transfer and one-byte-over-limit rejection are checked at the stdio/HTTP transport boundary using synthetic mock browser acknowledgements; this does not claim arbitrary 20 MiB spreadsheets are valid measurement schemas. The actual browser tests use valid small synthetic CSV and media fixtures. Evidence: `docs/browser-mcp-server-qa.json` (including server/tool source hashes), `docs/browser-mcp-qa.json`, `docs/browser-mcp-public-qa.json`; helpers: `tests/mcp-server-qa.mjs` and `tests/workspace-mcp-qa.mjs`. Registration and operation from the actual Codex desktop client are separate from these protocol/browser checks.

Andy then registered the real local server with `codex mcp add cry7574 -- <absolute-node> <absolute-server-path>`. `codex mcp get cry7574 --json` confirmed the enabled stdio entry and exact executable/script paths. The real default broker was started, its connection file is ignored by Git, and a separate stdio client successfully initialized the registered entry, listed all 17 tools and read `get_connection_status` as disconnected. The actual user's browser was not paired or read during this check. The current chat's tool catalog has not been reloaded: the user still needs to restart/reload Codex and explicitly connect the intended browser tab to complete interactive use.

## Primary Schedule workspace

The private build (**3,907,658 bytes**, SHA-256 `57f51f1f35ec6098b66537387b7d2be838f205c289e4020a46a5fc4450bc747b`) and empty public build (**400,887 bytes**, SHA-256 `70955cca99a267a74f45ba2e13dfe013a6810ad13c3cd60fd5cc5d93f2eba8c6`) each pass **66 independent Schedule checks** in disposable offline Chrome profiles. Both runs record zero JavaScript errors and zero HTTP/HTTPS requests. Synthetic task, measurement and media fixtures are used; actual user storage is never opened or edited.

Schedule is the third primary navigation item, after Data workspace and Plot view, and opens a full page of bounded task cards. The redundant Tasks header button is absent; the legacy More tools → Project progress entry closes its dialog and opens Schedule. All HTML IDs remain unique. Navigating Data → Plot → Schedule and back preserves exact plotted zero/missing/full-precision samples, active records and view ranges. Navigation adds no new hash-routing behavior.

Actual card create/edit/delete, owner and notes escaping, saved status/progress, search/status/overdue filtering, weighted progress, invalid dates and stale-edit/delete guards pass. Cards paginate 50/5/50 for 55 matching tasks; the optional table and inclusive-date Gantt reuse that same filtered page and stored tasks. Leap-day duration/progress geometry and omission of incomplete dates remain correct. Creating a task from filtered/paginated results makes the saved card visible. Complete/invalid/legacy backups, reload and full browser restart retain all task data and preserve measurement/source bytes, media, styles, reports, comparisons, Libraries and settings.

At 1500, 1100 and 390 px, the header/navigation and cards have no document or card overflow, including a 196-character unbroken title, 100-character owner and 5000-character note. Long fields wrap or clamp within the card. Jams visually reviewed `docs/schedule-workspace-1100.png` and `docs/schedule-workspace-mobile.png`; Andy independently reviewed the final desktop and 1100 px views. Desktop evidence is `docs/schedule-workspace-desktop.png`. All displayed task/progress counts in these images are synthetic QA fixtures, not real project status. Evidence: `docs/browser-schedule-qa.json`, `docs/browser-schedule-public-qa.json`; helper: `tests/workspace-schedule-qa.mjs`, adapted from the prior task-table suite while retaining its numeric, date, guard, backup and data-preservation assertions.

## Task table and optional schedule release

The final private application (**3,902,421 bytes**, SHA-256 `278ab639abcc69c45aa21140d938b31704a05d1cb27ac1690cab69c95e1f5039`) and empty public application (**395,650 bytes**, SHA-256 `47e2acf7a3591e657d18262086e6b19ac657093aea46c0551dd8dacf9d5da6f3`) each pass **56 independent focused task checks**. Both runs used disposable offline Chrome profiles with synthetic task, measurement and media fixtures and recorded zero JavaScript errors or HTTP/HTTPS requests. No actual user workspace was opened or changed.

The direct Tasks entry opens a searchable table with task, owner, optional start/due dates, status and completion. Real create/edit forms persist all fields; new owners begin blank. Invalid dates, inverted schedules, missing/oversized owners, invalid status/progress and unknown fields reject atomically. Valid leap-day, same-day, start-only and due-only cases pass. Search covers owners as well as titles; status/overdue filters combine correctly, exclude Complete tasks and treat a task due today as not overdue. Weighted completion uses all saved task weights. A new task remains visible after creation from filtered/paginated results.

Stale UI/API edits cannot overwrite newer revisions and retain the unsaved draft. Exact-password/confirmation/revision deletion guards reject wrong passwords and stale reviews; cancellation clears secrets and changes nothing. Successful deletion removes only the selected task. Legacy unguarded API PATCH remains compatible. Legacy backups lacking start dates and revisions restore blank starts/revision 1 without inventing dates; complete backups preserve every task field, while invalid schedules reject without replacing measurements or media. Reload and full browser shutdown/restart retain task data.

The optional SVG Gantt stays limited to the current filtered page: 55 matching tasks paginate 50/5/50. Independent geometry checks verify inclusive three-day duration across leap day versus one-day duration and exact 50%/100% progress widths. Tasks missing either date have no inferred schedule bar. Desktop and 390 px layouts have no document overflow; wide task tables scroll internally. Andy and Jams reviewed `docs/tasks-workspace-desktop.png` and `docs/tasks-workspace-mobile.png`. Original samples, source bytes, media metadata/backup bytes, styles, frozen reports, comparisons, Libraries and settings remain unchanged. The screenshots show synthetic QA tasks and do not represent actual project progress.

Evidence: `docs/browser-tasks-qa.json`, `docs/browser-tasks-public-qa.json`; reproducible helper: `tests/workspace-tasks-qa.mjs`. Existing unrelated suites were not repeated for this focused task-table change.

## Specification SPL spelling fix

The final private build (**3,891,637 bytes**, SHA-256 `717649715b7f5d79a6b47b509e6c2c3b6df641b2d89bd3fd7efe4c7a05d9d3a7`) and empty public build (**384,866 bytes**, SHA-256 `5cdedf77c3ab79ab4acb00136aa7c3fcce0d5e8afc7d416d2922df2d802f7e5e`) each pass **29 independent focused UI checks**. The existing **47-check specification UI/canvas regression** also passes on the private build. All browser tests use temporary offline profiles and synthetic curves, with zero JavaScript errors or HTTP/HTTPS requests.

All nine application combinations of `dBSPL`, `dB SPL` and `dB(SPL)` now assess the same unchanged numerical values. The reported screenshot pair (`dB SPL` measurements with `dBSPL` specification) produces the expected original 400 Hz sample: measured 12, upper limit 10, exceedance 2. Edge equality, real zero, missing measurement and uncovered frequency retain their previous meanings. Applied status and cursor keep the original source spellings.

True unit mismatches (`dBV`, `dBFS`, `dB`, `Vrms`, `%`) and unsupported variants (`dbspl`, `dBSPL1`, internal double spaces) still reject, with both original unit strings in the error. This narrow spelling equivalence applies only when applying a specification: lower/upper profile create/PATCH captured-unit checks, saved comparisons and ordinary multi-record overlays retain strict matching. Samples, source bytes and strings, reports, comparisons and definitions remain unchanged; backup/restore and reload preserve them exactly. Evidence: `docs/browser-spec-unit-qa.json`, `docs/browser-spec-unit-public-qa.json`, `docs/browser-specification-ui-qa.json`; helper: `tests/workspace-spec-unit-ui-qa.mjs`. The prior regression's error assertion was updated to require both unit names and explicit no-conversion wording, retaining its rejection and no-applied-state checks.

## Feishu QT video compatibility

The genuine user-supplied `.qt` video passed **39 focused checks on each final build** in separate disposable offline Chrome profiles. The private application is **3,891,104 bytes**, SHA-256 `e5a8e5c84cf2bba4253f1f019d8e72aa33b3b00ae55acc62f8f369565e56c735`; the empty public distribution is **384,333 bytes**, SHA-256 `6f8491a601526ddcd205e63f48bff387e7e9ddc3f1ec29f4f8eee5c60dd66e2b`. The public distribution also passes all **12 empty-workspace release checks** again. Both runs recorded zero JavaScript errors and zero HTTP/HTTPS requests. No Git push was performed for this change.

The original Feishu file is a genuine QuickTime `qt  `-brand container, not a renamed MP4. Its 2,685,315 bytes, SHA-256 and modification time remain unchanged after testing. Real native inline playback advances and yields decoded frame pixels; upload creates a JPEG poster. Lower/upper-case `.qt` and empty, octet-stream, MP4 or QuickTime browser MIME hints normalize to stored `video/quicktime`. Strict original-container validation remains: a renamed MP4, WebM, wrong MIME, invalid signature and an undecodable header-only file do not become valid QT uploads. An invalid backup containing MP4 bytes labeled QT rejects atomically even when its supplied size and hash match those bytes.

Per-file retry/deduplication, safe caption edits, guarded media-only deletion, exact-byte complete backup/restore and full browser shutdown/restart pass. Prior PNG, MP4, WebM and genuine MOV upload paths still pass browser preflight and Save. Original measurement arrays/source bytes, frozen reports and saved comparisons remain unchanged. Actual video bytes and decoded frames were not copied into the repository; the helper reads the local file only and uses temporary browser storage. Evidence: `docs/browser-qt-media-qa.json`, `docs/browser-qt-media-public-qa.json`, `docs/browser-public-release-qa.json`; helper: `tests/workspace-qt-media-qa.mjs`.

Andy independently passed **6 actual-QT checks** on the final empty distribution, including inline playback/poster, canonical MIME, filename/size/SHA-256/modification-time preservation, `.qt` chooser acceptance, private/public code parity apart from seed, and zero browser/network errors. Evidence: `docs/browser-qt-andy-qa.json`. No original video or frame capture accompanies the repository.

## Initial public empty-workspace distribution

The separately named `dist/CRY7574 Hearing Aid Box Measurement Manage Software.html` passed **12 focused offline release checks** in a fresh disposable Chrome profile. The artifact is **383,893 bytes**, SHA-256 `76d4c20d5b9cad9b22b619924afe1d3583e3b9088f7e9035a155a535a39f4b4f`.

Fresh initialization contains one empty Measurements Library and zero charts, sources, tasks, reports, activity, groups, comparisons, environment media or specifications. No measurement files, photos, videos, progress claims or thresholds are bundled. Synthetic CSV preview makes no writes; Save preserves zero, missing values, full numeric precision, unknown test date and exact downloadable source bytes. Creating a Library, opening the actual graph, creating/applying a user-supplied upper-limit profile and reloading saved records all pass. Zero JavaScript errors and HTTP/HTTPS requests were recorded. Evidence: `docs/browser-public-release-qa.json`; reproducible helper: `tests/public-release-qa.mjs`.

Read-only review of newly added source, documentation, tests and the public artifact found no private measurement/media payload or credential signature. Embedded branding is the CRYSOUND logo; media test fixtures are locally generated synthetic images/videos. Ignore rules exclude the private seed, reference/data directories, original workbooks, private root application and browser evidence. Pre-existing tracked legacy report pages remain outside this empty-application claim. The private root application's bytes and SHA-256 remain unchanged from the specification release below.

## Current specification-Library and live-limit release

The final standalone file passed **50 independent numerical checks**, **58 profile/API/backup checks**, **47 real UI/canvas checks**, and the complete **109-check workspace regression**. All browser suites used disposable offline Chrome profiles and recorded zero JavaScript errors and zero HTTP/HTTPS requests. No actual user workspace or browser profile was accessed.

Current artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,890,664 bytes**.

SHA-256: `d5e44cb46990f9dfebb3246303461c06ed04cf44bcdb5183cf4d3e808e0baa0d`

| Specification workflow | Verified result |
| --- | --- |
| Separate Library and definitions | The real Library form creates a Specifications / limits collection. Named profiles store lower/upper original-record and series references with a captured exact unit, not copied measurement arrays. Dual FR and upper-only THD profiles create, search and edit successfully. Failed saves retain selections and titles; imported unit markup renders as literal option text with no inserted DOM or execution. Legacy Libraries default to Measurements and old backups gain no profiles. |
| Mathematical behavior | Bounds interpolate linear Y over logarithmic frequency. Exact endpoints retain original values; equality is within limits with no additional engineering tolerance. No extrapolation or interpolation across missing knots occurs. Duplicate bound frequencies, malformed curves, crossed bounds and disconnected dual coverage reject explicitly. One-point curves assess only their exact frequency. Missing values and real zero remain distinct. |
| Numerical safety | The narrow-high-frequency regression uses upper points near 1e12 Hz that previously produced 0/0 from log10 cancellation. The fixed engine returns finite upper 15 and an 85-unit exceedance for a measured 100, rather than a false Within result. Both the pure module and actual bundled browser engine pass this regression. |
| Original-point graphics | Six expected failures have exact original-sample canvas positions and real red pixels. Lower/upper dashed overlays remain separate from saved curve appearance. Specification-Library traces and reference lines are excluded from measured assessment. Zoom clips marker drawing while counts retain the full original dataset. Auto Y includes interpolated bounds even when all bound knots lie outside the visible X interval. |
| Live cursor and decimals | Two traces with different grids evaluate bounds at their own nearest Sample X, not Mouse X. Missing and uncovered samples remain explicitly unassessed/missing. Measured duplicate frequencies retain the earlier cursor sample while all original points are assessed separately. Two-place formatting changes displayed values only; a tiny true exceedance remains a red failure and displays approximately 0.00 with its exact original value inspectable. |
| Current-view scope | Opening a new selection or saved comparison removes the applied profile. Changing a definition or measured-Library purpose clears stale assessments and requests reapplication. Hidden limit sources remain usable with an explicit selector hint. Applying limits does not add assessment state to saved comparisons or alter old report JSON/HTML. |
| Guards, references and capacity | Creation/edits enforce same Library, exact unit, valid series and bounds. Metadata-only edits can retain unavailable historical references. Moved, deleted or wrong-purpose references are explicit. Revision checks reject stale/concurrent edits and deletes; only one same-revision writer commits. Exact CRYSOUND and confirmation delete only a profile. The 1001st definition rejects atomically while existing profiles remain editable at the 1000 cap. Reviewed record/Library deletion scopes include linked/owned profiles and reject changed definitions; raw-bound deletion retains an unavailable profile, while Library deletion removes its owned definitions. |
| Persistence and backup | Full backups retain definitions, purposes and original source bytes exactly. Invalid IDs, revisions, units, geometry and purposes reject without writes. Legacy and historical-missing backups remain compatible. Another open tab revalidates restored bound data even when IDs are reused; the per-snapshot cache cannot reuse stale geometry. Profile definitions and Library purpose survive reload; applied assessment remains a current-view choice. |
| Tables and exported plot | Fifty-five failing points paginate 50/5/50 rows with original indices. The exported PNG includes the actual grid, markers, readable aligned profile header and explicit SPECIFICATION LOWER / UPPER LIMIT entries with the unit. Desktop PNG and mobile layout were visually reviewed; the 390 px document has no horizontal overflow, with wide result tables scrolling internally. |

Andy independently passed **9 synthetic UI checks** on the same final file, including actual create/apply/live cursor behavior, red failure marks, aligned plot header, safe unit-option markup and zero browser/network errors. Evidence: `docs/browser-specification-andy-qa.json`; reviewed screenshots: `docs/specification-plot-qa.png` and `docs/specification-cursor-qa.png`. These are synthetic engineering QA fixtures, not user acceptance limits or CRY7574 test-environment/compliance evidence.

Numerical evidence/helper: `docs/limit-engine-qa.json` / `tests/limit-engine-qa.mjs`. API evidence/helper: `docs/browser-specification-api-qa.json` / `tests/workspace-specification-api-qa.mjs`. UI evidence/helper: `docs/browser-specification-ui-qa.json` / `tests/workspace-specification-ui-qa.mjs`. Existing regression: `docs/browser-workspace-qa.json`, again preserving the two earlier read-only AP workbooks and all 8,561 original pairs. Reviewed exported plot: `docs/specification-plot-export.png`; mobile view: `docs/specification-mobile.png`.

Independent review corrected a false-Within numerical edge and cross-tab geometry-cache invalidation before final verification. The final UI also has regressions for aligned profile headers, hidden-source updates and escaped imported units. All original numeric arrays, source bytes/hashes, saved styles, saved comparisons and frozen report snapshots remain preserved. No defect remains open.

## Previous AP workbook empty-sheet repair

The reported workbook now imports successfully. Independent inspection found **97 worksheets**: 32 RMS, 32 THD, 32 H2:H5 and Summary. Twenty distortion worksheets have valid frequency columns with every Y value missing. The preceding app rejected the first such sheet with `Chart needs at least one measured value` and aborted the entire workbook; this failure was reproduced with unchanged temporary storage in `docs/ap-empty-sheet-reproduction.json`.

The final repair passed **102 focused checks** and the complete **109-check workspace regression** on the same standalone file. Both suites used offline Chrome with disposable profiles, zero JavaScript errors and zero HTTP/HTTPS requests. Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,846,140 bytes**, SHA-256 `3535d60408887d7eeed3208bbf5cf502bdadac3b83e5a92034b4d6baccc8ff13`.

| Import behavior | Verified result |
| --- | --- |
| Actual workbook fidelity | All 76 retained records match every independently read original X/Y pair, original source unit and source-cell/header mapping. They contain **8,750 pairs: 8,454 numeric Y values and 296 missing Y values**. Test dates remain unknown. No numeric zeros are invented. |
| Explicit exclusions | Preview lists the 20 recognized all-missing AP sheets and Summary with reasons. Empty-sheet metadata retains full measurement title, channel, unit, 113/116 row counts and exact source-row provenance. The original workbook retains all excluded cells and downloads byte for byte. |
| Existing source evidence | Summary's original Passed/Failed entries remain verbatim source metadata; they are not interpreted as application verification or CRY7574 compliance results. Repeated AP measurement titles have unique display labels containing worksheet identity while exact original titles remain in provenance. |
| Narrow validation change | Synthetic mixed AP workbooks retain valid measured zeros and partial gaps while excluding only well-formed all-missing sheets. Invalid zero/descending frequencies, uncached formulas and extra columns still reject the whole import atomically. All-missing-only AP workbooks and generic XLSX/CSV/JSON all-null data remain invalid. |
| Actual workflow and preservation | The real Import dialog previews without writes and saves 76 records once. Original-file download, report source/exclusion details, existing records/styles/reports/comparisons and the original workbook's hash/mtime remain exact. Full 109 regression again verifies both earlier AP workbooks and all existing daily workflows. |

Andy independently passed **10 actual-file UI checks** on this same final file: preview 76 / exclusions 21 with an explicit 20-sheet warning, source names/reasons, read-only preview, save 76 unique records, exact numerical/null totals, unknown dates and unchanged original source hash. Evidence: `docs/browser-ap-empty-sheets-andy-qa.json`; the bounded exclusion list in `docs/ap-empty-sheets-preview.png` was visually reviewed.

Focused evidence: `docs/browser-ap-empty-sheet-qa.json`; helpers: `tests/workspace-ap-empty-qa.mjs` and `tests/ap_empty_fixture.py`. Integrated evidence: `docs/browser-workspace-qa.json`. The source `5G-02-消声室-240mm-1.xlsx` remains read-only, **252,600 bytes**, SHA-256 `96f4c5c5b855f46ce1592cee60bf586f26fc34ac7dcebdc42d118879de1fe090`; it was not copied into the repository or uploaded externally. No actual user workspace was modified and no product defect remains open.

## Previous test-environment media release

The final environment-media release passed **80 focused checks** and the complete **109-check workspace regression** on the same standalone file. Both suites ran offline Chrome with disposable profiles and recorded zero JavaScript errors and zero HTTP/HTTPS requests. No actual user browser profile or workspace was accessed.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,843,633 bytes**.

SHA-256: `7c1f175bfaea08593df7d3c15d73e9aceda3400c34901d6faac9fd3435ce3d0f`

| Environment workflow | Verified result |
| --- | --- |
| Real gallery and video | Generated PNG/JPEG images produce independently checked decoded red/blue pixels in the inline gallery and enlarged original. Genuine WebM and MP4 fixtures play in native video controls and produce the expected decoded frame pixels after playback advances. Playback requires user action; no autoplay is enabled. Valid originals without optional thumbnails fall back to actual image Blob previews. |
| Record and comparison scope | Media remains attached to its original measurement. Switching the active record during a held upload does not misattach files. A reopened saved comparison shows only the chosen active member's media, including after a complete browser shutdown/restart. Original chart arrays, metadata, source bytes/hashes, styles, comparisons and frozen reports remain unchanged by attachment operations. |
| Per-file failure recovery | Direct multi-file upload reports each failure separately and saves other valid files. A simulated photo-save failure retries successfully without duplicating a saved video; reselecting the same file is idempotent. Broken supported-looking media fails browser decoding before any upload POST. Unsupported types, MIME/extension mismatches and over-20-MiB photos / over-50-MiB videos reject before persistence. English chooser/status errors and busy-state locking remain usable under Chinese browser locale. |
| Captions and guarded deletion | Caption forms save literal escaped annotations, and revision checks preserve stale drafts without overwriting newer captions. Deleting media requires exact CRYSOUND, confirmation and the reviewed revision. Cancel and stale deletes change nothing and clear secrets. Correct deletion removes only the chosen media metadata/Blob; measurements, original source files, comparisons, other media and reports survive. |
| Durable storage and backups | Original bytes are separate native Blob rows in the existing IndexedDB store; the database stays at version 1 and primary metadata contains no original base64. Complete backup embeds every media original with exact size/SHA-256. Invalid bytes, missing data, duplicate IDs, unsafe links, invalid revisions/posters reject atomically. Full restore recreates metadata and exact Blob bytes together while preserving unrelated store keys. Old backups default to no media and clear the media namespace safely. |
| Historical orphans and bounds | Safe orphan media from older-tab deletions remains explicitly accessible with a decoded gallery, without resurrecting its record. Thirteen orphan fixtures render 12 / 1 / 12 cards through Next/Previous. Each normal record accepts 12 items; the 13th rejects atomically. Desktop/mobile gallery controls were visually reviewed, and the 390 px document has no horizontal overflow. |
| Record/Library cascades | Deletion reviews include media counts. Adding media or changing a caption revision invalidates a reviewed record/Library deletion scope. Fresh confirmed deletes atomically remove only the affected media metadata and Blob rows. Frozen reports retain required measurement source bytes even after final fixture-record deletion. Passwords and confirmations are never persisted in media metadata or backups. |

Andy independently passed **9 real-AP integration checks** on the same final file: both read-only AP workbooks imported 7 records with all 8,561 original pairs and exact source hashes, synthetic photo/MP4 direct preview/play/reload, and unchanged complete AP record/series/style objects. Evidence: `docs/browser-ap-environment-qa.json`; the synthetic-media AP integration screenshot `docs/environment-preview-ap.png` was visually reviewed. These are QA fixtures, not evidence of the actual test environment.

Focused evidence: `docs/browser-environment-media-qa.json`; helper: `tests/workspace-environment-qa.mjs`. Integrated evidence: `docs/browser-workspace-qa.json`. Synthetic fixture provenance and generator: `tests/fixtures/media/README.md` and `tests/generate-media-fixtures.mjs`. Additional reviewed views: `docs/environment-media-gallery.png` and `docs/environment-media-mobile.png`. No camera, microphone, real environment photograph or recording was used or bundled in the application; all media tests used locally generated fixtures in temporary storage. No product defect remains open.

Review corrected the missing-thumbnail image fallback and bounded the orphan gallery to 12 cards per page before final verification. Existing media-free data, cursor/zoom, metadata/deletion, report, progress, import, backup and migration regressions all remain passing.

## Previous English upload-control release

The English upload-control change passed **23 focused checks** in offline Chrome configured with Chinese (`zh-CN`) locale and a disposable profile. The final standalone artifact is **3,812,326 bytes**, SHA-256 `05e8b760a2c7e70863089c7beeb4eac6d309b8adb996ee738335aa5c90108e8f`. The change affects upload UI only; the complete 109-check regression passed on the immediately preceding range-field release and was not repeated for this localized control change.

The visible control reads Choose files, with No files selected / 1 file selected / 2 files selected in English. Enter and Space each open the actual multiple-file chooser. The hidden native input retains XLSX/CSV/JSON acceptance; empty preview now gives explicit English validation. Cancel without a replacement preserves the selection and queued entries. The button disables during pending preview/save, and metadata changes invalidate previews correctly. Both fixture files preview without writes and save with exact original Unicode filenames, source bytes/hashes, missing values, zeros and full-precision samples; original downloads remain byte exact.

The 390 px mobile view has no horizontal document overflow, and the button/count were visually reviewed as readable in `docs/upload-file-control-zh-mobile.png`. Both browser error and HTTP/HTTPS request counts were zero. Evidence: `docs/browser-upload-labels-qa.json`; helper: `tests/workspace-upload-labels-qa.mjs`. No real user workspace was modified and no product defect remains open.

Verification limit: Playwright observes actual chooser opening and file selection; cancellation is exercised with a cancel event and no replacement FileList. Native operating-system dialog localization remains controlled by the OS.

## Previous precision-aware range-field release

The final range-field release passed **57 focused checks** and the complete **109-check workspace regression** on the same artifact. Both suites used offline Chrome with disposable browser profiles and recorded zero JavaScript errors and zero HTTP/HTTPS requests. No real user workspace or browser profile was accessed.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,811,276 bytes**.

SHA-256: `61dcdd920f688b1b0b3586fdbd85843d6a94fe3a2a774a0197bfd0a487c8c753`

| Range-field workflow | Verified result |
| --- | --- |
| Unified resting precision | All four resting X/Y inputs follow Auto or fixed 0, 1, 2, 3 and 9 places, preserving trailing zeros and normalizing rounded negative zero. Auto displays the full current mathematical number. Focus reveals the exact bound, and clean blur restores the selected display precision. |
| Exact unchanged Apply | Applying unchanged formatted inputs preserves the actual X/Y geometry exactly. Tiny positive X endpoints may both display 0.00, and distinct narrow endpoints may share the same text, without becoming zero or collapsing their plotted range. Tiny Vrms-like Y values remain exact. |
| Independent partial edits | A typed field remains an unrounded draft until Apply. Editing one endpoint preserves the untouched endpoint's exact value. Applying X preserves pending Y edits; applying Y preserves pending X edits. Invalid blank drafts reject without changing geometry. |
| Draft preservation and intentional actions | Hover, cursor leave, decimal changes, state refresh and resize preserve pending drafts. X-induced automatic Y changes retain an unapplied Y draft. Reset clears both axes intentionally; Auto Y clears only Y; X-only wheel updates X while retaining Y drafts and exact fixed Y geometry. |
| Persistence and integrity | The stored global precision formats newly opened range controls after reload. Plot interactions and formatting preserve every chart, original source byte/hash, saved style, comparison, task, Library, frozen report and final settings object. Original-file download remains byte exact. |

Andy independently passed **8 real-AP/UI checks** on the same final file, reproducing the requested two-place bounds 0.18 / 7873.43 / 40.80 / 107.23. Unchanged Apply kept exact geometry, focus exposed original precision, dirty Y survived a precision change, and tiny X values displaying 0.000 retained 1e-8–2e-8 mathematically. Complete original AP series/style objects remained unchanged. Two-place and three-place screenshots were visually reviewed. Evidence: `docs/browser-ap-axis-input-qa.json`; screenshots: `docs/axis-range-inputs-2dp.png` and `docs/axis-range-inputs-3dp.png`.

Focused evidence: `docs/browser-axis-input-qa.json`; helper: `tests/workspace-axis-input-qa.mjs`. Integrated evidence: `docs/browser-workspace-qa.json`, retaining all real-AP original-pair/source checks, cursor and zoom assertions, metadata/deletion guards, reports, progress, backups and migration. The earlier decimal helper now checks the authorized formatted resting fields together with independent exact geometry assertions; it was not rerun as an additional broad suite. No product defect remains open.

## Previous saved-comparison release

The saved-comparison release passed **71 focused checks** and the complete **109-check workspace regression** on the same final standalone file. Both suites used offline Chrome with disposable profiles and recorded zero JavaScript errors and zero HTTP/HTTPS requests. No actual user workspace or browser profile was accessed.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,807,778 bytes**.

SHA-256: `c75d6ab96c4ab06e41dc076cd458c9d27d28b42f16a4007ca6a7f94bd4107633`

| Comparison workflow | Verified result |
| --- | --- |
| Separate saved entities | Create, search and edit comparison title, actual date, tags, annotations and ordered original-record links. Creating and editing entities preserves original samples, source bytes/hashes and frozen reports. Reopening retrieves the latest record metadata and saved curve style, without copying or combining samples. |
| Actual forms and drafts | The real manager/form creates comparisons and removes, reorders and adds members. A simulated save failure retains all metadata and member-order drafts; retry commits them. The live member picker changes only the current plot; Save as new creates an independent entity. Stale edits preserve the draft and offer saved-version reload or a separate copy. |
| Missing and hidden records | Lookup explicitly identifies hidden records and offers Open incl. hidden. Original-record deletion leaves an explicit missing link. Opening partial comparisons keeps a persistent warning; opening an all-missing comparison clears stale traces and retains its warning. Metadata-only edits remain possible when every member is missing. |
| Original-record actions | Overlay Edit uses the original metadata form. Remove from plot changes no saved data. Delete record uses the existing reviewed-scope dialog and exact CRYSOUND password; frozen reports and required original source bytes remain preserved. |
| Validation and concurrency | Invalid dates, fields, duplicate/unknown members, incompatible units and more than 12 records or 32 series reject atomically. Revision checks reject stale writes and deletes. Two concurrent same-revision writers produce exactly one committed update. |
| Guarded entity deletion | Exact case-sensitive CRYSOUND, explicit confirmation and the reviewed revision are required. Cancel clears secrets and changes nothing. Deleting a comparison removes only that entity; records, sources, reports, tasks and Libraries remain unchanged. Passwords and confirmation fields are not persisted. |
| Capacity and compatibility | A synthetic 1,000-comparison workspace paginates with only 50 rows in the DOM. Creation above the cap rejects atomically while an existing entity remains editable. Old backups default to an empty collection; invalid comparison backups reject without writes. Complete backup restore and a full browser restart preserve entities, original records, missing links and snapshots exactly. |

Andy independently passed **11 real-AP/UI checks** on the same final file: a two-SPL-record comparison, comparison metadata edits, editing an original record title, view-only removal, saved membership revision/reload, wrong-password rejection and comparison-only deletion. All original complete series/style objects and source hashes remained unchanged. Desktop and mobile screenshots were visually reviewed, with zero JavaScript errors. Evidence: `docs/browser-ap-comparison-qa.json`; screenshots: `docs/saved-comparisons-ap.png`, `docs/comparison-record-actions.png`, and `docs/saved-comparisons-mobile.png`.

Focused evidence: `docs/browser-comparison-qa.json`; helper: `tests/workspace-comparison-qa.mjs`. Integrated regression evidence: `docs/browser-workspace-qa.json`, including independent fidelity checks of all 8,561 original pairs from both read-only AP workbooks, exact original downloads, cursor/range/zoom behavior, reports, progress and compatible backups. No product defect remains open after verification.

## Previous major/minor graph-grid release

The final graph-grid release passed **90 focused checks** and the complete **109-check workspace regression** on the same artifact. Offline Chrome used disposable profiles; both suites recorded zero JavaScript errors and zero HTTP/HTTPS requests. The change affects tick generation and drawing only; original records and runtime storage behavior remain unchanged.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,772,837 bytes**.

SHA-256: `7963b4f3b7696e8e1df0221bdb3c832b972944024d408403ba84d7b68c755d9d`

| Grid workflow | Verified result |
| --- | --- |
| Log-frequency ticks | Actual canvas paths match independent logarithmic positions. A spacious 100–1000 Hz view contains decade majors, 2/3/5 secondary ticks/labels and remaining 2–9 subdivisions. Darker/heavier majors and lighter minor lines are distinct. Wide ranges reduce visible density while retaining bounded tick definitions. |
| Linear Y ticks | Major steps align to 1/2/2.5/5 × powers of ten, with four inner minor marks at step/5. Actual drawing uses the correct linear positions; negative and tiny ranges remain finite. User-entered ranges are not snapped to tick values. |
| Dense and extreme views | Ordered, unique, finite tick sets remain bounded across four decades, negative Y, 1000–1001 Hz, tiny voltage-like Y, ±1e-12 Y and the full 24-decade / ±1e15 display limits. Narrow logarithmic ranges provide useful labels. |
| Labels and mobile | Actual canvas text metrics show no overlap or clipping on desktop or 390 px mobile, including fixed nine-place labels and very large Y values. Dynamic left margins preserve plot space; duplicate rounded labels are suppressed without changing stored precision. Numeric range inputs retain exact values. |
| Interaction and styles | Cursor readouts still use original nearest samples. Wheel anchoring, rectangle selection, reset and unapplied numeric edits pass independent assertions. Existing red dash-dot appearance remains intact. PNG captures the same current tick layout and retains its graph/style legend. |
| Data integrity | Stored chart/series objects, source bytes/hashes, saved styles, frozen reports, tasks, groups and Libraries remain unchanged throughout grid exploration. Only the explicitly tested decimal-setting changes affect settings/activity. The full workspace regression again verifies all real AP source pairs and original downloads. |

Andy independently passed **8 real-AP checks** on the same final file, including two actual SPL traces, aligned Y ticks, narrow manual ranges, unchanged complete original series/style objects, PNG export and desktop/narrow/mobile visual review. Evidence: `docs/browser-ap-axis-ticks-qa.json`; screenshots: `docs/ap-major-minor-desktop.png`, `docs/ap-major-minor-narrow.png`, `docs/ap-major-minor-mobile.png`, and `docs/ap-major-minor-export.png`.

Focused evidence: `docs/browser-grid-qa.json`; helper: `tests/workspace-grid-qa.mjs`. The independently reviewed synthetic PNG and mobile view are retained in `docs/grid-plot-export.png` and `docs/grid-mobile.png`. Full regression evidence: `docs/browser-workspace-qa.json`. No real user workspace or browser profile was accessed, and no defect remains open.

## Previous saved trace-appearance release

The final release passed **64 focused trace-style checks**, using offline Chrome and a disposable profile. The complete **109-check workspace regression** and **54-check precision/export regression** passed on the preceding style candidate; the final change only adjusts shared dash spacing for wide strokes, and the focused suite was rerun on the final file. All recorded zero JavaScript errors and zero HTTP/HTTPS requests. The prior source-fixture comparisons omit only the newly added presentation field `series.style`; numeric pairs, names, reference flags and complete style-aware JSON roundtrips remain exact.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,766,385 bytes**.

Previous SHA-256: `7b7e496913d09058dafcb74c06a1dd46b583c1ca43fc0005b397863f635a5666`

| Trace workflow | Verified result |
| --- | --- |
| Independent identity | Same channel names on different records and multiple series on one record retain distinct appearances. Changing overlay order does not move styles to another trace. Partial updates preserve sibling styles and other appearance fields. |
| Automatic save and recovery | Width commits and color/line changes save without an extra Save click. Pending width input and focus survive refresh. A simulated save failure keeps the entered value, reports failure and offers Retry; recovery persists the exact choice. Enabled/disabled traces remain selected correctly during refresh. |
| Validation and source integrity | Colors require six-digit hexadecimal values; solid/dashed/dotted/dash-dot and widths 0.5–6 px are accepted. Invalid colors, styles, widths, IDs, indexes, types and unknown fields reject atomically. Original samples/names/annotations, source bytes/hashes and Original file downloads remain unchanged. Metadata edits and hiding preserve styles. |
| Actual rendering | Canvas strokes use the selected color, width, dash pattern and cap for all four line modes. Cursor markers retain the chosen color/width with solid outlines; crosshair dashes remain separate. At the maximum 6 px width, dashed/dotted/dash-dot strokes retain at least 2 px open gaps after rounded caps in actual canvas, legend and report SVG checks. Desktop color/width controls meet minimum usable widths. The final exported PNG graph and legend were visually reviewed in `docs/trace-style-export.png`; all four modes remain visibly distinct. |
| Frozen reports | New snapshots retain each saved appearance, original points and gap-separated SVG segments. Later style edits cannot alter snapshot JSON or HTML. A synthetic legacy report captured from the preceding release still renders byte-for-byte identical HTML. |
| Persistence and exchange | Styles survive file reload, a different overlay order and complete browser shutdown/restart. Normalized JSON preserves styles and original samples through reimport. Full backup restore reproduces every source/report/style exactly. Old backups gain stable solid defaults without rewriting old snapshots; malformed live/report styles reject restore atomically. |

Andy independently passed **9 real-AP/UI checks** on this same file: two SPL curves, automatic red/dashed/3.2 px edits, reload restoration, unchanged arrays/source SHA-256, actual styled PNG, usable controls and desktop/mobile visual review. Evidence: `docs/browser-ap-curve-style-qa.json`; screenshots: `docs/curve-style-controls.png`, `docs/curve-style-ap-export.png`, and `docs/curve-style-mobile.png`.

Focused evidence: `docs/browser-trace-style-qa.json`; helper: `tests/workspace-trace-style-qa.mjs`; captured legacy fixture: `tests/fixtures/legacy-style-report.json`. Existing regression evidence is in `docs/browser-workspace-qa.json` and `docs/browser-decimal-export-qa.json`. No actual user records or browser profile were modified.

Review corrected two presentation issues before delivery: a checkbox width rule made the appearance inputs too narrow, and fixed dash gaps disappeared under thick rounded caps. Checkbox-specific CSS and width-aware dash spacing now have passing regressions and desktop/mobile visual evidence.

## Previous precision, Library selection and export release

The final release passed **54 focused checks** and the complete **109-check workspace regression**, all in offline Chrome with disposable profiles, zero JavaScript errors and zero HTTP/HTTPS requests. No real user workspace or browser profile was accessed. Existing measurement, import, cursor, metadata, deletion, report, project, migration and backup assertions remain intact.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,755,398 bytes**.

Previous SHA-256: `24fcaee79f190c8b2df3f0d63f1234851a7ea072cd05d1e89b72fa9fa7bccad1`

| New workflow | Verified result |
| --- | --- |
| Unified display precision | Settings of 1, 2 and 3 decimal places produce trailing zeros in raw X/Y, every enabled cursor sample, Mouse X/Y and actual canvas Y ticks. Real zero and Missing remain distinct. Nonzero values rounded to zero use an approximation marker with their original value available in the tooltip; negative rounded zero does not display a misleading minus sign. Tiny values and negative numbers retain their original stored precision. |
| Precise controls and persistence | All four numeric axis inputs keep their full precision. Display changes preserve complete chart arrays/metadata and exact source bytes/hashes. Invalid setting ranges/types/unknown keys reject atomically. Settings survive file reload, full browser restart and full backup restore. Old backups without settings default to Auto. |
| Same-Library selection | Select matching explicitly selects 55 filtered records across pages in one Library. Tagging updates all 55 while the other records, including another Library, remain unchanged. Plotting still enforces the 12-record limit. Filtering to two compatible tagged records plots both; individual toggles control their cursor readouts. |
| Importable normalized JSON | A selected two-record export preserves full-precision samples, dates, items, annotations, special-character titles/tags and source hash hints. The actual Import dialog previews without writes and reimports exact numbers and metadata into the chosen target Library. Its notice distinguishes normalized unvalidated measurements from original AP workbooks or a complete provenance archive. |
| Analysis CSV | All 11 original pairs retain full precision, negative numbers and blank missing values. Independent CSV parsing recovers commas, quotes, newlines, tags, source names and Library names correctly. Formula-like text is guarded while negative measured values remain numeric. Original-file and original-points downloads remain byte/full-precision exact at fixed display settings. |
| Plot PNG | The export is a valid high-resolution PNG of the current graph and enabled-only legend. Visual review of `docs/decimal-plot-export.png` confirmed readable graph, null gap, unit, source name, visible-series legend and limitations. |
| Frozen reports and compatible backups | New reports capture their display precision while retaining full-precision snapshots. Changing current precision cannot change their saved data or rendered labels. Reports without captured settings retain their original HTML. Invalid workspace/report precision in backups rejects atomically; complete restore reproduces all records and settings exactly. |

Andy independently exercised both real AP workbooks: **7 records imported**, a same-Library dB SPL filter selecting **3 overlaid records**, and normalized JSON preserving **all 3,895 selected pairs** exactly when matched by title and original source filename. The AP comparison PNG was valid, and the 390 px mobile header had no overflow. Desktop plot and mobile screenshots were visually reviewed; no browser errors occurred.

Evidence: `docs/browser-decimal-export-qa.json`, `docs/browser-workspace-qa.json`, and `docs/browser-ap-decimal-export-qa.json`. Focused helper: `tests/workspace-decimal-export-qa.mjs`. Visual evidence: `docs/decimal-plot-export.png`, `docs/decimal-ap-overlay.png`, and `docs/decimal-mobile.png`. Original AP workbooks remained read-only and were never uploaded to an external service.

## Previous standard logo update

The preceding logo update embedded the unchanged standard CRYSOUND symbol and wordmark from the retained English brand template; the current release retains it. Offline Chrome confirmed successful image loading, the original 2200:295 aspect ratio, desktop width 220 px and mobile width 200 px, with no mobile page overflow. Screenshots: `docs/standard-logo-desktop.png` and `docs/standard-logo-mobile.png`. That update changed the header asset and styling only.

Previous logo-only artifact: **3,741,649 bytes**, SHA-256 `ef6d63395a6ce82c19aca0f1030d9a9932a126fea5b3738caa027bd940175fcc`.

## Daily-record workspace acceptance before the logo-only update

The rebuilt English application passed **109 of 109 independent browser checks**, with zero JavaScript errors and zero HTTP/HTTPS requests. Installed Chrome ran offline over `file://` with a disposable persistent profile. The working SQLite database and the user's browser profile were never accessed. The build embeds one workspace controller, one independent measurement-plot module and the secondary-tools module, reusing the existing IndexedDB/API runtime.

Verified functional-regression artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, **3,636,320 bytes**.

SHA-256: `2123397ab186c315d33347135b5f91642ca11f91db37845544e582c63aef4454`

| Current workflow | Verified result |
| --- | --- |
| Daily records | Data opens with all visible records across Libraries. Library is optional. Actual-date boundaries, unknown dates, case-insensitive tags and notes search work independently of import time. Title/date/item/tags/annotations edit through the UI without changing original samples, source bytes or old reports. |
| Batch import and AP evidence | Actual multi-file preview saves nothing and reports valid/invalid files separately; Save retains only the valid file with original zero/null/precision/tags. Both supplied AP workbooks preserve all 8,561 source pairs, units, names, row mappings and exact bytes against an independent reader. AP02 Smooth remains Vrms; Summary N/A stays source metadata. Originals remain unchanged on disk. |
| Explicit comparison | Exactly selected compatible-unit records are plotted. Twelve records and 32 series are accepted; 13 records or 33 total series are rejected. Mixed SPL/Vrms is refused. Trace labels, channels, source names and classification remain visible. Each trace keeps its original grid. |
| Live cursor | Separate Mouse X/Y matches independent log-X/linear-Y calculations. Every trace displays its own original nearest Sample X/Y at four tested frequencies on distinct grids. Full precision, zero and Missing are preserved. Zero has a sample marker; the nearest missing sample has none. Outside-plot movement clears samples, and toggling a trace removes only its readout. Duplicate-frequency ties select the earliest original point. |
| View controls | Wheel anchoring, X-only/Y-only isolation, rectangle selection, Escape, double-click reset and tiny-Vrms zoom pass independent numerical assertions. Pending numeric X/Y edits survive hover/leave redraws, Reset synchronizes dirty controls even when actual bounds stay unchanged, and Apply updates rendered geometry. All view/cursor interaction leaves the complete persisted workspace unchanged. |
| Report and project tools | Reports capture only the active record's enabled original series, including during a multi-record overlay. All-disabled reports are blocked. Downloaded HTML escapes hostile notes/title and snapshots remain frozen after edits. Task creation/editing persists free-text owners, fractional progress, evidence and weights; displayed weighted completion matches an independent calculation. |
| Downloads and backup | Both actual source-file buttons download exact bytes with original Unicode filenames. Backup exports the latest complete workspace. Invalid hash restore is atomic and clears its file input; valid restore reproduces every stored record/source/task/report exactly. Older v1 backups migrate metadata without resetting measurements, project data or frozen snapshots. |
| Management safeguards | Hidden-data scope, show/hide reversal, exact password/confirmation, cancellation, incorrect whitespace password, stale concurrent Library review, hidden-inclusive Library deletion and orphan-source pruning pass through the new UI. Reports and required originals survive deletion. Passwords/tokens are absent from storage. |
| Scale and persistence | A 63-record collection renders 50 rows per page. Two explicitly selected records on different pages receive a tag; the other 61 records remain unchanged. Sources/reports stay frozen and tags survive reload. Complete Chrome restart preserves the workspace and returns to Data with no Library gate. AP raw-table rows retain full precision and exact A5/B5 mapping, bounded 100-row pages and read-only numeric cells. |

Two review findings were fixed before acceptance: duplicate frequencies could select a later duplicate despite the documented earlier-index tie rule; cursor redraws could overwrite unapplied numeric-axis input. Earliest-source-point selection and bounds-aware control synchronization now have passing regressions.

Evidence: `docs/browser-workspace-qa.json`; rerunnable helper: `tests/workspace-browser-qa.mjs`. Original AP files were read-only and were not copied into the repository or uploaded to an external service.

Andy independently passed **19 primary UI checks on the same final artifact**, including actual AP01/AP02 batch import of seven records, date/tag/detail edits, two-RMS overlay, original-point cursor values, dirty-axis hover/reset, byte-exact downloads, filter/selection return behavior, mixed-unit rejection and mobile Data/Plot layouts. No JavaScript errors or network requests occurred. Andy visually inspected `docs/daily-data-workspace.png` and `docs/daily-plot-cursor.png`; evidence is in `docs/browser-daily-ui-qa.json`. The earlier nine-check `docs/browser-workspace-tools-unit-ui-qa.json` is an isolated tools-module smoke test; the 109-check result above exercises those tools independently inside the actual integrated application.

## Previous standalone acceptance before the workspace rebuild

The preceding Library-first deliverable was **one self-contained HTML application**, opened directly by `file://` with no server or Python runtime. Jams completed **65 of 65 portable browser checks**, with zero JavaScript errors, zero HTTP/HTTPS requests and no external file assets. A fresh temporary Chrome profile ran with browser networking offline. This retained evidence describes the earlier DOM; current rebuild verification is recorded above.

Previous artifact: `CRY7574 Hearing Aid Box Measurement Manage Software.html`, 3,668,231 bytes. The Library-first/hide/delete build passed 55 targeted checks, the full 65-check portable regression and 30 targeted mouse-zoom/data-invariance checks. Existing tests changed only navigation to open a Library and expand the original-source archive; all prior numeric, persistence, snapshot and backup assertions remain.

Previous SHA-256: `4eb9566ba52e223ec03e75a84615d910aa0ad78062e9c4a8b7ed9067a086c94a`

| Portable workflow | Verified result |
| --- | --- |
| Native Excel | AP01 and AP02 preview without IndexedDB changes, then save exactly 3 and 4 charts. All 8,561 original pairs, full names, source rows, channels, zero values and units match the independent reader. AP02 smoothed data stays Vrms. |
| Original evidence | Both original source downloads match their hashes and Unicode filenames; source workbook bytes and modification times remain unchanged. Summary N/A stays source metadata rather than a pass decision. |
| Browser persistence | Saved data survives file reload and a complete Chrome shutdown/restart using the same temporary profile. Metadata and project progress persist. Concurrent independent edits from two tabs are both retained. |
| Reports | Older snapshots remain frozen after edits. Report HTML escapes hostile notes and retains native units and saved test details. Legitimate all-missing selected-series snapshots remain valid. |
| Backup | Export contains the latest complete persisted workspace. Export, mutate, then restore reproduces all source bytes, charts, tasks, reports, activity and groups exactly. |
| Atomic restore | Invalid schema, source hash, unsafe ID, duplicate chart ID, dangling source reference, task numeric value, report data, report source kind and AP provenance rows are rejected without changing IndexedDB. Restore file inputs clear after rejection and success. |
| Self-contained operation | All tested operations work offline over `file://`; no HTTP/HTTPS/backend requests or external file assets are loaded. |

Evidence: `docs/browser-portable-qa.json`. Reusable helper: `tests/portable-browser-qa.mjs`.

Andy independently passed **11 additional portable UI checks** with network offline, including actual Excel Preview/Save, curve and original-values display, metadata/task reload persistence, byte-exact source download, report preview, backup contents and mobile progress layout. No JavaScript errors or network requests were recorded. Evidence: `docs/browser-portable-ui-qa.json`; screenshots: `docs/portable-overview.png` and `docs/portable-original-values.png`.

Portable review found and resolved three issues before delivery: a legitimate all-missing report initially failed restore validation; separate IndexedDB read/write transactions could lose concurrent tab updates; and malformed restored metadata could break UI rendering. Snapshot-specific validation, a single readwrite transaction and stricter restore schema/mapping validation now have passing regressions.

## Simple Library-first workflow, hiding and permanent deletion

Jams passed **55 targeted offline Chrome checks**, using only synthetic records in a disposable profile. No JavaScript errors or HTTP/HTTPS requests occurred. Andy independently passed **24 actual-AP UI checks**, covering the Libraries landing, collapsed More navigation with reachable Reports/Progress, hide/unhide, wrong-password/cancel behavior, correct single-record deletion, hidden-inclusive Library deletion, retained reports, reload and mobile layout.

| Workflow | Verified result |
| --- | --- |
| Reversible visibility | Single and bulk hide/unhide preserve measurement arrays and source evidence. Hidden records disappear from the normal list and appear in the explicit hidden-data view. Filter changes clear out-of-scope selections; visibility persists after reload. Nonboolean visibility values and mixed missing/existing IDs reject atomically. |
| Explicit deletion guard | Lowercase, whitespace-altered or missing password, missing/false/string confirmation, missing token, changed IDs and unknown/duplicate IDs cannot delete records. Actual Escape cancellation preserves storage and clears secrets. Wrong UI passwords clear the password and checkbox. Submitted passwords, confirmation flags and review tokens never appear in saved workspace data. |
| Fresh reviewed scope | Another-tab visibility or notes revision, a new Library member and a report created after preview each invalidate the reviewed scope. The UI disables stale confirmation until a fresh review, even when the guard is entered again. |
| Exact scope and retention | Library deletion includes hidden members and excludes moved-out records. Shared originals remain for surviving siblings. Reports stay byte-for-byte equivalent as saved JSON snapshots; their original files remain even after the last live record is deleted. Truly orphaned originals are pruned. |
| Backup and empty workspace | Valid backups restore historical snapshots whose live chart/Library has been deleted. Deleting every Library leaves zero live records; complete Chrome restart and restore do not recreate default Libraries. Report-only originals still download with exact source bytes and filename. Creating a new Library and importing there works after defaults are deleted. |

The deletion password is an accidental-deletion confirmation step, not a security boundary. No user records were deleted during development or verification. Evidence: `docs/browser-deletion-qa.json` and `docs/browser-simple-library-ui-qa.json`. Rerunnable helper: `tests/portable-deletion-qa.mjs`; visual evidence is retained in the `docs/simple-*.png` screenshots.

## Batch import, user libraries and tags

Jams completed **39 organization API/migration checks** and **21 independent organization UI edge checks**, with zero JavaScript errors and zero network requests. All work used disposable Chrome profiles and synthetic data. Andy additionally passed **13 actual-AP management UI checks** including a two-workbook batch, seven charts, custom-library membership, tags, bulk add, reload and mobile layout.

| New workflow | Verified result |
| --- | --- |
| Existing data and backups | Older v1 IndexedDB records and v1 backups gain default reference/import libraries and empty tags while measurements, source classification, project data and old report snapshots remain unchanged. |
| Libraries and tags | User libraries persist with unique safe IDs and case-insensitively unique names. Chart membership is independent of source classification. Tags trim/deduplicate, support add/remove/replace, and enforce the 30-unique-tag boundary. Re-adding an existing tag at that boundary succeeds; a 31st distinct tag is rejected atomically. |
| Batch preview and failures | A five-file batch includes valid CSV/AP sources and malformed XLSX. Preview creates no sources, charts or activity. Save continues past per-file failures and reports each result independently. |
| Retry safety | Simulated failure before commit and a lost acknowledgment after commit are both retried. Missing work is saved; previous successes and already committed files are not duplicated. Reused operation IDs with conflicting content/options are rejected. |
| Scoped bulk changes | A 123-record collection renders only 50 records per page. Selecting two pages explicitly updates exactly 100 records; the remaining 23 remain unchanged. Filter changes clear prior selection. Another-tab move outside the active filter removes hidden selections while intentional cross-page selection remains valid. |
| Persistence and evidence | Tags/libraries survive reload and complete browser restart. Concurrent tab tag additions both survive. AP values, units, source bytes/hashes, provenance and older report organization snapshots remain unchanged. |
| Capacity | Save-time chart and library limits reject new records atomically, while existing records remain editable. Export/restore limits remain compatible with previously valid v1 backups. |

Two review findings were fixed and covered: effective tag-count validation now deduplicates merged tags before applying the limit; selection now intersects all currently filtered records so metadata polling cannot leave invisible records selected.

Evidence: `docs/browser-organization-api-qa.json`, `docs/browser-organization-edge-ui-qa.json`, and `docs/browser-management-ui-qa.json`. Reusable helpers: `tests/portable-organization-api-qa.mjs` and `tests/portable-organization-ui-qa.mjs`. Visual evidence: `docs/management-batch-import.png`, `docs/management-library-tags.png`, `docs/management-mobile.png`, and `docs/management-mobile-import.png`.

## Mouse X/Y zoom

Jams passed **30 targeted offline browser checks** on the current build, with zero JavaScript errors and no HTTP/HTTPS requests. Independent expectations use actual delivered pointer coordinates, logarithmic X and linear Y transforms.

| View interaction | Verified result |
| --- | --- |
| Wheel | Both-axis zoom produces the expected cursor-anchored X/Y bounds. Opposite motion reverses the extent. X-only freezes the visible Y extent, including initially automatic Y; Y-only preserves exact X bounds. |
| Rectangle | Forward/reverse drags select the expected log-X/linear-Y bounds. Axis-specific drags preserve the other axis. Escape, pointer cancellation and sub-six-pixel drags leave the view unchanged. |
| Reset and controls | Reset view and double-click restore full X/Auto Y. Manual Y supports negative/cross-zero limits. Auto Y keeps X, fixed Y survives viewport resize, and switching measurements resets the prior view. |
| Data integrity | Tiny Vrms ranges and zero/null fixtures remain finite and correctly anchored. Every stored source array, the complete persisted workspace and an earlier report snapshot remain unchanged through interactions and reload. |

Andy independently passed **13 mouse-view UI checks**, including overlay visibility, original keyboard sample inspection and mobile layout, with no browser errors or network requests. Evidence: `docs/browser-zoom-qa.json`, `docs/browser-zoom-ui-qa.json`, and `docs/zoom-mouse-controls.png`. Reusable helper: `tests/portable-zoom-qa.mjs`.

## Earlier server implementation: automated acceptance

The checks below document the earlier server version. They are retained as regression evidence and **do not substitute for the portable file-mode checks above**.

**31 of 31 HTTP integration tests passed, with no skips.** Latest recorded run on 22 October: `python3 -m unittest discover -s tests -v`, 1.996 seconds. All previous 25 acceptance tests remain passing. Tests launched a real loopback HTTP server with a temporary SQLite data store and stopped/restarted it to verify persistence. Local socket execution required the environment's sandbox escalation; it did not require cloud access. The user's working project database was not used as a fixture. Supplied AP workbooks were read without modification and imported only into disposable test storage.

| Test area | Verified result |
| --- | --- |
| Reference fidelity | Extracted JSON exactly matches the original report's embedded measurement JSON. Every one of 33 API charts matches all original fields and series: 97 series, 14,971 points, 174 null Y values. |
| Original files | Reference HTML and imported CSV/XLSX files download byte for byte. Attachment response headers preserve Unicode names through UTF-8 `filename*` with an ASCII fallback. |
| CSV | Commas, embedded quotes and newlines in series names survive export; nulls remain blank and numeric precision is preserved. |
| Excel XLSX | Real OOXML ZIP fixtures with inline/shared string headers, two measurement series and sparse blank cells import exactly. Malformed archives, absent frequency headers, uncached formulas and excessive ZIP expansion fail without state changes. |
| Measurement units | Selected CSV/XLSX units survive reports and process restart. Empty/overlong units fail atomically. JSON keeps its chart-specific units. |
| Progress | Create/edit, free-text real employee owners, weighted completion, valid status/percent rules and full process restart persistence pass. Invalid fields, empty/oversized owners, invalid dates and inconsistent percentages are rejected atomically. |
| Invalid imports | Malformed JSON/base64, nonnumeric and extra-width CSV, missing frequencies, infinity/NaN, boolean frequencies, string values, empty charts and mixed valid/invalid multi-chart imports do not change persisted state. |
| Local request boundary | Unknown IDs, traversal paths, untrusted Origin and Host requests cannot retrieve arbitrary local files or change task state. |
| Report snapshots | Full stored chart values and source metadata match the selected source; selected series are exact. HTML escapes hostile title/notes. Later task changes leave both JSON and HTML snapshots unchanged. A selected series containing only missing values now renders safely. |
| Isolated-point rendering | Report SVG circles appear at the exact coordinates of two valid XLSX samples separated by a missing measurement; no line bridges the gap. |
| Chart details | Title/date/item/notes can be edited within their limits. Strict calendar dates, types, required titles and the PATCH whitelist are enforced. Rejected edits/import details leave full API state and chart records unchanged. |
| Unknown test dates | Reference and unspecified import dates remain empty. A simulated legacy database lacking the new fields returns explicit unknown defaults; no upload date is substituted. |
| Detail imports and persistence | Common single/multi-chart import details, combined chart titles and chart-specific JSON details persist. Edited metadata survives a process restart. |
| Metadata traceability | Renaming preserves original source records, bytes, hashes and sample arrays. New reports include edited details safely; old JSON/HTML report snapshots remain unchanged. |
| AP-native import | Both supplied workbooks match every original numeric pair, channel, full measurement title, source unit and worksheet row mapping. Raw and AP-provided smoothed results remain distinct. Actual test dates remain unknown unless supplied explicitly. |
| AP preview and validation | AP and generic previews leave complete database state/activity unchanged. Synthetic zero/null fixtures, malformed headers, unknown sheets, extra columns and uncached formulas are covered. Generic form units cannot overwrite native AP units. Summary N/A values are retained with a skip reason rather than treated as passes. |
| AP report display | Visible report content includes source units, full measurement names, worksheet/channel/processing/cell mappings and Summary N/A entries. Tiny Vrms changes use the measured axis extent and remain visible without altering source numbers. |

Original reference SHA-256:

`63910063bff0063b8faf3a5abe8e921d217611a57f7839d528761e73bf81ba4a`

## Defects found and repaired

1. Selecting a series with only null values created a report whose download failed. Lucas changed report bounds to handle an empty measured-value range. The regression test now passes.
2. Frontend chart bounds used argument spreading, which can exceed JavaScript's argument limit for supported large imports. Lucas replaced this with iterative reduction. The fix was independently reviewed in source; a rendered large-file browser exercise is separate evidence.
3. Isolated valid points separated by null gaps were present in the data but invisible as one-point lines. Lucas added visible markers in both canvas charts and report SVG. The report marker coordinates and gap preservation are covered by an automated regression.
4. A forced minimum one-unit report axis flattened tiny Vrms changes. Lucas changed the axis extent to follow the measured range; an automated regression confirms a visible curve extent while the original values remain exact.

The frontend review also confirmed HTML escaping of imported/user text, null values starting a new line segment, bounded upload handling, explicit unvalidated-import/reference labels, English forms and errors, and automatic state polling every four seconds. Code review does not substitute for browser verification.

## Actual AP source verification

Jams independently opened both supplied workbooks read-only with bundled Python/openpyxl, then compared every imported sample against an independent standard-library XML reader in the acceptance suite. Original bytes and modification times remained unchanged. No original workbook was copied into the repository or sent to an external service. The runtime importer remains dependency-free.

| Workbook | Measurement sheets and points | Zero Y values |
| --- | --- | --- |
| AP01: `5G-01-AP--1m-消声室数据.xlsx` | RMS Level: 1,734; RMS Level -> Smooth: 500; THD Ratio: 1,300 | THD: 109 |
| AP02: `5G-02-AP-1m消声室数据.xlsx` | RMS Level: 1,661; RMS Level -> Smooth: 500; THD Ratio: 1,346; Distortion Product Ratio (H2:H5): 1,520 | THD: 152; H2:H5: 57 |

These original sheets contain no missing Y values; synthetic fixtures separately verify null preservation. AP01 RMS/smoothed and AP02 RMS source units are `dBSPL1`, displayed as `dB SPL` without changing numbers. AP02 smoothed output is **Vrms**, and distortion outputs are **%**. The full H2:H5 measurement title is retained separately from its truncated worksheet name. Both Summary sheets contain N/A limit results; these are not pass decisions.

Original hashes verified during preview, import, download and final source re-read:

- AP01: `7128ce48cf79f040824bf8e5d07e5206d72944044aca2ddcaa94d42b39fab5fb`
- AP02: `e0c80dbc05f2728b1cab7cf91fbc591964f75773ead9a010cc76894ee5d2f216`

The two real-source tests skip explicitly on a redistributed installation where the original Downloads files are unavailable. They ran and passed in the recorded 31-test run.

## Browser verification

For initial acceptance on 20 October, Andy ran installed Google Chrome through bundled Playwright against a fresh separate loopback test server on port 7576. All **15 recorded browser checks passed** after the final fixes; no browser JavaScript errors were recorded. These checks used isolated test records rather than the user's project schedule. The main user database on port 7574 was untouched by QA.

The checks covered the English overview and summary cards, keyboard sample inspection, XLSX import through the actual file form, preservation of missing points, byte-exact XLSX source download, report preview with safe notes, task updates refreshing across two tabs, real owner text, completion rules, persistence after browser reload, and mobile overview/data/report/progress pages without page overflow. Evidence is stored in `docs/browser-qa.json`.

Screenshots: `docs/app-overview.png`, `docs/app-test-data.png`, `docs/app-report.png`, `docs/app-progress.png`, and `docs/app-mobile.png`.

The final visual review confirmed that isolated points and matching legend swatches are visible in the report, and the mobile hero stacks cleanly and remains readable.

Andy also imported, rendered and keyboard-inspected a **150,000-point chart with 125 null gaps** in the actual browser, with zero JavaScript errors. Evidence is stored in `docs/browser-large-data-qa.json`.

The 22 October data-management update passed **18 recorded browser checks** in installed Chrome through Playwright against a separate temporary database on port 7577. Checks covered metadata import and editing, combined date/item filters, empty results without a stale chart, unknown dates, searchable notes, date/item grouping, inclusive date boundaries, title sorting, reload persistence, exact original downloads, safe text display, responsive layout, and metadata polling without resetting the chart frequency range. No JavaScript errors were recorded. A fresh mobile browser context confirmed a single readable page after a resize-only screenshot compositor artifact. The artifact did not reproduce after a fresh context; the retained screenshot shows the final layout.

Evidence: `docs/browser-metadata-qa.json`, `docs/data-management-desktop.png`, `docs/data-management-mobile.png`, and `docs/data-management-mobile-viewport.png`. The working user database was not used for browser fixtures.

The AP preview/upload flow passed **23 recorded browser checks** in installed Chrome through bundled Playwright against isolated port 7579. Both real workbooks were previewed without saving, then explicitly saved with expected chart counts and byte-exact source downloads. Checks confirmed Summary skip explanations, AP02 smoothed Vrms, original-filename search, visible provenance/processing, generated report source details, and invalidation of Save when metadata or the selected file changes. No browser JavaScript errors were recorded. The final rerun also verified hidden generic-unit overrides for AP, collapsed alternate-format help, mobile preview layout and the six-panel Chinese guide. Visual inspection confirmed AP02 Vrms reports use their actual voltage span.

Evidence: `docs/browser-ap-import-qa.json`, `docs/ap-import-preview-01.png`, `docs/ap-import-preview-02.png`, `docs/ap-native-data.png`, and `docs/ap-native-report.png`. The working user database was not used for these browser fixtures.

Jams independently verified the direct Excel entry and new measurement table with **23 passing Chrome checks**, with zero JavaScript errors. A separate temporary server used synthetic datasets only. Coverage includes Overview Upload Excel opening the real modal on Test Data, 50/100-row pages and a 51-row final page, disabled Next at the end, series/chart resets, unchanged current page after metadata polling, full original numeric precision, explicit zero versus Missing, exact AP source rows including missing values, legacy reference worksheet/cell mappings, unknown mappings remaining empty, empty-filter hiding, and a 150,000-point chart producing only one bounded table page.

Evidence: `docs/browser-point-table-qa.json`; rerunnable helper: `tests/table-browser-qa.mjs`. Independent source review confirmed the renderer slices the selected page before building DOM, uses `String(originalNumber)` instead of rounded hover formatting, escapes values/cell labels, and resets chart selection safely. The backend was unchanged by this UI update, so the prior 31-test HTTP result remains the applicable API evidence.

Andy additionally passed **15 actual upload/display browser checks** on a fresh isolated server at port 7581 with zero JavaScript errors. The real AP02 workbook was uploaded from Overview through AP Preview and Save, then displayed as a curve and full-precision table with exact A5/B5 source mapping. Checks also covered 100-row pagination, synthetic missing/zero/long-decimal values, two-series switching, last-page behavior, live polling, empty filters and mobile layout. Andy visually reviewed `docs/excel-upload-entry.png` and `docs/excel-measurement-table.png`. Full evidence: `docs/browser-upload-display-qa.json`. The working user database was untouched by these checks.

## Limits

No open defect remains in the completed acceptance suites. This verifies local software operation, not production multiuser security, device acquisition, acoustic performance, or regulatory compliance. The supplied Alpair 5G measurements are reference data and do not establish CRY7574 performance. The separately supplied AP01/AP02 workbooks are verified sources; they are not claimed to reconstruct every chart or underlying workbook in the reference report. Initial seeded tasks are a proposed plan with zero completion; test success does not represent the user's actual chamber project progress.

XLSX support includes the verified AP-native layout and the generic frequency/named-series layout. Legacy XLS, other arbitrary workbook layouts, instrument connectors and formula recalculation are outside this release; recalculate and save cached results in Excel before import. Additional AP variants require a real source sample and mapping review.

Final AP display review: the native preview appears before collapsed alternate-format help, detected AP units hide the generic override, and the corrected Vrms canvas ticks and report scale were visually inspected. Mobile preview and the Chinese guide passed responsive checks. Evidence is the final 23-check `docs/browser-ap-import-qa.json` and `docs/ap-import-mobile.png`.
