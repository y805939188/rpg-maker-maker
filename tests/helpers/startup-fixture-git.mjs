import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

const name = 'Synthetic Startup Fixture';
const email = 'startup-fixture@example.invalid';

export function startupFixtureEnvironment(input = process.env) {
  return {
    ...Object.fromEntries(
      ['PATH', 'HOME', 'TMPDIR']
        .filter((key) => input[key] !== undefined)
        .map((key) => [key, input[key]]),
    ),
    TILESET_AI_MODE: 'mock',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
    GIT_AUTHOR_DATE: '2000-01-01T00:00:00 +0000',
    GIT_COMMITTER_DATE: '2000-01-01T00:00:00 +0000',
  };
}

export function fixtureGit(root, environment, args) {
  return execFileSync(
    'git',
    [
      '-C',
      root,
      '-c',
      `core.hooksPath=${resolve(root, '.git-fixture-hooks')}`,
      '-c',
      'commit.gpgSign=false',
      '-c',
      'tag.gpgSign=false',
      ...args,
    ],
    {
      cwd: root,
      env: environment,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}

export async function initializeFixtureGit(root, environment) {
  const canonicalRoot = await realpath(root);
  const hooks = resolve(root, '.git-fixture-hooks');
  const template = resolve(root, '.git-fixture-template');
  await mkdir(hooks);
  await mkdir(template);
  fixtureGit(root, environment, [
    'init',
    '--quiet',
    '--initial-branch=startup-fixture',
    `--template=${template}`,
  ]);
  fixtureGit(root, environment, [
    'commit',
    '--quiet',
    '--allow-empty',
    '--no-gpg-sign',
    '-m',
    'Synthetic fixture baseline',
  ]);
  const top = await realpath(fixtureGit(root, environment, ['rev-parse', '--show-toplevel']));
  const gitDirectory = await realpath(
    fixtureGit(root, environment, ['rev-parse', '--absolute-git-dir']),
  );
  const head = fixtureGit(root, environment, ['rev-parse', '--verify', 'HEAD^{commit}']);
  assert.equal(top, canonicalRoot);
  assert.equal(gitDirectory, resolve(canonicalRoot, '.git'));
  assert.ok((await lstat(resolve(root, '.git'))).isDirectory());
  assert.match(head, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  assert.equal(fixtureGit(root, environment, ['cat-file', '-t', head]), 'commit');
  const identity = fixtureGit(root, environment, [
    'show',
    '-s',
    '--format=%an <%ae>%n%cn <%ce>',
    'HEAD',
  ]);
  assert.equal(identity, `${name} <${email}>\n${name} <${email}>`);
  assert.equal(fixtureGit(root, environment, ['remote']), '');
  const proof = {
    root: canonicalRoot,
    top,
    gitDirectory,
    head,
    objectType: 'commit',
    identity,
    remoteCount: 0,
  };
  console.log('[startup-fixture-git] ' + JSON.stringify(proof));
  return proof;
}
