#!/usr/bin/env python3
"""Build the offline workspace as one HTML, with an optional private seed."""
from pathlib import Path
import argparse
import base64
import json
import re

ROOT = Path(__file__).resolve().parents[1]
NAME = 'CRY7574 Hearing Aid Box Measurement Manage Software.html'


def empty_workspace():
    """A public release starts with one destination library and no user records."""
    return {
        'version': 1,
        'appName': 'CRY7574 Hearing Aid Box Measurement Manage Software',
        'settings': {'decimalPlaces': 'auto'},
        'libraries': [{
            'id': 'library-imports',
            'name': 'Measurements',
            'description': '',
            'purpose': 'measurements',
            'createdAt': 'Default collection',
        }],
        **{key: [] for key in (
            'charts', 'sources', 'tasks', 'reports', 'activity', 'groups',
            'comparisons', 'environmentMedia', 'specifications',
        )},
    }


def inline(code):
    return re.sub(r'</script', r'<\\/script', code, flags=re.I).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--empty', action='store_true', help='Build without any private seed or bundled measurements.')
    parser.add_argument('--output', type=Path, help='Output HTML path (default: project-root software HTML).')
    args = parser.parse_args()
    seed_path = ROOT / 'portable/seed.json'
    if args.empty or not seed_path.is_file():
        seed = empty_workspace()
        mode = 'empty workspace'
    else:
        seed = json.loads(seed_path.read_text(encoding='utf-8'))
        mode = 'private seed snapshot'
    seed_json = json.dumps(seed, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    html = (ROOT / 'portable/workspace.html').read_text(encoding='utf-8')
    logo = (ROOT / 'portable/assets/crysound-logo.png').read_bytes()
    html = html.replace('__CRYSOUND_LOGO__', 'data:image/png;base64,' + base64.b64encode(logo).decode('ascii'))
    html = html.replace('<!--WORKSPACE_STYLE-->', '<style>' + (ROOT / 'portable/workspace.css').read_text(encoding='utf-8') + '</style>')
    scripts = '<script type="application/json" id="portable-seed">' + seed_json + '</script>'
    for name in ['display.js', 'appearance.js', 'limits.js', 'runtime.js', 'axis-ticks.js', 'axis-inputs.js', 'plot.js', 'workspace-tools.js', 'workspace-exports.js', 'comparisons.js', 'environment-media.js', 'specifications.js', 'workspace.js']:
        scripts += '<script>' + inline((ROOT / 'portable' / name).read_text(encoding='utf-8')) + '</script>'
    html = html.replace('<!--WORKSPACE_SCRIPTS-->', scripts)
    output = args.output.expanduser() if args.output else ROOT / NAME
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(output.resolve())
    print(f'{output.stat().st_size:,} bytes; {mode}; standalone offline workspace')


if __name__ == '__main__':
    main()
