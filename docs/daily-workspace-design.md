# Daily measurement workspace

Official name: CRY7574 Hearing Aid Box Measurement Manage Software.

## Product purpose

Manage measurement records produced on different days. The primary actions are import, search, tag, annotate, edit metadata, delete, and choose records for plotting. The default screen is the Data table across all libraries. Library remains a broad classification and an optional browsing filter. Reports and project progress remain secondary tools.

## Application boundaries

The rebuilt frontend has a workspace controller and a separate plot module. The bundle uses the existing portable backend API and IndexedDB name so that existing source files, measurements, libraries, tags, hidden flags, tasks, frozen reports and backups remain usable. The previous layered presentation modules are not part of the new application bundle.

The persisted source archive is separate from record metadata. The graph viewport and hover cursor are temporary view state. Editing labels or ranges does not change the original samples. Existing report snapshots retain their captured metadata and samples.

| Entity | Responsibility |
| --- | --- |
| Original source | Exact uploaded bytes, filename, SHA-256, format and import timestamp. |
| Measurement record | One measured result with its series, source relationship, source-unit/provenance information and editable metadata. An Excel file may create several records. |
| Metadata | Title, actual test date, test item, tags, notes/annotations, Library membership and hidden state. |
| Library | User-created highest-level classification; import destination and optional Data filter. |
| Plot selection | Explicitly selected records and enabled traces. Compatible units are required for a shared Y axis. No implicit conversion or resampling. |
| Plot viewport | Logarithmic frequency limits, linear Y limits, cursor and zoom state; no mutation of stored measurements. |
| Report | Existing or newly created frozen single-record evidence. A comparison display is not a newly measured record. |

## Daily workflow

1. Import one or more native AP XLSX, normalized XLSX, CSV or JSON files.
2. Choose a destination Library and optional common tags, actual test date, item and notes.
3. Preview every file, then explicitly save valid files. Review per-file outcomes; retries skip successful files in the current batch.
4. Browse the Data table. Default sorting shows recently imported sources first. Import time and actual test date remain different; unknown test dates are not inferred.
5. Search and combine Library, tag, test-item and actual-date filters.
6. Edit one record's metadata, or bulk organize selected records. Normal browsing excludes hidden records; an explicit hidden/all filter makes them available.
7. View one record or plot a compatible set of selected records. Preserve the Data selection and filters when returning from Plot.

## Cursor and chart contract

Use Audio Precision's graph/trace/legend interaction as a reference, while retaining the smaller requested feature set. References: [APx500 user manual, graph cursors](https://www.ap.com/fileadmin-ap/technical-library/APx500_Users_Manual_4.3.0.pdf?force=) and [plotting multiple measurement datasets](https://www.audioprecision.com/blog/how-to-plot-multiple-measurement-data-sets-on-one-graph).

- Mouse X/Y coordinates describe the cursor position in the current plot's axes.
- Sample X/Y coordinates describe each enabled trace's nearest original point, including that point's actual X when grids differ.
- Do not interpolate null gaps or replace a missing sample with zero. Draw true zero as zero and identify missing samples explicitly.
- Show a visible cursor crosshair and markers on valid in-view original samples. Clear stale cursor state outside the plotting rectangle or when chart context changes.
- Keep numeric X/Y range controls, both-axis or one-axis wheel zoom around the pointer, rectangle zoom and reset. Frequency coordinates are logarithmic; Y is linear, including negative and very small values.
- Legend controls choose visible traces without changing stored records. Bound comparison size and reject mixed units with an actionable message.

## Delete and persistence

The exact case-sensitive password `CRYSOUND`, explicit confirmation and a reviewed scope are required for record or Library deletion. Deleting a Library includes its hidden records. Reject stale scopes. Preserve frozen reports and any source file still needed by a record or report; prune unreferenced originals. Hiding is reversible and does not remove stored data. No development or verification step may delete user workspace records.

This remains a local standalone HTML application. IndexedDB, storage limits and backup format are retained; rebuilding the frontend does not add a cloud database or cross-browser synchronization. Export/Restore backup transfers the complete local workspace.
