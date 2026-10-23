# CRY7574 Hearing Aid Box Measurement Manage Software

The primary program is a **single offline HTML file** with an English interface. Download [the standalone HTML](<dist/CRY7574 Hearing Aid Box Measurement Manage Software.html>) and open the downloaded file directly in a current Chrome or Edge browser. No Python, server, installation, account or network connection is required.

## Build and data privacy

The GitHub distribution starts with an empty workspace and one Measurements Library. It contains no bundled measurement files, photos, videos, thresholds or project-progress claims. A private reference-seeded HTML may exist at the repository root on the original developer's computer; that file and `portable/seed.json` are excluded from Git. Opening a new build preserves any existing workspace in the same browser; an empty bundle does not clear browser data.

Rebuild the shareable program with Python's standard library:

```sh
python3 portable/build_portable.py --empty --output "dist/CRY7574 Hearing Aid Box Measurement Manage Software.html"
```

Normal `python3 portable/build_portable.py` uses a local private seed when one exists, otherwise an empty workspace. It writes the root HTML and does not upload anything. Imported workbooks, database files, complete backups and local verification screenshots are excluded from version control. Transfer actual data separately with the application's complete backup/restore feature.

The pre-existing root `index.html`, `box-220mm*.html` and earlier `dist/index.html` belong to the earlier report site. They are retained unchanged; the current application is the separately named standalone HTML above. Pushing this branch does not replace the earlier site's entry page.

## Open the current program

Double-click the HTML file. **Data workspace** lists saved records across Libraries. Use **Import files** to preview and explicitly save native Audio Precision XLSX, normalized XLSX/CSV or JSON files into a chosen Library. Filter by Library, tags, dates or units; select records and use **Plot selected** for compatible-unit comparisons. **Select matching (N)** includes all filtered pages, while the header checkbox selects the current page.

The header's **Decimal places** setting controls display only, with Auto or 0–9 places. The four X/Y range fields follow this setting while resting, and expose their exact value on focus. Original values and mathematical axis bounds remain full precision; Apply on an unchanged field uses the retained exact value. **Export selected** produces importable normalized JSON or analysis CSV; **Export plot PNG** saves the comparison with its legend. Tags, annotations, hiding, guarded deletion, original source downloads, frozen reports and project progress remain available. These current workspace/decimal/export features belong to the standalone program; the older server interface below does not provide the same feature set.

In Plot view, each entry in **Displayed traces** has **Color**, **Line style** and **Width** controls. Changes save automatically for that record and series, including when the same series names appear in different records. Plotting those records again restores their saved appearance. Use the visible save status to confirm success; failed saves can be retried. Color, solid/dashed/dotted/dash-dot lines and width affect the graph and its exported PNG. New reports capture their saved styles; old reports keep their original appearance.

The Plot grid uses AP-inspired major and auxiliary ticks: logarithmic frequency decades and intermediate marks on X, aligned readable values and minor subdivisions on linear Y. Density and labels adapt to zoom and available space. The current grid is included in PNG export. This changes display only; manual axis bounds, measurement samples, saved curve styles and existing reports retain their meaning.

Use **Save comparison** in Plot view to name and keep a linked overlay. **Saved comparisons** provides search, open, edit and guarded deletion. Edit its title, actual test date, tags, notes and ordered member selection; **Add / remove records** changes the current plot, and **Save comparison changes** keeps that selection in the active saved comparison. **Save as new** makes another comparison. The unit stays fixed for an existing comparison, with the same 12-record / 32-series bounds as plotting. Complete backups retain comparisons. Missing deleted records and included hidden records are identified explicitly when reopening.

Expand **Records in this plot** for **View data**, **Edit details**, **Remove from plot** and **Delete record**. Remove preserves the original record. Delete record uses the existing source-record review and CRYSOUND guard. Deleting a saved comparison requires confirmation and CRYSOUND and preserves all original records, source files and reports. Saved comparisons use current original records rather than a duplicate measurement snapshot; source edits therefore appear in every comparison containing that record.

Data is saved in **this browser's IndexedDB**, not rewritten into the HTML file or synchronized with the server's SQLite database. Moving the HTML does not transfer later imports. Use **More tools → Backup & sources → Export backup / Restore backup** to transfer or protect the complete browser workspace. Existing browser records are preserved when the HTML is rebuilt; a bundled seed initializes browser storage only when it is empty. The GitHub distribution has an empty seed.

