"""HTTP acceptance tests; real server, isolated persistent data, stdlib only."""
import base64
import csv
import hashlib
from html.parser import HTMLParser
import http.client
import io
import json
import re
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
import xml.etree.ElementTree as ET
from urllib.parse import unquote
from xml.sax.saxutils import escape as xml_escape
import zipfile


ROOT = Path(__file__).resolve().parents[1]


class VisibleText(HTMLParser):
    def __init__(self,markup):
        super().__init__(convert_charrefs=True)
        self.parts=[]
        self.feed(markup)

    def handle_data(self,text):
        if text.strip():self.parts.append(text.strip())

    def text(self):return " ".join(self.parts)


def xlsx_fixture(header="Frequency", formula=False, shared=False, extra_member=None):
    """Minimal real OOXML workbook; no spreadsheet dependency or fake binary format."""
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    if shared:
        cells = '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c>'
    else:
        cells = ''.join(f'<c r="{col}1" t="inlineStr"><is><t>{text}</t></is></c>'
                        for col, text in zip("ABC", (header, "Left", "Right")))
    y = '<f>1+1</f>' if formula else '<v>1.23456789012345</v>'
    sheet = (f'<worksheet xmlns="{ns}"><sheetData><row r="1">{cells}</row>'
             f'<row r="2"><c r="A2"><v>100</v></c><c r="B2">{y}</c></row>'
             '<row r="3"><c r="A3"><v>200</v></c><c r="C3"><v>3.5</v></c></row>'
             '<row r="4"><c r="A4"><v>300</v></c><c r="B4"><v>0</v></c><c r="C4"><v>4</v></c></row>'
             '</sheetData></worksheet>')
    files = {
        "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        "xl/workbook.xml": f'<workbook xmlns="{ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Measurements" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        "xl/worksheets/sheet1.xml": sheet,
    }
    if shared:
        files["xl/sharedStrings.xml"] = (f'<sst xmlns="{ns}" count="3" uniqueCount="3">'
                                         f'<si><t>{header}</t></si><si><t>Left</t></si><si><t>Right</t></si></sst>')
    if extra_member:
        files[extra_member[0]] = extra_member[1]
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as workbook:
        for name, value in files.items():
            workbook.writestr(name, value)
    return output.getvalue()


def ap_fixture(extra_sheet=False, malformed_axis=False, extra_column=False, formula=False):
    """Synthetic AP-native workbook: headers in rows 1–4, data starts at row 5."""
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    definitions = [("RMS Level","RMS Level","dBSPL1"),
                   ("RMS Level -> Smooth","RMS Level -> Smooth","Vrms"),
                   ("Distortion Pro... Ratio (H2:H5)","Distortion Product Ratio (H2:H5)","%")]
    sheets = []
    for name, title, unit in definitions:
        def text_cell(ref, text):
            return f'<c r="{ref}" t="inlineStr"><is><t>{xml_escape(text)}</t></is></c>'
        head = [text_cell("A1",title), text_cell("A2","Ch1"),
                text_cell("A3","Time" if malformed_axis else "X") + text_cell("B3","Y"),
                text_cell("A4","Hz") + text_cell("B4",unit)]
        rows = [f'<row r="{i}">{value}</row>' for i,value in enumerate(head,1)]
        for i,(x,y) in enumerate(((100,0),(200,None),(300,2),(400,0)),5):
            cell = f'<c r="A{i}"><v>{x}</v></c>'
            if formula and i == 5:
                cell += f'<c r="B{i}"><f>0+0</f></c>'
            elif y is not None:
                cell += f'<c r="B{i}"><v>{y}</v></c>'
            if extra_column and i == 5:
                cell += text_cell("C5","Unexpected channel")
            rows.append(f'<row r="{i}">{cell}</row>')
        sheets.append((name,f'<worksheet xmlns="{ns}"><sheetData>{"".join(rows)}</sheetData></worksheet>'))
    summary = ('<row r="1">' + text_cell("A1","Summary: Signal Path1.Acoustic Response.RMS Level") + '</row>'
               '<row r="2">' + text_cell("A2","Channel") + text_cell("B2","Passed Lower Limit") + text_cell("C2","Passed Upper Limit") + '</row>'
               '<row r="3">' + text_cell("A3","Ch1") + text_cell("B3","N/A") + text_cell("C3","N/A") + '</row>')
    sheets.append(("Summary",f'<worksheet xmlns="{ns}"><sheetData>{summary}</sheetData></worksheet>'))
    if extra_sheet:
        sheets.append(("Unexpected notes",f'<worksheet xmlns="{ns}"><sheetData><row r="1">{text_cell("A1","unrecognized data")}</row></sheetData></worksheet>'))
    files = {"[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1)) + '</Types>',
             "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
             "xl/workbook.xml": f'<workbook xmlns="{ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + ''.join(f'<sheet name="{xml_escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i,(name,_) in enumerate(sheets,1)) + '</sheets></workbook>',
             "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1)) + '</Relationships>'}
    files.update({f'xl/worksheets/sheet{i}.xml':body for i,(_,body) in enumerate(sheets,1)})
    output = io.BytesIO()
    with zipfile.ZipFile(output,"w",zipfile.ZIP_DEFLATED) as archive:
        for name,content in files.items():archive.writestr(name,content)
    return output.getvalue()


def independently_read_ap_workbook(path):
    """Read known source cells independently; no server code or optional package required."""
    main = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    rel = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    result = []
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = [''.join(si.itertext()) for si in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        targets = {r.attrib["Id"]:r.attrib["Target"] for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        book = ET.fromstring(archive.read("xl/workbook.xml"))
        for sheet in book.find(main+"sheets"):
            name = sheet.attrib["name"]
            target = targets[sheet.attrib[rel]]
            target = target.lstrip("/") if target.startswith("/") else "xl/"+target
            rows = {}
            for row in ET.fromstring(archive.read(target)).iter(main+"row"):
                cells = {}
                for cell in row:
                    ref = cell.attrib["r"]
                    value_node = cell.find(main+"v")
                    if cell.attrib.get("t") == "inlineStr":value = ''.join(cell.find(main+"is").itertext())
                    elif cell.attrib.get("t") == "s":value = shared[int(value_node.text)]
                    elif value_node is not None and value_node.text is not None:
                        value = float(value_node.text) if cell.attrib.get("t") not in ("str","e") else value_node.text
                    else:value = None
                    cells[re.sub(r"[0-9]", "", ref)] = value
                rows[int(row.attrib["r"])] = cells
            if name == "Summary":continue
            points,source_rows = [],[]
            for number,cells in sorted(rows.items()):
                if number >= 5 and isinstance(cells.get("A"),(int,float)):
                    points.append([cells["A"],cells.get("B")]);source_rows.append(number)
            result.append(dict(worksheet=name,title=rows[1]["A"],channel=rows[2]["A"],
                               sourceUnit=rows[4]["B"],values=points,sourceRows=source_rows))
    return result


class AcceptanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads((ROOT / "reference/measurement-data.json").read_text())
        cls.temp = tempfile.TemporaryDirectory(prefix="cry7574-qa-")
        cls.log = open(Path(cls.temp.name) / "server.log", "w+")
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            cls.port = s.getsockname()[1]
        cls.start_server()

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen(
            [sys.executable, str(ROOT / "server.py"), "--port", str(cls.port),
             "--data-dir", str(Path(cls.temp.name) / "data")],
            cwd=ROOT, stdout=cls.log, stderr=cls.log)
        for _ in range(100):
            if cls.process.poll() is not None:
                cls.log.seek(0)
                raise RuntimeError(cls.log.read())
            try:
                conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=1)
                conn.request("GET", "/api/state")
                response = conn.getresponse()
                response.read()
                conn.close()
                if response.status == 200:
                    return
            except OSError:
                pass
            time.sleep(.05)
        raise RuntimeError("Temporary server did not become ready")

    @classmethod
    def stop_server(cls):
        cls.process.terminate()
        try:
            cls.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.process.kill()
            cls.process.wait(timeout=5)

    @classmethod
    def tearDownClass(cls):
        cls.stop_server()
        cls.log.close()
        cls.temp.cleanup()

    def request(self, method, path, payload=None, headers=None, raw=None):
        request_headers = dict(headers or {})
        body = raw
        if payload is not None:
            body = json.dumps(payload).encode()
            request_headers.setdefault("Content-Type", "application/json")
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request(method, path, body, request_headers)
        response = conn.getresponse()
        data = response.read()
        result = response.status, dict(response.getheaders()), data
        conn.close()
        return result

    def api(self, method, path, payload=None, status=200, **kwargs):
        code, _, data = self.request(method, path, payload, **kwargs)
        self.assertEqual(code, status, data[:500])
        return json.loads(data)

    def state(self):
        return self.api("GET", "/api/state")

    def import_file(self, name, content, fmt="csv", **options):
        return self.api("POST", "/api/import", {
            "name": name, "format": fmt,
            "contentBase64": base64.b64encode(content).decode(), **options}, status=201)

    def make_task(self, **fields):
        task = dict(title="QA temporary task", owner="Jams", status="In progress",
                    percent=25, weight=2, dueDate="2026-12-20", notes="QA fixture")
        task.update(fields)
        return self.api("POST", "/api/tasks", task, status=201)

    def test_01_all_reference_values_and_nulls_preserved(self):
        original_html = (ROOT / "reference/Alpair5G_Anechoic_Test_Report_English.html").read_text()
        embedded = re.search(r'<script id="measurement-data" type="application/json">(.*?)</script>',
                             original_html, flags=re.S)
        self.assertIsNotNone(embedded)
        self.assertEqual(json.loads(embedded.group(1)), self.fixture)
        source_points = source_nulls = series_count = 0
        for expected in self.fixture["charts"]:
            with self.subTest(chart=expected["key"]):
                actual = self.api("GET", "/api/charts/ref-" + expected["key"])
                for key, value in expected.items():
                    self.assertEqual(actual[key], value, key)
                for series in actual["series"]:
                    series_count += 1
                    source_points += len(series["values"])
                    source_nulls += sum(y is None for _, y in series["values"])
        self.assertEqual((len(self.fixture["charts"]), series_count, source_points, source_nulls),
                         (33, 97, 14971, 174))

    def test_02_reference_provenance_and_original_download(self):
        state = self.state()
        self.assertEqual(state["summary"]["cry7574TestRuns"], 0)
        self.assertEqual(state["summary"]["referenceCharts"], 33)
        self.assertIn("Alpair", json.dumps(state["sources"]))
        code, headers, body = self.request("GET", "/api/sources/reference/download")
        self.assertEqual(code, 200)
        original = (ROOT / "reference/Alpair5G_Anechoic_Test_Report_English.html").read_bytes()
        self.assertEqual(hashlib.sha256(body).hexdigest(), hashlib.sha256(original).hexdigest())
        self.assertIn("attachment", headers.get("Content-Disposition", ""))
        self.assertIn(".html", headers.get("Content-Disposition", ""))

    def test_03_csv_import_preserves_original_and_blanks(self):
        content = b'Frequency,"Left, \"\"A\"\"",Right\r\n100,1.23456789012345,\r\n200,,3.5\r\n300,0,4\r\n'
        imported = self.import_file("QA original.csv", content)
        source = imported["source"]
        code, headers, raw = self.request("GET", "/api/sources/" + source["id"] + "/download")
        self.assertEqual(code, 200)
        self.assertEqual(raw, content)
        self.assertIn("attachment", headers.get("Content-Disposition", ""))
        chart = self.api("GET", "/api/charts/" + imported["charts"][0]["id"])
        self.assertEqual(chart["series"][0]["name"], 'Left, "A"')
        self.assertEqual(chart["series"][0]["values"], [[100,1.23456789012345],[200,None],[300,0]])
        self.assertEqual(chart["series"][1]["values"], [[100,None],[200,3.5],[300,4]])

    def test_04_csv_export_escaping_and_null_roundtrip(self):
        name = 'Line one, "quoted"\nLine two'
        payload = {"title": "QA escaping", "unit": "dB", "series": [
            {"name": name, "values": [[100, None], [200, 1.23456789012345]]}]}
        imported = self.import_file("QA escaping.json", json.dumps(payload).encode(), "json")
        chart_id = imported["charts"][0]["id"]
        code, headers, body = self.request("GET", f"/api/charts/{chart_id}/export.csv")
        self.assertEqual(code, 200)
        self.assertIn("attachment", headers.get("Content-Disposition", ""))
        rows = list(csv.reader(io.StringIO(body.decode("utf-8-sig"))))
        # Export may use a wide or a long table, but CSV quoting must preserve the exact name.
        self.assertTrue(any(name in row for row in rows), rows[:3])
        self.assertTrue(any("" in row and any(cell in ("100","100.0") for cell in row) for row in rows), rows[:3])
        self.assertTrue(any("1.23456789012345" in row for row in rows), rows[:4])

    def test_05_tasks_weighted_progress_and_restart(self):
        created = self.make_task(title="QA persistence", percent=37, weight=3)
        task_id = created["id"]
        self.api("PATCH", "/api/tasks/" + task_id, {"percent": 63, "notes": "Persist after restart"})
        before = self.state()
        total = sum(t["weight"] for t in before["tasks"])
        expected = round(sum(t["weight"] * t["percent"] for t in before["tasks"]) / total, 1)
        self.assertAlmostEqual(before["summary"]["overallProgress"], expected, places=1)
        self.stop_server()
        self.start_server()
        after = self.state()
        self.assertEqual(before["tasks"], after["tasks"])
        self.assertEqual(before["summary"]["overallProgress"], after["summary"]["overallProgress"])
        task = next(t for t in after["tasks"] if t["id"] == task_id)
        self.assertEqual((task["percent"], task["notes"]), (63, "Persist after restart"))

    def test_06_invalid_tasks_do_not_modify_state(self):
        task = self.make_task()
        for invalid in ({"percent": -1}, {"percent": 101}, {"percent": True},
                        {"weight": 0}, {"status": "Approved"}, {"owner": ""},
                        {"title": ""}, {"dueDate": "2026-02-30"}, {"owner":"x"*101},
                        {"status":"Complete", "percent":50}, {"status":"Planned", "percent":5}):
            with self.subTest(invalid=invalid):
                before = self.state()
                self.api("PATCH", "/api/tasks/" + task["id"], invalid, status=400)
                self.assertEqual(self.state(), before)

    def test_07_status_and_percent_consistency(self):
        task = self.make_task()
        for status, percent in (("Complete",100), ("Planned",0)):
            updated = self.api("PATCH", "/api/tasks/" + task["id"], {"status": status, "percent": percent})
            self.assertEqual(updated["status"], status)
            self.assertEqual(updated["percent"], percent)

    def test_08_invalid_import_is_atomic(self):
        payloads = [
            {"name":"Bad.csv", "format":"csv", "contentBase64":"!!bad!!"},
            {"name":"Bad.csv", "format":"csv", "contentBase64":base64.b64encode(b"Frequency,Value\n100,garbage\n").decode()},
            {"name":"Bad.csv", "format":"csv", "contentBase64":base64.b64encode(b"wrong,header\n100,2\n").decode()},
            {"name":"Bad.csv", "format":"csv", "contentBase64":base64.b64encode(b"Frequency,Value\n,2\n").decode()},
            {"name":"Bad.csv", "format":"csv", "contentBase64":base64.b64encode(b"Frequency,Value\n100,Infinity\n").decode()},
            {"name":"Bad.csv", "format":"csv", "contentBase64":base64.b64encode(b"Frequency,Value\n100,1,unexpected\n").decode()},
            {"name":"Bad.json", "format":"json", "contentBase64":base64.b64encode(b'{"series":[{"name":"x","values":[[-1,2]]}]}').decode()},
            {"name":"Bad.json", "format":"json", "contentBase64":base64.b64encode(b'{"series":[{"name":"x","values":[[100,NaN]]}]}').decode()},
            {"name":"Bad.json", "format":"json", "contentBase64":base64.b64encode(b'{"title":"Bad","series":[{"name":"x","values":[[true,2]]}]}').decode()},
            {"name":"Bad.json", "format":"json", "contentBase64":base64.b64encode(b'{"title":"Bad","series":[{"name":"x","values":[[100,"2"]]}]}').decode()},
            {"name":"Bad.json", "format":"json", "contentBase64":base64.b64encode(b'{"charts":[]}').decode()},
            {"name":"Bad.json", "format":"json", "contentBase64":base64.b64encode(b'{"charts":[{"series":[{"values":[[100,2]]}]},{"series":[]}]}').decode()},
        ]
        for payload in payloads:
            with self.subTest(payload=payload["name"]):
                before = self.state()
                self.api("POST", "/api/import", payload, status=400)
                self.assertEqual(self.state(), before)
        before = self.state()
        self.api("POST", "/api/import", raw=b'{broken', headers={"Content-Type":"application/json"}, status=400)
        self.assertEqual(self.state(), before)

    def test_09_path_traversal_and_unknown_ids(self):
        for path in ("/server.py", "/../server.py", "/%2e%2e/server.py",
                     "/api/sources/../../server.py/download", "/api/charts/nonexistent",
                     "/api/sources/nonexistent/download", "/api/reports/nonexistent/download"):
            with self.subTest(path=path):
                status, _, body = self.request("GET", path)
                self.assertIn(status, (400,403,404))
                self.assertNotIn(b"class Handler", body)

    def test_10_untrusted_origin_and_host_rejected(self):
        before = self.state()
        for headers in ({"Origin":"https://untrusted.example"}, {"Host":"untrusted.example"}):
            status, _, _ = self.request("POST", "/api/tasks", dict(
                title="Must not be saved", owner="Jams", status="Planned", percent=0,
                weight=1, dueDate="", notes=""), headers=headers)
            self.assertIn(status, (400,403))
            self.assertEqual(self.state(), before)

    def test_11_report_escape_and_immutable_snapshot(self):
        hostile = '</script><script>alert("QA")</script><img src=x onerror=alert(1)>'
        report = self.api("POST", "/api/reports", {"chartId":"ref-C22", "title":hostile, "notes":hostile}, status=201)
        snapshot = self.api("GET", "/api/reports/" + report["id"])
        self.assertEqual(snapshot["chart"], self.api("GET", "/api/charts/ref-C22"))
        self.assertEqual(snapshot["source"], next(s for s in self.state()["sources"] if s["id"] == "reference"))
        path = "/api/reports/" + report["id"] + "/download"
        status, headers, body = self.request("GET", path)
        self.assertEqual(status, 200)
        html = body.decode()
        self.assertNotIn(hostile, html)
        self.assertNotIn('<script>alert("QA")</script>', html)
        self.assertIn("&lt;", html)
        self.assertIn("Alpair", html)
        self.assertIn("attachment", headers.get("Content-Disposition", ""))
        self.make_task(title="Change after report creation", percent=85)
        self.assertEqual(self.request("GET", path)[2], body)
        self.assertEqual(self.api("GET", "/api/reports/" + report["id"]), snapshot)

    def test_12_real_employee_owner_is_supported(self):
        task = self.make_task(owner="Acoustic Engineering Team")
        self.assertEqual(task["owner"], "Acoustic Engineering Team")

    def test_13_xlsx_inline_and_shared_strings_raw_fidelity(self):
        for shared in (False, True):
            with self.subTest(shared_strings=shared):
                content = xlsx_fixture(shared=shared)
                imported = self.import_file("QA workbook.xlsx", content, "xlsx")
                source_id = imported["source"]["id"]
                code, headers, raw = self.request("GET", f"/api/sources/{source_id}/download")
                self.assertEqual(code, 200)
                self.assertEqual(hashlib.sha256(raw).hexdigest(), hashlib.sha256(content).hexdigest())
                self.assertIn("attachment", headers.get("Content-Disposition", ""))
                chart = self.api("GET", "/api/charts/" + imported["charts"][0]["id"])
                self.assertEqual([s["name"] for s in chart["series"]], ["Left", "Right"])
                self.assertEqual(chart["series"][0]["values"], [[100,1.23456789012345],[200,None],[300,0]])
                self.assertEqual(chart["series"][1]["values"], [[100,None],[200,3.5],[300,4]])

    def test_14_invalid_xlsx_rejected_atomically(self):
        invalid_files = [b"not a zip file", xlsx_fixture(header="Time"), xlsx_fixture(formula=True)]
        # A small compressed upload must not expand to an unbounded in-memory workbook.
        invalid_files.append(xlsx_fixture(extra_member=("xl/oversized.xml", " " * (51 * 1024 * 1024))))
        for index, content in enumerate(invalid_files):
            with self.subTest(case=index):
                before = self.state()
                code, _, body = self.request("POST", "/api/import", {
                    "name":"Invalid workbook.xlsx", "format":"xlsx",
                    "contentBase64":base64.b64encode(content).decode()})
                self.assertIn(code, (400,413), body[:500])
                self.assertEqual(self.state(), before)

    def test_15_selected_series_report_is_exact(self):
        chart = self.api("GET", "/api/charts/ref-C22")
        selected = [chart["series"][0]["name"]]
        report = self.api("POST", "/api/reports", {"chartId":chart["id"], "series":selected}, status=201)
        snapshot = self.api("GET", "/api/reports/" + report["id"])
        self.assertEqual(snapshot["chart"]["series"], [chart["series"][0]])
        before = self.state()
        self.api("POST", "/api/reports", {"chartId":chart["id"], "series":["Missing series"]}, status=400)
        self.assertEqual(self.state(), before)

    def test_16_report_of_all_missing_series_is_safe(self):
        content = json.dumps({"title":"QA missing series", "series":[
            {"name":"Measured", "values":[[100,2],[200,3]]},
            {"name":"Missing", "values":[[100,None],[200,None]]}]}).encode()
        imported = self.import_file("QA missing.json", content, "json")
        chart_id = imported["charts"][0]["id"]
        before = self.state()
        code, _, body = self.request("POST", "/api/reports", {"chartId":chart_id, "series":["Missing"]})
        # Either reject before saving, or render an explicit empty-data report safely.
        self.assertIn(code, (201,400), body[:500])
        if code == 201:
            report_id = json.loads(body)["id"]
            code, _, body = self.request("GET", f"/api/reports/{report_id}/download")
            self.assertEqual(code, 200, body[:500])
        else:
            self.assertEqual(self.state(), before)

    def test_17_measurement_unit_persistence_and_validation(self):
        imports = [("QA unit.csv",b"Frequency,Value\n100,2\n200,3\n","csv","dB SPL"),
                   ("QA unit.xlsx",xlsx_fixture(),"xlsx","%")]
        expected_units = {}
        for name, content, fmt, unit in imports:
            imported = self.import_file(name, content, fmt, unit=unit)
            self.assertEqual(imported["source"]["sha256"], hashlib.sha256(content).hexdigest())
            chart_id = imported["charts"][0]["id"]
            expected_units[chart_id] = unit
            self.assertEqual(self.api("GET", "/api/charts/" + chart_id)["unit"], unit)
            report = self.api("POST", "/api/reports", {"chartId":chart_id}, status=201)
            self.assertEqual(self.api("GET", "/api/reports/" + report["id"])["chart"]["unit"], unit)
        self.stop_server()
        self.start_server()
        for chart_id, unit in expected_units.items():
            self.assertEqual(self.api("GET", "/api/charts/" + chart_id)["unit"], unit)
        content = b"Frequency,Value\n100,2\n"
        for invalid_unit in ("", "x"*51):
            before = self.state()
            self.api("POST", "/api/import", {"name":"Bad unit.csv", "format":"csv", "unit":invalid_unit,
                     "contentBase64":base64.b64encode(content).decode()}, status=400)
            self.assertEqual(self.state(), before)
        content = json.dumps({"unit":"V", "series":[{"values":[[100,2]]}]}).encode()
        imported = self.import_file("QA JSON unit.json", content, "json", unit="dB SPL")
        self.assertEqual(self.api("GET", "/api/charts/" + imported["charts"][0]["id"])["unit"], "V")

    def test_18_report_isolated_points_remain_visible_across_gap(self):
        imported = self.import_file("QA isolated points.xlsx", xlsx_fixture(), "xlsx", unit="dB SPL")
        chart_id = imported["charts"][0]["id"]
        report = self.api("POST", "/api/reports", {"chartId":chart_id}, status=201)
        code, _, body = self.request("GET", "/api/reports/" + report["id"] + "/download")
        self.assertEqual(code, 200)
        markup = re.search(r"(<svg\b.*?</svg>)", body.decode(), re.S)
        self.assertIsNotNone(markup)
        svg = ET.fromstring(markup.group(1))
        markers = [c for c in svg.iter("circle") if float(c.get("r", "0")) > 0
                   and (c.get("fill", "none") != "none" or c.get("stroke", "none") != "none")]
        # The Left series has two isolated valid samples separated by a null at 200 Hz.
        # Both must remain visible at the actual logarithmic-X / linear-Y coordinates.
        expected = [(50.0,300-260*1.23456789012345/4), (850.0,300.0)]
        for x, y in expected:
            self.assertTrue(any(abs(float(c.get("cx", "-999"))-x) < .03
                                and abs(float(c.get("cy", "-999"))-y) < .03 for c in markers),
                            f"Missing visible isolated-point marker at {(x,y)}")
        for line in svg.iter("polyline"):
            if line.get("stroke") == "#7047eb":
                self.assertLessEqual(len(line.get("points", "").split()),1,
                                     "Missing sample must not be bridged by a line")
        snapshot = self.api("GET", "/api/reports/" + report["id"])
        self.assertEqual(snapshot["chart"]["series"][0]["values"],
                         [[100,1.23456789012345],[200,None],[300,0]])

    def test_19_unicode_source_filename_and_raw_download(self):
        name = "助听器测试.xlsx"
        content = xlsx_fixture()
        imported = self.import_file(name, content, "xlsx")
        code, headers, body = self.request("GET", "/api/sources/" + imported["source"]["id"] + "/download")
        self.assertEqual(code, 200)
        self.assertEqual(body, content)
        disposition = headers.get("Content-Disposition", "")
        extended = re.search(r"filename\*=UTF-8''([^;]+)", disposition, re.I)
        self.assertIsNotNone(extended, disposition)
        self.assertEqual(unquote(extended.group(1)), name)
        self.assertTrue(disposition.isascii())

    def test_20_unknown_test_dates_are_explicit_defaults(self):
        state = self.state()
        for entry in state["charts"]:
            if entry["kind"] == "reference":
                self.assertEqual(entry["testDate"], "", "Reference upload/report date is not a test date")
                self.assertEqual(entry["testItem"], "")
                self.assertEqual(entry["notes"], "")
        imported = self.import_file("QA unknown date.csv", b"Frequency,Value\n100,2\n200,3\n")
        chart = self.api("GET", "/api/charts/" + imported["charts"][0]["id"])
        for key in ("testDate", "testItem", "notes"):
            self.assertEqual(chart[key], "")
        self.assertNotEqual(chart["testDate"], imported["source"]["createdAt"][:10])

    def test_21_common_import_metadata_and_multichart_title(self):
        fields = dict(title="QA chamber response", testDate="2026-10-19", testItem="Frequency response", notes="Operator supplied context")
        for name, raw, fmt in (("QA metadata.xlsx",xlsx_fixture(),"xlsx"),
                               ("QA metadata.csv",b"Frequency,Value\n100,2\n200,3\n","csv")):
            imported = self.import_file(name, raw, fmt, **fields)
            chart = self.api("GET", "/api/charts/" + imported["charts"][0]["id"])
            for key, value in fields.items():
                self.assertEqual(chart[key], value)
        payload = {"charts":[
            {"title":"Left channel", "series":[{"values":[[100,2],[200,3]]}]},
            {"title":"Right channel", "series":[{"values":[[100,4],[200,5]]}]}]}
        imported = self.import_file("QA common metadata.json", json.dumps(payload).encode(), "json", **fields)
        self.assertEqual(len(imported["charts"]), 2)
        for original, entry in zip(payload["charts"], imported["charts"]):
            chart = self.api("GET", "/api/charts/" + entry["id"])
            self.assertEqual(chart["title"], fields["title"] + " · " + original["title"])
            for key in ("testDate", "testItem", "notes"):
                self.assertEqual(chart[key], fields[key])

    def test_22_metadata_edit_preserves_raw_provenance_and_report_snapshots(self):
        raw = b"Frequency,Value\n100,2\n200,\n300,4\n"
        imported = self.import_file("QA immutable source.csv", raw)
        source = imported["source"]
        chart_id = imported["charts"][0]["id"]
        before = self.api("GET", "/api/charts/" + chart_id)
        old_report = self.api("POST", "/api/reports", {"chartId":chart_id}, status=201)
        old_path = "/api/reports/" + old_report["id"]
        old_snapshot = self.api("GET", old_path)
        old_html = self.request("GET", old_path + "/download")[2]
        fields = dict(title="Renamed chamber response", testDate="2026-10-18",
                      testItem='Response <img src=x onerror="alert(1)">',
                      notes='Bench note </pre><script>alert("chart QA")</script>')
        edited = self.api("PATCH", "/api/charts/" + chart_id, fields)
        for key, value in fields.items():
            self.assertEqual(edited[key], value)
        for key, value in before.items():
            if key not in {*fields, "updatedAt"}:
                self.assertEqual(edited[key], value, key)
        self.assertTrue(edited["updatedAt"])
        self.assertEqual(next(s for s in self.state()["sources"] if s["id"] == source["id"]), source)
        self.assertEqual(self.request("GET", "/api/sources/" + source["id"] + "/download")[2], raw)
        self.assertEqual(source["sha256"], hashlib.sha256(raw).hexdigest())
        listed = next(c for c in self.state()["charts"] if c["id"] == chart_id)
        for key in fields:
            self.assertEqual(listed[key], fields[key])
        report = self.api("POST", "/api/reports", {"chartId":chart_id}, status=201)
        snapshot = self.api("GET", "/api/reports/" + report["id"])
        self.assertEqual(snapshot["chart"], edited)
        html = self.request("GET", "/api/reports/" + report["id"] + "/download")[2].decode()
        self.assertIn("2026-10-18", html)
        self.assertNotIn(fields["testItem"], html)
        self.assertNotIn(fields["notes"], html)
        self.assertIn("Response &lt;img", html)
        self.assertEqual(self.api("GET", old_path), old_snapshot)
        self.assertEqual(self.request("GET", old_path + "/download")[2], old_html)
        self.stop_server()
        self.start_server()
        self.assertEqual(self.api("GET", "/api/charts/" + chart_id), edited)
        self.assertEqual(self.api("GET", old_path), old_snapshot)
        self.assertEqual(self.request("GET", "/api/sources/" + source["id"] + "/download")[2], raw)

    def test_23_invalid_metadata_updates_and_imports_are_atomic(self):
        imported = self.import_file("QA validate metadata.csv", b"Frequency,Value\n100,2\n")
        path = "/api/charts/" + imported["charts"][0]["id"]
        invalid = [{}, {"title":""}, {"title":"x"*201}, {"title":None},
                   {"testDate":"2026-02-29"}, {"testDate":"2026-1-01"}, {"testDate":"2026-10-19T00:00:00"},
                   {"testDate":None}, {"testItem":"x"*101}, {"testItem":True},
                   {"notes":"x"*5001}, {"notes":3}, {"unit":"V"}, {"series":[]},
                   {"sourceId":"reference"}, {"kind":"reference"}, {"label":"verified"},
                   {"title":"Must not partially save", "sourceId":"reference"}]
        for fields in invalid:
            with self.subTest(fields=fields):
                before, chart_before = self.state(), self.api("GET", path)
                self.api("PATCH", path, fields, status=400)
                self.assertEqual(self.state(), before)
                self.assertEqual(self.api("GET", path), chart_before)
        accepted = dict(title="x"*200, testDate="2028-02-29", testItem="y"*100, notes="z"*5000)
        self.api("PATCH", path, accepted)
        self.api("PATCH", path, dict(testDate="", testItem="", notes=""))
        for fields in ({"testDate":"2026-02-30"}, {"testItem":"x"*101}, {"notes":"x"*5001}, {"title":""}):
            before = self.state()
            self.api("POST", "/api/import", dict(name="Invalid metadata.csv", format="csv",
                     contentBase64=base64.b64encode(b"Frequency,Value\n100,2\n").decode(), **fields), status=400)
            self.assertEqual(self.state(), before)

    def test_24_legacy_chart_defaults_migrate_without_inventing_test_date(self):
        imported = self.import_file("QA legacy date.csv", b"Frequency,Value\n100,2\n200,3\n")
        chart_id = imported["charts"][0]["id"]
        before = self.api("GET", "/api/charts/" + chart_id)
        report = self.api("POST", "/api/reports", {"chartId":chart_id}, status=201)
        report_before = self.api("GET", "/api/reports/" + report["id"])
        self.stop_server()
        with sqlite3.connect(Path(self.temp.name) / "data/workspace.sqlite3") as conn:
            for item_id in (chart_id,"ref-C01"):
                payload = json.loads(conn.execute("SELECT payload FROM charts WHERE id=?", (item_id,)).fetchone()[0])
                for key in ("testDate","testItem","notes","updatedAt"):
                    payload.pop(key, None)
                conn.execute("UPDATE charts SET payload=? WHERE id=?", (json.dumps(payload), item_id))
        self.start_server()
        for item_id in (chart_id,"ref-C01"):
            actual = self.api("GET", "/api/charts/" + item_id)
            for key in ("testDate","testItem","notes","updatedAt"):
                self.assertEqual(actual[key], "")
            listed = next(c for c in self.state()["charts"] if c["id"] == item_id)
            self.assertEqual(listed["testDate"], "")
        actual = self.api("GET", "/api/charts/" + chart_id)
        for key, value in before.items():
            if key not in ("testDate","testItem","notes","updatedAt"):
                self.assertEqual(actual[key], value)
        self.assertEqual(self.api("GET", "/api/reports/" + report["id"]), report_before)

    def test_25_json_chart_specific_metadata_is_preserved(self):
        payload = {"charts":[
            {"title":"Actual date supplied", "testDate":"2026-10-17", "testItem":"THD", "notes":"From bench record",
             "series":[{"values":[[100,.4],[200,.2]]}]},
            {"title":"Actual date unknown", "series":[{"values":[[100,1],[200,2]]}]}]}
        imported = self.import_file("QA chart-specific metadata.json", json.dumps(payload).encode(), "json")
        first = self.api("GET", "/api/charts/" + imported["charts"][0]["id"])
        for key in ("title","testDate","testItem","notes"):
            self.assertEqual(first[key], payload["charts"][0][key])
        second = self.api("GET", "/api/charts/" + imported["charts"][1]["id"])
        self.assertEqual(second["testDate"], "")

    def test_26_ap_preview_mapping_units_zeros_and_nulls(self):
        raw = ap_fixture()
        payload = dict(name="Synthetic AP.xlsx",format="xlsx",contentBase64=base64.b64encode(raw).decode())
        before = self.state()
        for generic_unit in ("Value","dB SPL"):
            preview = self.api("POST", "/api/import/preview", dict(payload,unit=generic_unit))
            self.assertEqual(self.state(), before, "Preview must not write records or activity")
            self.assertEqual(preview["formatDetected"], "audio-precision-xlsx")
            self.assertEqual(preview["sha256"], hashlib.sha256(raw).hexdigest())
            self.assertEqual([c["pointCount"] for c in preview["charts"]], [4,4,4])
            self.assertEqual([c["sourceUnit"] for c in preview["charts"]], ["dBSPL1","Vrms","%"])
            self.assertEqual([c["unit"] for c in preview["charts"]], ["dB SPL","Vrms","%"])
            self.assertTrue(all(c["testDate"] == "" for c in preview["charts"]))
            skipped = preview["skippedSheets"]
            self.assertEqual([s["worksheet"] for s in skipped], ["Summary"])
            self.assertTrue(skipped[0]["reason"])
            self.assertIn("N/A", json.dumps(skipped[0]["metadata"]))
        fields = dict(title="Bench source",testDate="2026-10-21",testItem="Bench Acoustic",notes="Operator supplied actual date")
        imported = self.import_file("Synthetic AP.xlsx",raw,"xlsx",unit="dB SPL",**fields)
        self.assertEqual(imported["source"]["formatDetected"], "audio-precision-xlsx")
        for i,entry in enumerate(imported["charts"]):
            chart = self.api("GET", "/api/charts/"+entry["id"])
            self.assertTrue(chart["series"][0]["values"] == [[100,0],[200,None],[300,2],[400,0]])
            self.assertEqual(chart["testDate"], fields["testDate"])
            self.assertEqual(chart["testItem"], fields["testItem"])
            self.assertEqual(chart["notes"], fields["notes"])
            self.assertTrue(chart["title"].startswith("Bench source · "))
            self.assertEqual(chart["unit"], ("dB SPL","Vrms","%")[i])
            self.assertEqual(chart["processing"], "AP-provided smoothed" if i == 1 else "raw")
            trace = chart["provenance"]
            self.assertEqual((trace["xColumn"],trace["yColumn"],trace["dataStartRow"]), ("A","B",5))
            self.assertEqual(trace["sourceRows"], [5,6,7,8])
            self.assertEqual(trace["headerRows"], dict(title=1,channel=2,axes=3,units=4))
            if i == 2:
                self.assertEqual(trace["worksheet"], "Distortion Pro... Ratio (H2:H5)")
                self.assertEqual(trace["measurementTitle"], "Distortion Product Ratio (H2:H5)")
                self.assertIn("Distortion Product Ratio (H2:H5)", chart["title"])
            report = self.api("POST", "/api/reports", {"chartId":chart["id"]}, status=201)
            code,_,html = self.request("GET", "/api/reports/"+report["id"]+"/download")
            self.assertEqual(code,200)
            visible = VisibleText(html.decode().split("<details>")[0]).text()
            for value in ("Audio Precision source provenance", "AP measurement title "+trace["measurementTitle"],
                          "Worksheet "+trace["worksheet"], "Channel Ch1", "Source unit "+chart["sourceUnit"],
                          "Processing "+chart["processing"], "Data cells A5:A8 / B5:B8",
                          "Source lower entry", "Source upper entry", "N/A N/A"):
                self.assertIn(value,visible)
            self.assertIn("not interpreted as configured limits, a pass or a fail",visible)
        self.assertEqual(self.request("GET", "/api/sources/"+imported["source"]["id"]+"/download")[2],raw)

    def test_27_malformed_ap_preview_and_import_are_atomic(self):
        for kwargs in (dict(extra_sheet=True),dict(malformed_axis=True),dict(extra_column=True),dict(formula=True)):
            with self.subTest(case=kwargs):
                raw = ap_fixture(**kwargs)
                payload = dict(name="Malformed AP.xlsx",format="xlsx",contentBase64=base64.b64encode(raw).decode())
                before = self.state()
                self.api("POST", "/api/import/preview", payload, status=400)
                self.assertEqual(self.state(), before)
                self.api("POST", "/api/import", payload, status=400)
                self.assertEqual(self.state(), before)

    def assert_real_ap_file_fidelity(self, path, counts, zero_counts):
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        mtime = path.stat().st_mtime_ns
        expected = independently_read_ap_workbook(path)
        self.assertEqual([len(s["values"]) for s in expected], counts)
        self.assertEqual([sum(y == 0 for _,y in s["values"]) for s in expected], zero_counts)
        before = self.state()
        payload = dict(name=path.name,format="xlsx",unit="Value",contentBase64=base64.b64encode(raw).decode())
        preview = self.api("POST", "/api/import/preview", payload)
        self.assertEqual(self.state(), before)
        self.assertEqual(preview["formatDetected"], "audio-precision-xlsx")
        self.assertEqual(preview["sha256"], digest)
        self.assertEqual([c["pointCount"] for c in preview["charts"]], counts)
        self.assertEqual([s["worksheet"] for s in preview["skippedSheets"]], ["Summary"])
        self.assertIn("N/A", json.dumps(preview["skippedSheets"][0]["metadata"]))
        imported = self.api("POST", "/api/import", payload, status=201)
        self.assertEqual(imported["source"]["sha256"], digest)
        self.assertEqual(len(imported["charts"]), len(expected))
        for item,source in zip(imported["charts"],expected):
            chart = self.api("GET", "/api/charts/"+item["id"])
            self.assertEqual(chart["title"], source["title"])
            self.assertEqual(chart["series"][0]["name"], source["channel"])
            self.assertTrue(chart["series"][0]["values"] == source["values"],
                            "All original numeric pairs, zeros and blanks must be preserved exactly")
            self.assertEqual(chart["sourceUnit"], source["sourceUnit"])
            self.assertEqual(chart["unit"], "dB SPL" if source["sourceUnit"] == "dBSPL1" else source["sourceUnit"])
            self.assertEqual(chart["processing"], "AP-provided smoothed" if "-> Smooth" in source["title"] else "raw")
            self.assertEqual(chart["testDate"], "")
            self.assertEqual(chart["provenance"]["worksheet"], source["worksheet"])
            self.assertEqual(chart["provenance"]["measurementTitle"], source["title"])
            self.assertTrue(chart["provenance"]["sourceRows"] == source["sourceRows"])
        code,headers,download = self.request("GET", "/api/sources/"+imported["source"]["id"]+"/download")
        self.assertEqual(code,200)
        self.assertEqual(hashlib.sha256(download).hexdigest(),digest)
        self.assertIn("filename*=UTF-8''",headers["Content-Disposition"])
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),digest)
        self.assertEqual(path.stat().st_mtime_ns,mtime)

    @unittest.skipUnless(Path("/Users/peter/Downloads/5G-01-AP--1m-消声室数据.xlsx").is_file(),
                         "Optional real AP01 workbook is not available on this computer")
    def test_28_real_ap01_source_fidelity(self):
        self.assert_real_ap_file_fidelity(Path("/Users/peter/Downloads/5G-01-AP--1m-消声室数据.xlsx"),
                                          [1734,500,1300],[0,0,109])

    @unittest.skipUnless(Path("/Users/peter/Downloads/5G-02-AP-1m消声室数据.xlsx").is_file(),
                         "Optional real AP02 workbook is not available on this computer")
    def test_29_real_ap02_source_fidelity(self):
        self.assert_real_ap_file_fidelity(Path("/Users/peter/Downloads/5G-02-AP-1m消声室数据.xlsx"),
                                          [1661,500,1346,1520],[0,0,152,57])

    def test_30_generic_preview_preserves_state(self):
        for fmt,raw,detected in (("csv",b"Frequency,Value\n100,2\n","csv"),
                                 ("xlsx",xlsx_fixture(),"generic-xlsx"),
                                 ("json",b'{"series":[{"values":[[100,2]]}]}',"json")):
            before = self.state()
            preview = self.api("POST", "/api/import/preview",dict(name="Preview."+fmt,format=fmt,
                               contentBase64=base64.b64encode(raw).decode()))
            self.assertEqual(preview["formatDetected"],detected)
            self.assertEqual(self.state(),before)

    def test_31_small_vrms_report_uses_visible_data_extent(self):
        values = [[100,.0004526],[200,.000453],[300,.0004528]]
        raw = json.dumps(dict(unit="Vrms",series=[dict(name="AP-like voltage",values=values)])).encode()
        imported = self.import_file("QA tiny voltage.json",raw,"json")
        chart_id = imported["charts"][0]["id"]
        report = self.api("POST", "/api/reports", {"chartId":chart_id}, status=201)
        code,_,body = self.request("GET", "/api/reports/"+report["id"]+"/download")
        self.assertEqual(code,200)
        markup = re.search(r"(<svg\b.*?</svg>)",body.decode(),re.S)
        self.assertIsNotNone(markup)
        svg = ET.fromstring(markup.group(1))
        data_lines = [line for line in svg.iter("polyline") if line.get("stroke") == "#7047eb"]
        self.assertEqual(len(data_lines),1)
        coordinates = [tuple(map(float,p.split(","))) for p in data_lines[0].get("points").split()]
        ys = [p[1] for p in coordinates]
        self.assertGreater(max(ys)-min(ys),250,"Sub-unit voltage range must not be flattened into a forced one-volt axis")
        self.assertTrue(self.api("GET", "/api/reports/"+report["id"])["chart"]["series"][0]["values"] == values)


if __name__ == "__main__":
    unittest.main()
