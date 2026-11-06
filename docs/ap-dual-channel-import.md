# Dual-channel AP acoustic isolation imports

The local standalone application accepts this additional XLSX layout:

| Row | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Measurement title | | | |
| 2 | Ch1 | | Ch2 | |
| 3 | X | Y | X | Y |
| 4 | Hz | SPL unit | Hz | SPL unit |
| 5 onward | Inner frequency | Inner level | External frequency | External level |

The channel assignments are explicit: **Ch1 = Inner Microphone**, **Ch2 = External Microphone**. Each valid worksheet produces two original microphone records and a separately identified **Acoustic Isolation** record. The first row supplies the original measurement title; worksheet and channel identity distinguish the records. The original XLSX remains available for download without changes.

**Isolation (dB) = External Microphone (Ch2) − Inner Microphone (Ch1).**

Both channels must use supported SPL units and unique, strictly ascending, exactly matching frequency grids. The importer does not interpolate, smooth, take absolute values, clip negative results or substitute zero for a missing sample. If either level is missing, the calculated value is missing. Incompatible frequencies or units produce an import error for review. A worksheet with no jointly measured values cannot produce an isolation curve.

Calculated records have a dB output unit. They are not SPL measurements. Plot the isolation records together to compare configurations; plot microphone frequency responses separately in their compatible SPL units. The existing same-unit plot rule remains in effect.

Import preview, the plot legend, the values table, CSV/JSON exports and new reports identify the calculated result. The full workspace backup retains source bytes and calculation provenance. A normalized JSON export retains the calculation classification and formula, but does not replace the original workbook or a complete provenance backup.

Use **Import files → Preview files → Save ready files** in the desired Library. Test dates remain unknown unless explicitly entered. This feature does not modify previously saved records, import files into the user's live workspace automatically, push code or publish an online release.