See [the standalone guide](portable/README.md) for supported import layouts, display precision, selection/export limits, backup compatibility and implementation details.

## Legacy alternate: Python server

The remaining sections describe the earlier local-server interface and its SQLite storage/API. They are retained for maintenance and existing server users; use the HTML program above for the current daily workspace. **Only this alternate requires Python 3.9+.** It has no third-party runtime packages or external CDNs.

The legacy server requires the private reference source files under `reference/`; these are intentionally excluded from GitHub. Use the standalone HTML for a self-contained public distribution.

### Start the legacy server

On macOS, double-click `start.command`, or run:

```sh
cd /Users/peter/Documents/软件/CRY7574
python3 server.py
```

Open http://127.0.0.1:7574. Keep the terminal running; Ctrl+C stops the server. `start.command` also opens the browser. For another port or an isolated database:

```sh
python3 server.py --port 7575 --data-dir /tmp/cry7574-review
```

The server binds only to `127.0.0.1`. Do not expose it through a proxy, tunnel or public interface. This prototype has no authentication and is intended for trusted users on this computer. It checks request Host and Origin headers, but it is not a multi-user production service. All browser clients share one local database and project plan. Task edits use last-write-wins; the activity log records each saved change.

### What is real

- `reference/Alpair5G_Anechoic_Test_Report_English.html` is the supplied source report; its original bytes are retained for download. Its SHA-256 is visible in the source archive.
- The reference library contains 33 charts in 10 measurement groups, plus general characterization charts. It is always labeled **Reference data — Alpair 5G, not CRY7574 validation**.
- Imported XLSX/CSV/JSON files are retained byte-for-byte with SHA-256. They are unvalidated uploads, not verified CRY7574 test runs.
- No approved CRY7574 acceptance limits are configured. The system does not invent pass/fail results.
- Initial tasks are a proposed software plan starting at 0%. Replace or extend these with the actual chamber project schedule, owners and evidence. Weighted progress reflects only saved task values.
- The roles Andy, Lucas and Jams identify responsibilities; displaying those names does not create autonomous background workers or external messages.

### Manual Excel and CSV import

Choose **Upload Excel** on the Overview or Test Data page. Select a file, enter any known test date/title/notes, then click **Preview measurements**. Preview validates and lists every recognized chart, source unit, display unit, point count, processing label and excluded Summary worksheet without writing to the database. Click **Save import** only after review. Changing the selected file or any import metadata invalidates the preview and requires another preview. API clients may continue calling the existing direct import endpoint.

Upload at most 20 MB. Legacy `.xls` is unsupported: use Excel **Save As → .xlsx** or CSV.

#### Audio Precision native XLSX

The original AP workbooks can be uploaded directly without rearranging cells. Recognized measurement layout is: row 1 full measurement title, row 2 channel (for example `Ch1`), row 3 `X` / `Y`, row 4 `Hz` / source unit, and numeric data from `A5:B…`. One X/Y channel pair in columns A:B is currently supported. Additional nonempty AP columns are explicitly rejected; they are never silently dropped. Unknown nonempty worksheet layouts reject the entire workbook. Normalized Frequency-header worksheets can coexist with recognized AP sheets.

Each measurement sheet becomes a chart. The original source filename is shown on every chart-list entry and included in content search, so AP01 and AP02 records with identical measurement titles remain distinguishable. Full AP title (including `Distortion Product Ratio (H2:H5)`, even if Excel truncates its worksheet name), worksheet, channel, axis/header rows, original source unit, processing status and original row number for every point are stored as immutable provenance. The source workbook remains downloadable byte-for-byte, with its SHA-256 hash.

Values are neither smoothed nor resampled nor converted by this software. Existing AP `RMS Level -> Smooth` sheets are separately labeled **AP-provided smoothed**; raw RMS sheets remain separate. `dBSPL1` is displayed as `dB SPL` while retaining `sourceUnit: "dBSPL1"` and the unchanged numeric values. `%` remains `%`. Crucially, the supplied AP02 smoothed sheet uses **Vrms**, so it remains Vrms. The generic unit field cannot override AP source units. AP automatic test items are Frequency Response, Smoothed RMS Level, THD and Distortion Product Ratio (H2:H5). A nonempty user test-item override applies to all charts; a blank field retains automatic AP categories. Test dates remain unknown unless supplied explicitly.

