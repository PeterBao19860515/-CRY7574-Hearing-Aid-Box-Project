# Overall Plan relationships

Open **Schedule → Overall Plan · Gantt & milestones**. Create or edit a phase or milestone, then choose its **Predecessors (Finish-to-Start)** and save. The picker searches plan titles, types and DRI names; selected items remain selected when filtering the choices. Remove a selection with its checkbox or selected-item chip.

This first version supports one relationship type: **Finish-to-Start (FS)**, with no configured lag. Every selected predecessor must finish before the successor starts. Because the plan stores calendar dates and phase bars include their end date, the date check expects the successor on a later calendar day. For example, a predecessor due on November 10 permits a successor starting on November 11. Same-day and earlier starts are shown as date conflicts. A milestone's due date is its date for these checks.

The diagram connects each predecessor's finish to its successor's start. Dashed warning arrows indicate a date conflict. The table lists predecessor names, incomplete-predecessor warnings and date conflicts. These checks do not move dates, change workflow states or recalculate recorded completion. After a date or status edit, the next saved refresh updates the warnings.

Self-links, duplicate references, unavailable items and circular relationships are rejected. Each item may have up to 20 predecessors. An item still used as a predecessor cannot be deleted: first edit its successors to remove those references, then use the existing confirmation and CRYSOUND deletion guard.

Arrow drawing covers relationships whose two endpoints appear on the current row page. The view reports relationships that reach filtered or off-page items. At most 200 arrows are drawn at once; all saved relationships remain in the predecessor lists. Phases, milestones and daily task-board entries remain separate records.

Relationships are included in complete workspace backups. Older records and backups default to no predecessors. Invalid relationship graphs are rejected before restore changes the workspace. Existing source files, measurement values, documents and task-board records are preserved. This local feature does not push, publish or increment the product version.
