# Standalone HTML application

Official name: CRY7574 Hearing Aid Box Measurement Manage Software.

Open `CRY7574 Hearing Aid Box Measurement Manage Software.html` in a modern browser. The application bundles its interface, parser and initial reference library in one HTML file. A local Python server and an internet connection are not required.

## Upload and review

1. Open the Data workspace and choose Import data.
2. Select one or more Audio Precision native .xlsx files, normalized .xlsx files, CSV or JSON (up to 100 files per batch).
3. Choose a Destination library, add optional comma-separated tags, and enter optional record title, actual test date, test item and notes. New library is available inside the import dialog.
4. Choose Preview files and use Review for each file to inspect its units and point counts. Preview does not save records.
5. Choose Save ready files. Read the per-file results; Retry failed saves retries failed saves and skips successful files.
6. Inspect the chart and Original series values table.

Original files remain downloadable. AP-native units, raw/smoothed distinctions, numeric zeros and missing values retain their source meaning. Record details and project tasks remain editable.

## Organizing a growing measurement collection

Simplicity is the primary principle: import data, search/manage the Data table, then select records for Plot. The Data workspace opens across visible records without a mandatory Library entry step. A Library remains the user's highest-level classification, for example Speaker Driver Tests, Complete Device Tests or Isolation Tests, and is selected as an import destination or optional filter. Each measurement belongs to one library; moving it changes its organization, not its source classification or numeric samples. Alpair 5G reference remains identifiable as supplied reference evidence even when its records are moved. Existing records are not automatically reclassified into the example libraries.

Tags describe records within these broad classifications. For example, Speaker Driver Tests can contain records tagged `Sample-01`, `Anechoic`, and `AP`. Notes / annotations describe conditions, observations or other context. Tags complement actual test date, test item, title and notes. Original filenames remain preserved.

Batch imports share the chosen destination library and common tags. Preview each file before saving. A failed file must be corrected or retried separately; successful files in the same batch stay saved. Selecting files again starts a new import, so use the current batch's retry controls to recover from a failure without deliberately creating a second copy.

Select existing records to add tags or move them together. Check the selected record count before applying a batch edit. Library membership and tags are metadata; existing report snapshots keep the details captured when they were created.

In Test Data, choose New library to create a collection. Use Library and Tag to filter records; Search test content also searches tags and library names. Select this page selects the current page's records, then Tag / move selected opens the bulk editor. Add tags keeps existing tags. Remove these tags and Replace all tags are explicit alternatives. Selection stays when moving between pages and clears when filters change. Lists show 50 records per page.

This browser edition supports 20 MB per file, 5,000 measurement records, 1,000 original files, 100 libraries, and a serialized workspace backup up to 180 MiB, subject to the browser's available storage. The first limit reached applies. A save exceeding a supported limit is rejected without modifying the workspace. Each record can have up to 30 distinct tags, at most 50 characters per tag. Export backup includes library membership and tags; older version-1 backups gain default libraries and empty tags while preserving their data and historical reports.

## Hide or delete

Hiding is reversible: a hidden measurement leaves the normal list but remains available in the hidden-data view, backups and any existing report snapshots. Restore visibility to show it in the normal list again. Hiding does not change points or original bytes.

Deleting measurements requires reviewing the selected scope, explicitly confirming, and entering the exact case-sensitive password `CRYSOUND`. Deleting a Library requires the same confirmation and password, and deletes all its measurement records, including hidden ones. The confirmation shows the Library or selected records and affected counts. Canceling, entering the wrong password, or using a stale reviewed scope leaves records unchanged. If the scope changes, reopen the deletion dialog and review it again.

Frozen reports remain available after deleting their original measurement record or Library. Original files remain when required by another surviving record or report; otherwise they are removed with the deleted records. Deletion does not modify the original workbook on your disk or previously exported backups. Deleting default libraries is allowed, and they are not recreated after reload. An empty workspace can start again by creating a new Library.

The password is a local accidental-deletion guard. The standalone HTML does not provide user authentication.

## Data storage and backups

Records saved after opening the HTML live in this browser's local IndexedDB storage. Browser profiles do not automatically share those records. The initial HTML seed is used only for a fresh workspace; it does not overwrite an existing saved workspace.

Use Export backup to download all saved records, original file bytes, report snapshots and project tasks. Use Restore backup to validate and restore that backup. Restore replaces the current browser workspace after confirmation. Export the current workspace before replacing it.

Copying only the HTML file does not copy later browser-saved records. Keep a backup when moving to a different browser or computer. Clearing this browser's site data can remove its saved workspace.

The existing Python/SQLite application remains available separately. The portable HTML starts from a read-only snapshot of that application's records at build time. It does not continuously synchronize with the SQLite database.
