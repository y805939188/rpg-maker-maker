import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import zipfile

work = pathlib.Path(sys.argv[1]).resolve()
repo = pathlib.Path(sys.argv[2]).resolve()
template = pathlib.Path(sys.argv[3]).resolve()
node = '/Users/dingshinn/.nvm/versions/node/v22.21.1/bin/node'
build_id = 'step01-ffc5300c7fb2cb94a48a'
target = '301d3cdb37743a53eff6046ccf2b23aea0ab8122'
build = repo / 'artifacts' / build_id
prepared = repo / '.local/mz' / build_id
sha = lambda b: hashlib.sha256(b).hexdigest()
tree = lambda p: {str(f.relative_to(p)): sha(f.read_bytes()) for f in sorted(p.rglob('*')) if f.is_file()}
manifest_bytes = (build / 'manifest.json').read_bytes()
manifest = json.loads(manifest_bytes)
assert manifest['commit'] == target
assert sha(manifest_bytes) == '211790adf8aa421df3c0d525653141dbb4f545ddf1e9e83001199124e22c110a'
for name, digest in manifest['files'].items():
    assert sha((build / name).read_bytes()) == digest
    assert sha((prepared / 'img/tilesets' / name).read_bytes()) == digest
for name, digest in manifest['sources'].items():
    assert sha((work / 'tests/fixtures' / name).read_bytes()) == digest
assert sha((work / 'pnpm-lock.yaml').read_bytes()) == manifest['lockSha256']
for name, digest in json.loads((prepared / 'step01-build-reference.json').read_text())['coreFiles'].items():
    assert sha((prepared / 'js' / name).read_bytes()) == digest == sha((template / 'js' / name).read_bytes())
archive = repo / '.local/delivery' / (build_id + '-acceptance.zip')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    zip_count = len(z.infolist())
assert sha(archive.read_bytes()) == '4fbe16d13479a2f1011dbc1e30e65dca945c9a03d3f18369dd4532296428f076'
before = tree(prepared)
repeat = subprocess.run([node, str(work / 'dist/scripts/prepare-mz.js'), str(template), str(build)], cwd=repo, capture_output=True, text=True)
assert repeat.returncode != 0 and 'EEXIST' in repeat.stderr
assert before == tree(prepared)
local_build = work / 'artifacts' / build_id
local_before = tree(local_build)
rebuilds = []
for _ in range(3):
    repeated = subprocess.run([node, str(work / 'dist/scripts/build-prototype.js')], cwd=work, capture_output=True, text=True)
    assert repeated.returncode != 0 and 'Immutable build already exists' in repeated.stderr
    assert local_before == tree(local_build)
    rebuilds.append(repeated.returncode)
assert not list((work / 'artifacts').glob('.lock-*'))
assert not list((work / 'artifacts').glob('.stage-*'))
with tempfile.TemporaryDirectory(prefix='tileset-independent-review-') as tmp:
    temporary = pathlib.Path(tmp)
    altered = temporary / 'altered-build'
    shutil.copytree(build, altered)
    changed = json.loads(manifest_bytes)
    del changed['files']['diagnostic_A2.png']
    (altered / 'diagnostic_A2.png').unlink()
    (altered / 'manifest.json').write_text(json.dumps(changed, indent=2) + '\n')
    child = subprocess.run([node, str(work / 'dist/scripts/prepare-mz.js'), str(template), str(altered)], cwd=temporary, capture_output=True, text=True)
    project = temporary / '.local/mz' / build_id
    tilesets = json.loads((project / 'data/Tilesets.json').read_text())
    refers = tilesets[1]['tilesetNames'][1]
    absent = not (project / 'img/tilesets/diagnostic_A2.png').exists()
    assert child.returncode == 0 and refers == 'diagnostic_A2' and absent
    counterexample = {'childExitCode': child.returncode, 'reportedBuildId': json.loads(child.stdout)['buildId'], 'referencedA2': refers, 'referencedFileMissing': absent, 'bugReproduced': True}
report = {
    'targetCommit': target, 'buildId': build_id,
    'scope': 'Read-only canonical package audit, expected refusal checks, temporary altered-manifest counterexample; no MZ GUI run',
    'manifestSha256': sha(manifest_bytes), 'outputHashes': manifest['files'],
    'sourcesVerified': len(manifest['sources']), 'coreFilesVerified': 6,
    'zipSha256': sha(archive.read_bytes()), 'zipEntries': zip_count, 'zipBytes': archive.stat().st_size, 'zipCRC': 'PASS',
    'existingProjectProtection': {'childExitCode': repeat.returncode, 'filesUnchanged': len(before)},
    'immutableRebuildExitCodes': rebuilds, 'immutableFilesUnchanged': len(local_before),
    'missingManifestFileCounterexample': counterexample,
    'editorDrawing': 'NOT_EXECUTED', 'gameRuntime': 'NOT_EXECUTED',
}
(work / '.local/package-review-result.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
