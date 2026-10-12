import os, pathlib, subprocess, json, time, urllib.request, signal, socket, hashlib

root = pathlib.Path(__file__).resolve().parents[3]
out = pathlib.Path(__file__).resolve().parent
pg = pathlib.Path('/opt/homebrew/opt/postgresql@14/bin/pg_ctl')
data = root / '.local/review/pgdata'
lines = (data / 'postmaster.pid').read_text().splitlines()
assert pathlib.Path(lines[1]).resolve() == data.resolve()
assert lines[3] == '55433' and lines[5] == '127.0.0.1'
assert '14.20' in subprocess.check_output([str(pg), '--version'], text=True)
env = os.environ.copy()
env.update(NODE_ENV='production', API_HOST='127.0.0.1', API_PORT='4311', WEB_PORT='5174')
env['PATH'] = '/Users/dingshinn/.nvm/versions/node/v22.21.1/bin:' + env['PATH']
report = {'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(), 'productionArgv': ['node', 'apps/api/dist/main.js'], 'apiPort': 4311, 'databasePort': 55433, 'checks': {}, 'privateEnvironmentValuesExcluded': True}

def request(path='/api/health'):
    try:
        response = urllib.request.urlopen('http://127.0.0.1:4311' + path, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read().decode()
    return {'status': response.status, 'body': json.loads(body)}

def wait_status(expected):
    for _ in range(100):
        try:
            value = request()
            if value['status'] == expected:
                return value
        except Exception:
            pass
        time.sleep(.1)
    raise RuntimeError('Expected owned API health did not become ready')

def verify_failure(overrides):
    test_env = {**env, **overrides}
    result = subprocess.run(['node', 'apps/api/dist/main.js'], cwd=root, env=test_env, capture_output=True, timeout=20)
    text = (result.stdout + result.stderr).decode().strip()
    assert result.returncode == 1
    assert text == 'Local startup failed. Check configuration, database migrations and production build.'
    return {'environmentOverrides': overrides, 'exitCode': result.returncode, 'output': text, 'noPrivateDetails': True}

def pg_command(name):
    args = [str(pg), '-D', str(data)]
    if name == 'stop': args += ['-m', 'fast', '-w', 'stop']
    else: args += ['-l', str(out / 'owned-postgres-server.log'), '-w', 'start']
    result = subprocess.run(args, capture_output=True, timeout=20)
    with (out / 'database-lifecycle.log').open('ab') as log:
        log.write(result.stdout + result.stderr)
    assert result.returncode == 0

backend = None
db_stopped = False
log = (out / 'compiled-backend.log').open('wb')
try:
    backend = subprocess.Popen(['node', 'apps/api/dist/main.js'], cwd=root, env=env, stdout=log, stderr=log, start_new_session=True)
    report['compiledBackendPid'] = backend.pid
    report['checks']['initial'] = wait_status(200)
    listener = subprocess.check_output(['lsof', '-nP', '-a', '-p', str(backend.pid), '-iTCP:4311', '-sTCP:LISTEN'], text=True)
    assert '127.0.0.1:4311 (LISTEN)' in listener and '*:4311' not in listener
    report['listener'] = listener
    report['checks']['occupiedPort'] = verify_failure({})
    report['checks']['invalidBind'] = verify_failure({'API_HOST': '0.0.0.0'})
    report['checks']['invalidPort'] = verify_failure({'API_PORT': '5174'})
    pg_command('stop')
    db_stopped = True
    report['checks']['databaseStopped'] = wait_status(503)
    assert report['checks']['databaseStopped']['body']['error']['code'] == 'SERVICE_UNAVAILABLE'
    report['checks']['databaseUnavailableStartup'] = verify_failure({'API_PORT': '4312'})
    pg_command('start')
    db_stopped = False
    report['checks']['databaseRestarted'] = wait_status(200)
    report['checks']['projectReadsAfterRecovery'] = request('/api/projects')
    assert report['checks']['projectReadsAfterRecovery']['status'] == 200
finally:
    if db_stopped:
        pg_command('start')
    if backend and backend.poll() is None:
        os.killpg(backend.pid, signal.SIGTERM)
        try: backend.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(backend.pid, signal.SIGKILL)
            backend.wait(timeout=5)
    log.close()
    report['productionStoppedCleanly'] = backend is not None and backend.returncode == 0
    (out / 'runtime-faults.json').write_text(json.dumps(report, indent=2) + '\n')
assert report['productionStoppedCleanly']
print(json.dumps({'commit': report['commit'], 'checks': {k:v['status'] if 'status' in v else v['exitCode'] for k,v in report['checks'].items()}, 'productionStoppedCleanly': True}))
