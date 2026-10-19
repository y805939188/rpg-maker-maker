import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Official release archives, checked against the release's published SHA-256 manifest:
// https://github.com/rhysd/actionlint/releases/tag/v1.7.12
// No PATH-installed checker, mutable latest version, ignore flags or rule overrides.
const version = '1.7.12';
const archives = {
  darwin_arm64: {
    id: 384924893,
    sha256: 'aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f',
  },
  linux_x64: {
    id: 384924896,
    sha256: '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8',
  },
};
const root = fileURLToPath(new URL('../', import.meta.url));
const tools = resolve(root, '.local/step09-workflow-context-coding/tools');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function check() {
  const platform = `${process.platform}_${process.arch}`;
  const asset = archives[platform];
  if (!asset) throw new Error(`Unsupported actionlint platform: ${platform}`);
  const expected = asset.sha256;
  const name = `actionlint_${version}_${platform.replace('x64', 'amd64')}.tar.gz`;
  // Official public release-asset endpoint; fixed IDs, no token or user curl config.
  const url = `https://api.github.com/repos/rhysd/actionlint/releases/assets/${asset.id}`;
  const files = process.argv.slice(2);
  if (files.some((file) => file.startsWith('-')))
    throw new Error('Only workflow file paths are accepted; checker options are fixed.');
  if (!files.length) {
    const directory = resolve(root, '.github/workflows');
    files.push(
      ...(await readdir(directory))
        .filter((file) => /\.ya?ml$/.test(file))
        .sort()
        .map((file) => resolve(directory, file)),
    );
  }
  if (!files.length) throw new Error('No workflows found; validation refused.');
  await mkdir(tools, { recursive: true });
  const archive = resolve(tools, name);
  let bytes = await readFile(archive).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (!bytes) {
    bytes = execFileSync(
      '/usr/bin/curl',
      [
        '-q',
        '--fail',
        '--location',
        '--silent',
        '--show-error',
        '--max-time',
        '30',
        '--header',
        'Accept:application/octet-stream',
        url,
      ],
      { timeout: 35000, maxBuffer: 8 * 1024 * 1024 },
    );
    if (sha256(bytes) !== expected) throw new Error('actionlint download SHA-256 mismatch.');
    await writeFile(archive, bytes, { flag: 'wx', mode: 0o600 });
  }
  // Verify even existing tool archives; never execute an unchecked cached binary.
  if (sha256(bytes) !== expected) throw new Error('actionlint archive SHA-256 mismatch.');
  const temporary = await mkdtemp(resolve(tools, 'run-'));
  try {
    execFileSync('/usr/bin/tar', ['-xzf', '-', '-C', temporary, 'actionlint'], {
      input: bytes,
      timeout: 10000,
    });
    console.log(`actionlint ${version} ${name} sha256:${expected}`);
    execFileSync(
      resolve(temporary, 'actionlint'),
      files.map((file) => resolve(file)),
      {
        cwd: root,
        stdio: 'inherit',
        timeout: 60000,
      },
    );
  } finally {
    // Only this invocation's exclusive extraction directory is removed.
    await rm(temporary, { recursive: true, force: true });
  }
}

try {
  await check();
} catch (error) {
  console.error(error.message);
  process.exitCode = Number.isInteger(error.status) && error.status > 0 ? error.status : 1;
}
