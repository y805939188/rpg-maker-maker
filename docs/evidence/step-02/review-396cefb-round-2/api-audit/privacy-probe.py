import pathlib, json, os, uuid, hashlib, http.client, subprocess, shutil, urllib.parse, datetime

ROOT = pathlib.Path.cwd()
COMMIT = '396cefbdef6f22783e209722155c9088e685719b'
OUTPUT = ROOT / '.local/review/round2/api-audit'
WEB_PORT = 5174
ORIGIN = 'http://127.0.0.1:' + str(WEB_PORT)
MARKER = 'ROUND2_OWNED_FAKE_CANARY_NOT_A_SECRET'
NAME = '.review-privacy-' + uuid.uuid4().hex
WEB = ROOT / 'apps/web' / NAME
PRIVATE = OUTPUT / ('private-canary-' + uuid.uuid4().hex)
BODY = json.dumps({'fakeCanary': MARKER}).encode()
RESULTS = []
OWNERSHIP = {'webFixture': str(WEB), 'privateFixture': str(PRIVATE), 'exclusivelyCreated': [], 'fakeMarkerOnly': True, 'realCredentialsReadOrRequested': False}


def record(path, origin=ORIGIN, method='GET', extra_headers=None, label=''):
    headers = {'Accept': '*/*'}
    if origin is not None:
        headers['Origin'] = origin
    if extra_headers:
        headers.update(extra_headers)
    connection = http.client.HTTPConnection('127.0.0.1', WEB_PORT, timeout=6)
    try:
        connection.request(method, path, headers=headers)
        response = connection.getresponse()
        body = response.read()
        result = {'label': label, 'path': path, 'method': method, 'origin': origin, 'requestHeaders': headers, 'status': response.status, 'accessControlAllowOrigin': response.getheader('Access-Control-Allow-Origin'), 'contentType': response.getheader('Content-Type'), 'bodyContainsFakeMarker': MARKER.encode() in body, 'bodyExactlyMatchesFakeCanary': body == BODY, 'bodySHA256': hashlib.sha256(body).hexdigest(), 'bodyBytes': len(body)}
        RESULTS.append(result)
        return result
    finally:
        connection.close()