A worksheet named exactly `Summary` is excluded from charts only when the workbook contains recognized AP measurements and its repeating title / Channel / Passed Lower Limit / Passed Upper Limit blocks match the supported layout. Its original cells and lower/upper entries (including `N/A`) are saved as source metadata and shown in AP report provenance. They are not treated as formal limits, pass or fail results. All other nonempty sheets must parse as supported measurement data.

Both actual supplied workbooks were inspected read-only, with expected measurement counts: AP01 1,734 raw RMS + 500 smoothed RMS + 1,300 THD; AP02 1,661 raw RMS + 500 smoothed Vrms + 1,346 THD + 1,520 distortion-product ratio. Neither source file was copied into the application’s tracked reference library or persisted into the main database by the parser preview.

#### Normalized Excel / CSV


For normalized Excel `.xlsx`, every nonempty measurement worksheet must contain a header row followed by measurement rows. Each worksheet becomes one chart named after that worksheet. The first nonempty row is the header. The first column must be named `Frequency`, `Frequency (Hz)` or `Frequency_Hz` (case-insensitive). Remaining columns have unique, nonempty series names. All values use one chart unit. Enter the unit in the import form (for example `dB SPL`, `dB`, `%`); it applies to every normalized worksheet in that import, while AP sheets retain their own source units. The default `Value` means unspecified because units cannot be inferred from an arbitrary workbook. Separate imports when worksheets use different units. JSON uses its own per-chart units. Do not mix SPL and THD in the same worksheet.

CSV uses the same columns, is UTF-8 (BOM allowed), and creates one chart named after the file:

```csv
Frequency,Run 1,Run 2
100,62.5,62.7
200,,63.0
400,65.2,65.1
```

Frequencies must be positive, finite and ascending in each series. Blank Y cells are preserved as `null` gaps. Fully blank rows are skipped. A row with values but no frequency is rejected. Do not insert titles, merged header cells or notes above the header. Excel shared strings and inline strings are supported. Formula cells require saved numeric cached results: recalculate and save in Excel before importing. Uncomputed formulas, Excel errors and boolean cells are rejected. The importer does not evaluate formulas, run macros or extract ZIP files to disk. It caps XLSX at 1,000 archive entries, 20 MB per uncompressed entry and 40 MB total uncompressed data.

Advanced JSON accepts a chart object or `{ "charts": [...] }`:

```json
{
  "charts": [{
    "title": "Isolation measurement",
    "unit": "dB SPL",
    "series": [{ "name": "Run 1", "values": [[100, 62.5], [200, null], [400, 65.2]] }]
  }]
}
```

There are at most 100 charts per JSON/workbook import, 32 series per chart and 200,000 points per series. Imports validate completely before the SQLite transaction; a rejected import creates no partial source record.


### Test dates, test items and editable details

Each chart/worksheet is a measurement record with editable display `title`, actual `testDate`, free-text `testItem` and measurement `notes`. Use **Test Data → Edit details** to change them. Titles are 1–200 characters, test items up to 100 and notes up to 5,000. The date is blank when unknown, otherwise a valid `YYYY-MM-DD` calendar date. Upload timestamps are never used as test dates. Existing databases receive blank metadata defaults at read time; source bytes, points, tasks, reports and classifications are preserved. Reference records may have their display details edited, while their Alpair reference classification remains fixed.

The import form accepts common details for Excel, CSV and JSON. A nonblank common field overrides the matching per-chart JSON metadata. Blank optional UI inputs keep JSON chart-specific values, or stay unknown when the source provides none. API callers can explicitly provide `""` for date, item or notes to clear them. A supplied title renames a single chart; for multi-chart imports it becomes `Title prefix · Original worksheet/chart title`. Every resulting title must fit 200 characters. Original filenames and uploaded bytes never change.

Filter the library by actual test-date range, Known/Unknown dates, saved test items, source library and reference measurement group, and search titles, original source filenames, chart IDs, test items and notes. Filters combine. Unknown dates never match a dated range. Clear filters to restore the full library. Empty results clear the plot and actions rather than showing an unmatched record. Choose **Group by → Test date / Test item** for visible classification headings (including Unknown date / Uncategorized), or None. Dates sort newest first with unknown dates last; titles and item groups sort alphabetically. The test-item list is generated from saved records, with suggestions for Frequency Response, THD, Isolation and Other.

