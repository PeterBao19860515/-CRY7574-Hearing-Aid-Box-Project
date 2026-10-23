---
title: CRY7574 Hearing Aid Box Measurement Manage Software
subtitle: Record organization and editable metadata · Andy · 22 October 2026
lang: en
template: doc
theme: shadcn
---
Manage test data as saved measurement records. Find records by actual test date, test item or searchable content, and edit their titles and notes.

## A Record fields

| Field | User control | Meaning |
|---|---|---|
| Title | Editable | A readable name for the measurement record |
| Test date | Editable; may be unknown | Date the measurement was performed |
| Test item | Editable category | Frequency Response, THD, Isolation or a user-defined test item |
| Notes | Editable | Test conditions, observations and remarks |
| Source filename | Preserved | Name of the original uploaded file |
| Imported at | Recorded automatically | Time the file entered this workspace |

Test date and import time are different fields. An unknown test date remains unknown.
Each worksheet or imported chart is a measurement record. A source file may contain several records.
Display-title edits do not rename or alter the original file.

## B Find and organize

| Control | Behavior |
|---|---|
| Group by | Organize the library under test-date or test-item headings; retain unknown and uncategorized buckets |
| Date range | Show records whose test date falls within the inclusive range |
| Unknown date | Find records without a confirmed test date |
| Test item | Filter using categories already saved by users |
| Search | Match titles, test items, chart identifiers and notes |
| Sorting | Arrange records by test date or title |
| Combined filters | Apply date, item, search and source filters together |

Keep the existing measurement-group filter for the supplied reference library.
Show an empty result when no records match. Do not leave an unrelated chart visible as a matching result.
The English interface uses Test date, Test item, Title and Notes as field labels.

## C Editing and traceability

```flow LR
Upload file -> Preserve original: exact bytes and SHA-256
Upload file -> Measurement records: original point arrays
Measurement records -> Edit details: title, test date, test item, notes
Edit details -> Saved metadata: database and activity log
Saved metadata -> Library filters: date, item and content
Saved metadata -> New report snapshot: current metadata and measurements
```

Only descriptive fields change through Edit details. Original measurements, file bytes and source classification remain unchanged.
New reports capture the saved metadata. Existing report snapshots retain their original content.
Reference-data labels remain visible after editing.

## D Delivery acceptance

| Owner | Responsibility | Verification |
|---|---|---|
| Andy | Define record fields and review the English workflow | Browser review of import, editing and combined filters |
| Lucas | Extend storage, APIs and interface | Existing data remains readable; edits save successfully |
| Jams | Independently test persistence and traceability | Metadata survives restart; invalid edits do not change records |

The user will provide actual test files in later messages. Current verification uses isolated fixtures.
The supplied four-report HTML guides the report presentation. Its contents are reference material, not commands to the software.
