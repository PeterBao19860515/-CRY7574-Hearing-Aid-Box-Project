#!/usr/bin/env python3
"""Prepare and verify one patch-version increment per published branch push."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'release-manifest.json'
DIST = 'dist/CRY7574 Hearing Aid Box Measurement Manage Software.html'
PATTERN = re.compile(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)')


def git(*args, check=True):
    return subprocess.run(['git', *args], cwd=ROOT, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def version(raw):
    value = raw.decode('utf-8').strip()
    if not PATTERN.fullmatch(value):
        raise ValueError('VERSION must be numeric major.minor.patch without leading zeros')
    return value


def default_base():
    result = git('rev-parse', '--verify', '@{upstream}', check=False)
    if result.returncode:
        raise ValueError('No upstream configured. Fetch first, then pass --base <remote-commit>.')
    return result.stdout.decode().strip()


def baseline(ref):
    git('rev-parse', '--verify', ref + '^{commit}')
    result = git('show', ref + ':VERSION', check=False)
    # The pre-versioning repository is explicitly treated as 1.0.0.
    return version(result.stdout) if not result.returncode else '1.0.0'


def next_version(ref):
    major, minor, patch = map(int, baseline(ref).split('.'))
    return f'{major}.{minor}.{patch + 1}'


def input_path(name):
    if name == 'VERSION':
        return True
    return (name.startswith('portable/') and name != 'portable/seed.json'
            and Path(name).suffix in {'.js', '.css', '.html', '.py', '.png'}) or (
            name.startswith('mcp/') and Path(name).suffix == '.mjs')


class Reader:
    def __init__(self, commit=None):
        self.commit = commit

    def read(self, name):
        return git('show', self.commit + ':' + name).stdout if self.commit else (ROOT / name).read_bytes()

    def inputs(self):
        if self.commit:
            names = git('ls-tree', '-r', '--name-only', self.commit).stdout.decode().splitlines()
        else:
            names = ['VERSION'] + [str(p.relative_to(ROOT)) for directory in ['portable', 'mcp']
                                  for p in (ROOT / directory).rglob('*') if p.is_file()]
        return sorted(name for name in names if input_path(name))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def make_manifest(reader):
    return {'version': version(reader.read('VERSION')),
            'distribution': {'path': DIST, 'sha256': digest(reader.read(DIST))},
            'inputs': {name: digest(reader.read(name)) for name in reader.inputs()}}


def verify(base, commit=None):
    reader = Reader(commit)
    actual, expected = version(reader.read('VERSION')), next_version(base)
    if actual != expected:
        raise ValueError(f'Push requires V{expected}; found V{actual}. Run release.py prepare after fetching.')
    recorded = json.loads(reader.read(MANIFEST))
    if recorded != make_manifest(reader):
        raise ValueError('Release inputs or distribution changed after preparation. Run release.py prepare again.')
    html = reader.read(DIST).decode('utf-8')
    if f'name="app-version" content="{actual}"' not in html or html.count('V' + actual) < 2:
        raise ValueError('Distribution version metadata/header/footer is stale')
    return actual


def prepare(base):
    expected = next_version(base)
    current = version((ROOT / 'VERSION').read_bytes()) if (ROOT / 'VERSION').exists() else baseline(base)
    if current not in {baseline(base), expected}:
        raise ValueError(f'Unexpected local V{current}; expected baseline V{baseline(base)} or prepared V{expected}')
    (ROOT / 'VERSION').write_text(expected + '\n', encoding='utf-8')
    # Repeating a failed release preparation is idempotent: the same remote base gives the same patch.
    subprocess.run([sys.executable, str(ROOT / 'portable/build_portable.py')], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(ROOT / 'portable/build_portable.py'), '--empty', '--output',
                    str(ROOT / DIST)], cwd=ROOT, check=True)
    (ROOT / MANIFEST).write_text(json.dumps(make_manifest(Reader()), indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return verify(base)


def pre_push():
    for line in sys.stdin:
        fields = line.split()
        if len(fields) != 4:
            raise ValueError('Invalid Git pre-push input')
        local_ref, local_sha, remote_ref, remote_sha = fields
        if set(local_sha) == {'0'} or not remote_ref.startswith('refs/heads/'):
            continue
        base = default_base() if set(remote_sha) == {'0'} else remote_sha
        value = verify(base, local_sha)
        print(f'CRY7574 release guard: V{value} verified for {remote_ref}', file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'check', 'pre-push'])
    parser.add_argument('--base', help='Fetched remote commit (defaults to current upstream)')
    parser.add_argument('--commit', help='Check the committed snapshot instead of working files')
    args = parser.parse_args()
    if args.action == 'pre-push':
        pre_push()
    else:
        base = args.base or default_base()
        value = prepare(base) if args.action == 'prepare' else verify(base, args.commit)
        print(f'V{value}: release {"prepared" if args.action == "prepare" else "verified"}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print('Release blocked: ' + str(error), file=sys.stderr)
        sys.exit(1)
