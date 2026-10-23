#!/usr/bin/env python3
"""Exercise release guards in a temporary Git repository; never push or read user data."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
checks = []


with tempfile.TemporaryDirectory(prefix='cry7574-release-') as temporary:
    work = Path(temporary)
    shutil.copytree(ROOT / 'portable', work / 'portable', ignore=shutil.ignore_patterns('seed.json', '__pycache__'))
    shutil.copytree(ROOT / 'mcp', work / 'mcp', ignore=shutil.ignore_patterns('.local'))
    (work / 'scripts').mkdir()
    shutil.copy2(ROOT / 'scripts/release.py', work / 'scripts/release.py')
    shutil.copytree(ROOT / '.githooks', work / '.githooks')

    def command(args, ok=True, input=None):
        p = subprocess.run(args, cwd=work, input=input, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        assert (p.returncode == 0) == ok, p.stdout + p.stderr
        return p.stdout.strip()

    def git(*args):
        return command(['git', '-c', 'user.name=Release QA', '-c', 'user.email=release-fixture@example.invalid',
                        '-c', 'commit.gpgsign=false', *args])

    def release(action, base, ok=True, extra=None):
        return command([sys.executable, 'scripts/release.py', action, '--base', base, *(extra or [])], ok=ok)

    git('init')
    (work / 'README.md').write_text('Disposable legacy baseline\n')
    git('add', 'README.md')
    git('commit', '-m', 'Legacy baseline')
    baseline = git('rev-parse', 'HEAD')
    release('prepare', baseline)
    assert (work / 'VERSION').read_text().strip() == '1.0.1'
    checks.append('Legacy baseline prepares V1.0.1 and consistent artifacts')
    first_manifest = (work / 'release-manifest.json').read_bytes()
    release('prepare', baseline)
    assert (work / 'VERSION').read_text().strip() == '1.0.1'
    assert first_manifest == (work / 'release-manifest.json').read_bytes()
    checks.append('Retry preparation preserves the same version and deterministic public artifact')
    (work / 'VERSION').write_text('1.0.2\n')
    release('check', baseline, ok=False)
    checks.append('Skipped patch version is rejected')
    (work / 'VERSION').write_text('1.0.1\n')
    module = work / 'portable/plot.js'
    module.write_bytes(module.read_bytes() + b'\n// Disposable release-fixture source change.\n')
    release('check', baseline, ok=False)
    checks.append('Source change after build is rejected')
    release('prepare', baseline)
    dist = work / 'dist/CRY7574 Hearing Aid Box Measurement Manage Software.html'
    dist.write_bytes(dist.read_bytes() + b'\n')
    release('check', baseline, ok=False)
    checks.append('Distribution modification after preparation is rejected')
    release('prepare', baseline)
    git('add', '.')
    git('commit', '-m', 'Release V1.0.1')
    first_release = git('rev-parse', 'HEAD')
    release('check', baseline, extra=['--commit', first_release])
    checks.append('Prepared committed snapshot verifies against remote baseline')
    line = f'refs/heads/fixture {first_release} refs/heads/fixture {baseline}\n'
    command(['/bin/sh', '.githooks/pre-push', 'origin', 'https://example.invalid/fixture'], input=line)
    checks.append('Actual pre-push hook reads Git input and accepts exactly one increment')
    (work / 'README.md').write_text('Disposable documentation-only next push\n')
    git('add', 'README.md')
    git('commit', '-m', 'Unversioned update')
    unchanged = git('rev-parse', 'HEAD')
    command(['/bin/sh', '.githooks/pre-push', 'origin', 'https://example.invalid/fixture'], ok=False,
            input=f'refs/heads/fixture {unchanged} refs/heads/fixture {first_release}\n')
    checks.append('A later push without a new version is blocked even for documentation changes')
    release('prepare', first_release)
    assert (work / 'VERSION').read_text().strip() == '1.0.2'
    release('check', first_release)
    checks.append('Next prepared push advances to V1.0.2')
    (work / 'VERSION').write_text('V1.0.2\n')
    release('check', first_release, ok=False)
    checks.append('Malformed canonical VERSION is rejected')

print({'checks': len(checks), 'results': checks})
