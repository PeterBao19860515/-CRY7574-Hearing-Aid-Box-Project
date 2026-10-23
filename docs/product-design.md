---
title: CRY7574 Hearing Aid Box Measurement Manage Software
subtitle: Product design · v0.2 · Andy, Product Manager · updated 22 October 2026
lang: en
template: doc
theme: shadcn
cols: 2
---
Build one English workspace for acoustic test evidence and project progress. The first release runs locally with persistent storage.

## A Product scope and evidence

| Requirement | First release | Acceptance evidence |
|---|---|---|
| Review test data | Select charts, inspect samples and compare series | Imported values match the source |
| Organize records | Group and filter by test date or editable test item | Unknown dates remain unknown |
| Edit record details | Update title, notes, test date and test item | Edits persist; original measurements remain intact |
| Review reports | Archive the reference report and create report snapshots | Each report identifies its source |
| Download original data | Download original file bytes and export chart points separately | SHA-256 matches the uploaded file |
| Update project progress | Add and edit tasks, owners, dates, status and completion | Updates survive a server restart |
| Show current progress | Refresh project state across open tabs | Saved changes appear after the next poll |
| Use English software | English navigation, controls, reports and validation messages | Manual UI review |

The supplied HTML is an Alpair 5G loudspeaker report. It contains 33 charts and 10 test groups.
These measurements are reference evidence. They do not validate the CRY7574 hearing-aid test chamber.

## B Team and decisions

| Role | Owner | Responsibility |
|---|---|---|
| Product Manager | Andy | Discuss requirements with the user; write design; prioritize work; coordinate delivery |
| Development Manager | Lucas | Build the UI, API, storage, imports and exports; fix defects |
| Test Manager | Jams | Define acceptance tests; verify fidelity and persistence; record defects and results |

```flow LR
User -> Andy: requirements and decisions
Andy -> Lucas: implementation scope
Andy -> Jams: acceptance criteria
Lucas -> Jams: build and API contract
Jams -> Lucas: reproducible defects
Jams -> Andy: verification evidence
Andy -> User: design and delivery
```

These names identify AI collaborators in this project. They do not create employee accounts or autonomous background workers.

## C English interface

| Screen | Main content | Main actions |
|---|---|---|
| Overview | Evidence counts, weighted progress, recent activity | Open Test Data or Project Progress |
| Test Data | Source label, chart selector, frequency curves, original samples | Import Excel/CSV/JSON; group and filter; edit record details; inspect samples; download source; export CSV |
| Reports | Reference report and generated snapshots | Preview safely; create report; print; download HTML |
| Project Progress | Task table, owner, due date, status, completion, notes | Add task; save update; inspect activity |

Use CRYSOUND-inspired purple and cyan. This styling does not claim to reproduce an official brand master.
Use a sidebar on large screens and a compact navigation layout on small screens.
Show missing values as gaps. Never replace missing data with zero.
Show empty states when no CRY7574 measurements exist.

## D Data and report workflow

```flow LR
XLSX, CSV or JSON -> Validate: format and size
Validate -> Original file: preserve bytes and SHA-256
Validate -> Chart samples: numbers and missing values
Chart samples -> Test Data: log-frequency curves
Test Data -> CSV export: plotted samples
Test Data -> Report snapshot: selected data and notes
Original file -> Source download: exact original bytes
Report snapshot -> HTML report: print or download
```

A chart CSV is a derived export. It is distinct from the original uploaded file.
A JSON import uses the documented chart schema. CSV and Excel imports use frequency and numeric series columns.
Set the common measurement unit during an Excel or CSV import. Each nonempty worksheet becomes one chart.

The user selected manual Excel and CSV imports. The first release supports .xlsx files.
Convert legacy .xls files to .xlsx or CSV before importing.
Hardware acquisition remains outside this release.

A report records its source and creation time. Later data changes must not alter a stored report snapshot.
Reference threshold lines are visual references from the supplied report. Formal CRY7574 acceptance limits remain undefined.

## E Progress rules

| Field | Rule |
|---|---|
| Title | Required, bounded text |
| Owner | Editable text; Andy, Lucas and Jams are planning owners |
| Status | Server-defined planning, active, blocked and completed states |
| Completion | Number from 0 to 100 |
| Weight | Positive value used for overall completion |
| Due date | Optional valid calendar date |
| Notes | Editable text; include evidence and blockers |
| Updated at | Server-generated timestamp |

Overall completion equals the sum of task completion multiplied by weight, divided by total weight.
New work starts at zero. Update completion only when supporting work exists.

Seed tasks represent a proposed software plan. They are not the user's actual chamber development schedule.
A periodic API poll refreshes saved project data. This is not a live measurement stream.

## F Architecture and boundaries

```flow LR
English browser UI -> Local HTTP API: requests and periodic refresh
Local HTTP API -> SQLite: tasks, activity, charts and snapshots
SQLite -> Source BLOB archive: original imported bytes
Local HTTP API -> Reference library: supplied Alpair report
```

Use Python 3 standard-library services and buildless HTML, CSS and JavaScript.
Bind the service to 127.0.0.1. No cloud account or network service is required.

The first release assumes one trusted computer. It has no login or shared server authorization.
Enforce bounded uploads, schema validation and safe file identifiers.
Escape report text. Preview archived HTML in a sandbox.

Store runtime records separately from source files. Original uploads reside inside SQLite. Stop the server before backing up the database.

## G Delivery and verification

| Stage | Owner | Deliverable | Exit condition |
|---|---|---|---|
| Product definition | Andy | This design and scoped acceptance rules | Required workflows are defined |
| Implementation | Lucas | Local app, API, storage and startup command | Core workflows run |
| Verification | Jams | Test plan, integration suite and test report | Recorded tests pass; limits disclosed |
| Review | Andy and user | Running app and reviewable design | User feedback becomes the next backlog |

Test source fidelity, exact downloads, CSV gaps, persistence, validation and safe report output.
Test from temporary data stores so verification does not alter real project records.
Automated checks do not certify acoustic performance or regulatory compliance.

## H Next inputs and planned extensions

| Input to confirm | Why it matters | Current approach |
|---|---|---|
| Actual export format and sample files | Determines the production importer | XLSX/CSV plus supplied reference JSON |
| SoundCheck, LabVIEW or device interface | Determines automatic ingestion | Manual import first |
| CRY7574 acceptance limits and test method | Determines valid pass/fail calculations | No formal pass/fail claim |
| Real milestones, owners and dates | Determines the hardware project plan | Editable proposed software tasks |
| Shared deployment and account requirements | Determines multi-user architecture | Local trusted-computer release |

Future releases may add flexible workbook mapping, device ingestion, permission controls, report approval and shared deployment.
These items are proposals. They are outside the implemented first-release scope.