Changes persist in SQLite and refresh in other local tabs every four seconds. Polling updates the selected record’s details without resetting series visibility or frequency range. Activity and last-updated information include metadata edits. Reports capture a frozen copy of date, item, title and measurement notes; later edits do not change existing report snapshots.

### Curves, sources and reports

- Filter by reference/imported data, measurement group, title or chart ID.
- Below the curve, **Original series values** displays stored numeric values without display rounding. Select any series and view 50 or 100 points per page; pagination limits DOM rows, even for large files. Numeric `0` is shown as `0`, while null values are labeled `Missing`. Recorded AP source rows and reference-series cell mappings appear beside their values; generic formats without mappings show `—`. Changing charts/series or page size resets the table page, while metadata polling preserves the selected table series and page.
- Toggle series; select a positive frequency range. The horizontal axis is logarithmic. Hover to inspect original samples, or focus the chart and use arrow keys.
- Export CSV contains every original series point, including blank values, plus source ID, SHA-256 and classification. It is a normalized point export, distinct from the byte-exact original file download. Text cells with spreadsheet formula prefixes are prefixed with an apostrophe in this normalized export; numeric measurement values are unchanged.
- Build a report from selected chart series and notes. A report stores its own frozen full-precision chart/source snapshot. Preview/print to PDF through the browser, or download the self-contained HTML report. Expand its original measurement snapshot to inspect all points.
- Original uploaded files are served only as attachments. Uploaded HTML, macros and formulas are never executed by the application.

### Project progress

Add or edit task title, real owner name, status, percent, weight, due date and evidence/notes. Owner suggestions include Andy, Lucas and Jams; actual employee names are allowed. Tasks persist in SQLite. Other open browser tabs refresh every 4 seconds. Progress is `Σ(percent × weight) / Σ(weight)`. Weights must be positive; percent is 0–100; Planned requires 0%; Complete requires 100%. Dates are optional valid calendar dates. Record evidence before advancing tasks. Blocked tasks retain their recorded percent.

### Data, backup and deployment boundary

Runtime data is `data/workspace.sqlite3` (sources as BLOBs, measurement charts, tasks, reports and activity). Stop the server before copying this file for backup; restore it while the server is stopped. The supplied reference files are seeded on first use and are otherwise kept separate from runtime uploads. Deleting a database discards its imports, reports, tasks and activity; no delete UI is provided.

This is a working local prototype, not a hardware acquisition driver, calibrated analysis package, cloud service, authentication system or certification engine. It has no automatic chamber integration, formal threshold engine, user roles, conflict resolution or tamper-proof audit trail. Verify original measurement provenance before drawing engineering conclusions.

### API

All writes require JSON Content-Type. Errors return `{ "error": "message" }`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/state` | Summary, tasks, chart metadata, sources, reports, activity, groups |
| GET | `/api/charts/:id` | Full original point arrays and editable record metadata |
| PATCH | `/api/charts/:id` | Only `{title?, testDate?, testItem?, notes?}`; at least one field |
| GET | `/api/charts/:id/export.csv` | Normalized point CSV including gaps and traceability |
| POST | `/api/import/preview` | Same source payload; read-only parse returning formatDetected, charts metadata, skippedSheets, warnings, sha256 and size |
| POST | `/api/import` | `{name, format: "xlsx"/"csv"/"json", contentBase64, unit?: "dB SPL", title?, testDate?, testItem?, notes?}` |
| GET | `/api/sources/:id/download` | Exact source bytes as attachment |
| POST | `/api/tasks` | `{title, owner, status, percent, weight, dueDate, notes}` |
| PATCH | `/api/tasks/:id` | Partial task update |
| POST | `/api/reports` | `{chartId, title, notes, series?: [seriesName]}` |
| GET | `/api/reports/:id` | Full frozen report snapshot JSON |
| GET | `/api/reports/:id/preview` | Printable static HTML |
| GET | `/api/reports/:id/download` | Printable static HTML attachment |

Task statuses are `Planned`, `In progress`, `Blocked`, `Complete`. Timestamps are stored in UTC and shown in the viewer's browser timezone.

### Verification

Run the independent tests in `tests/` using the instructions in `docs/test-report.md`. They use temporary databases, not your working project data.