def write_fake(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as handle:
        handle.write(BODY)
    path.chmod(0o600)


try:
    before = json.loads((OUTPUT / 'source-before.json').read_text())
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == COMMIT
    assert all(hashlib.sha256((ROOT / x['path']).read_bytes()).hexdigest() == x['sha256'] for x in before['files'])
    os.mkdir(WEB)
    OWNERSHIP['exclusivelyCreated'].append(str(WEB))
    os.mkdir(PRIVATE)
    OWNERSHIP['exclusivelyCreated'].append(str(PRIVATE))
    write_fake(PRIVATE / 'canary.json')
    os.symlink(PRIVATE, WEB / 'directory-alias', target_is_directory=True)
    os.symlink(PRIVATE / 'canary.json', WEB / 'file-alias.json')
    sensitive = ['.env.privacy-canary', 'fake.key', 'fake.pem', 'fake.crt', '.git/canary.json', '.local/nested/canary.json']
    for item in sensitive:
        write_fake(WEB / item)
    write_fake(WEB / 'public.json')
    (OUTPUT / 'probe-ownership.json').write_text(json.dumps(OWNERSHIP, indent=2) + '\n')
    aliases = [WEB / 'directory-alias/canary.json', WEB / 'file-alias.json']
    queries = ['', '?raw', '?import', '?raw&import', '?import&raw', '?url', '?url&import']
    for alias in aliases:
        absolute = str(alias)
        normal = '/' + NAME + '/' + str(alias.relative_to(WEB))
        fs = '/@fs' + absolute
        paths = [('normal-alias', normal), ('fs-alias', fs), ('wrapped-fs-alias', '/@id/' + fs), ('wrapped-absolute-alias', '/@id/' + absolute), ('encoded-fs-prefix', fs.replace('/@fs/', '/@fs%2F', 1)), ('double-encoded-fs-prefix', fs.replace('/@fs/', '/@fs%252F', 1)), ('encoded-alias-character', fs.replace('alias', '%61lias')), ('double-encoded-alias-character', fs.replace('alias', '%2561lias')), ('encoded-backslash', fs.replace('/@fs/', '/@fs%5C', 1))]
        for label, path in paths:
            for query in queries:
                record(path + query, label=label)
        for query in ['?raw&import', '?import']:
            for method, headers in [('HEAD', {}), ('GET', {'Range': 'bytes=0-1023'}), ('GET', {'Sec-Fetch-Dest': 'script'})]:
                record('/@id/' + fs + query, method=method, extra_headers=headers, label='wrapped-fs-method-variant')
    for sensitive_path in sensitive:
        file = WEB / sensitive_path
        for prefix in ['/@fs', '/@id//@fs']:
            for query in ['','?raw&import','?import','?url&import']:
                record(prefix + str(file) + query, label='default-private-protections')
    direct_private = '/@fs' + str(PRIVATE / 'canary.json')
    for path in [direct_private, direct_private.replace('/.local/', '/%2Elocal/'), direct_private.replace('/.local/', '/%252Elocal/'), direct_private.replace('/.local/', '/%2Elocal%2F')]:
        for query in ['', '?raw&import', '?import']:
            record(path + query, label='direct-private-encoding')
    for foreign in ['http://127.0.0.1:51999', 'http://localhost:51999', 'null', 'https://attacker.invalid']:
        record('/src/main.tsx', origin=foreign, label='foreign-origin-public')
        record('/@id//@fs' + str(aliases[0]) + '?raw&import', origin=foreign, label='foreign-origin-alias')
        record('/src/main.tsx', origin=foreign, method='OPTIONS', extra_headers={'Access-Control-Request-Method':'GET'}, label='foreign-preflight')
    for headers in [{'Host':'attacker.invalid'}, {'Sec-Fetch-Site':'cross-site'}, {'X-Forwarded-Host': '127.0.0.1'}, {'X-Forwarded-For':'127.0.0.1'}]:
        record('/src/main.tsx', origin=None, extra_headers=headers, label='host-fetch-forwarded')
    for path in ['/', '/src/main.tsx', '/@vite/client', '/@fs' + str(ROOT / 'packages/contracts/dist/index.js')]:
        record(path, label='normal-loading')
finally:
    for path in OWNERSHIP['exclusivelyCreated']:
        shutil.rmtree(path)
    OWNERSHIP['ownedFixturesRemoved'] = all(not pathlib.Path(path).exists() for path in OWNERSHIP['exclusivelyCreated'])
    source = json.loads((OUTPUT / 'source-before.json').read_text())
    source_after = {'allUnchanged': all(hashlib.sha256((ROOT / x['path']).read_bytes()).hexdigest() == x['sha256'] for x in source['files']), 'allMatchFrozen': all((ROOT / x['path']).read_bytes() == subprocess.check_output(['git','show',COMMIT+':'+x['path']]) for x in source['files']), 'gitStatusClean': subprocess.check_output(['git','status','--short'],text=True) == ''}
    report = {'commit': COMMIT, 'webOrigin': ORIGIN, 'probeTimestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'ownership': OWNERSHIP, 'sourceAfter': source_after, 'results': RESULTS, 'privateFakeMarkerLeaks': [r for r in RESULTS if r['bodyContainsFakeMarker']], 'candidateApproval': 'NOT_GRANTED_SUBREVIEW_ONLY'}
    (OUTPUT / 'runtime-probes.json').write_text(json.dumps(report, indent=2) + '\n')
    (OUTPUT / 'probe-ownership.json').write_text(json.dumps(OWNERSHIP, indent=2) + '\n')
    print(json.dumps({'requestCount':len(RESULTS),'fakeMarkerLeakCount':len(report['privateFakeMarkerLeaks']),'ownedFixturesRemoved':OWNERSHIP['ownedFixturesRemoved'],'sourceAfter':source_after,'leaks':report['privateFakeMarkerLeaks']}))
