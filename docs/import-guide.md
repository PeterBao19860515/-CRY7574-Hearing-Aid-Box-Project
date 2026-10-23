# Measurement import guide

The application uses English. Use manual Excel (.xlsx) or UTF-8 CSV imports for the first release. JSON import is also available for structured chart collections.

## Audio Precision native Excel

AP-native XLSX files use measurement name, channel, X/Y labels and source units in the first four rows. The importer detects this layout without changing the original workbook. Use Upload Excel, select the workbook, enter optional test details, choose Preview measurements, review the detected datasets, then Save import.

Each AP measurement sheet becomes a separate record. Source units override the generic import-unit control. Raw RMS, AP-provided smoothed results, THD and distortion-product results remain distinct. Summary sheets are listed explicitly as source-only information and remain in the downloadable original. N/A limits are not passes. Unsupported nonempty sheets cause a clear error. The implementation has been checked against the two supplied single-channel, Hz-axis AP examples.

AP metadata records source sheet, source unit, measurement name, channel, processing and original cell rows. Test date stays unknown unless entered by the user. Editing import details after preview requires a new preview.

## CSV layout

Put Frequency or Frequency (Hz) in the first header cell. Put a unique series name in each remaining header cell. Each subsequent row contains a positive numeric frequency followed by numeric measurements. Keep frequencies in ascending order. Leave a measurement cell empty to preserve a missing value.

```csv
Frequency (Hz),Run 1,Run 2
100,62.5,62.4
200,,63.1
400,65.2,65.0
```

These numbers illustrate the file structure. They are not CRY7574 measurements. Choose the common measurement unit in the import form. Units and test conditions need engineering review. The importer does not infer device calibration or formal acceptance criteria.

## Excel layout

For generic (non-AP) XLSX files, use the same column layout in an .xlsx worksheet. Save numeric measurements as numbers. Formula cells require stored numeric results; open and recalculate the workbook in Excel before saving if the cached results are missing. Legacy .xls workbooks must be saved as .xlsx or CSV first. The application preserves the full original workbook for download.

For generic XLSX files, every nonempty worksheet becomes one chart. Each needs the same frequency-first header layout and uses the unit chosen for that import. Import sheets with different units in separate files. The README lists supported headers. Rich multi-section instrument exports may need column mapping before import; provide one real export to Andy to define that mapping.

## JSON layout

```json
{
  "charts": [
    {
      "title": "Response",
      "unit": "dB SPL",
      "series": [
        {"name": "Run 1", "values": [[100, 62.5], [200, null], [400, 65.2]]}
      ]
    }
  ]
}
```

## Downloads and reports

Original source downloads retain the uploaded bytes. The recorded SHA-256 identifies that source. Chart CSV exports are derived tables with traceability columns, not replacements for the original file. Report snapshots capture the selected measurements and engineering notes at creation time. Imported measurements remain unvalidated until engineers review device identity, calibration and test conditions.

No source XLSX workbook accompanies the supplied Alpair reference HTML. The workspace can download the supplied HTML and its extracted plotted points; it cannot reconstruct an unavailable original workbook.

## View saved measurement values

The Overview and Test Data screens have Upload Excel buttons. After Preview measurements and Save import, the selected chart and Original series values table display the imported data. Choose a series and 50 or 100 rows per page. The table retains full stored numeric values, shows Missing separately from 0, and lists source cell addresses only when recorded in the source mapping. Plot selection, date/item filters, original-file downloads and report creation remain available.
