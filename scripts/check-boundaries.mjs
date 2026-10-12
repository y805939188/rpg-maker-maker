import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const rules = [
  {
    path: '.',
    allowed: [
      '@tileset/asset-core',
      '@tileset/material-processing',
      '@tileset/image-adapter',
      '@tileset/mz-compiler',
    ],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|wavespeed|@tileset\//,
  },
  {
    path: 'packages/contracts',
    allowed: [],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|sharp|wavespeed|node:/,
  },
  {
    path: 'packages/ai-gateway',
    allowed: [],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|sharp|wavespeed|node:/,
  },
  {
    path: 'packages/asset-core',
    allowed: [],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|sharp|wavespeed|node:(?!crypto$)/,
  },
  {
    path: 'packages/material-processing',
    allowed: ['@tileset/asset-core'],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|sharp|wavespeed|node:/,
  },
  {
    path: 'packages/image-adapter',
    allowed: ['@tileset/asset-core'],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|wavespeed/,
  },
  {
    path: 'packages/mz-compiler',
    allowed: ['@tileset/asset-core'],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|react|pixi\.js|sharp|wavespeed|node:/,
  },
  {
    path: 'apps/api',
    allowed: ['@tileset/contracts'],
    sources: ['src'],
    forbidden: /react|pixi\.js|sharp|wavespeed/,
  },
  {
    path: 'apps/web',
    allowed: ['@tileset/contracts'],
    sources: ['src'],
    forbidden: /@nestjs\/|@prisma\/|sharp|wavespeed|node:/,
  },
];
async function scan(directory, rule) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await scan(path, rule);
    else if (/\.tsx?$/.test(entry.name)) {
      const text = await readFile(path, 'utf8');
      const imports = [...text.matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g)];
      for (const [, specifier] of imports) {
        if (
          rule.forbidden.test(specifier) ||
          (specifier.startsWith('@tileset/') && !rule.allowed.includes(specifier)) ||
          specifier.includes('/apps/')
        )
          throw new Error(`Disallowed module dependency in ${rule.path}: ${specifier}`);
      }
    }
  }
}
for (const rule of rules) {
  const pkg = JSON.parse(await readFile(resolve(rule.path, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (name.startsWith('@tileset/')) {
      if (!rule.allowed.includes(name) || version !== 'workspace:*')
        throw new Error(`Workspace direction mismatch: ${name}`);
    } else if (!/^\d+\.\d+\.\d+$/.test(version))
      throw new Error(`Unpinned direct dependency: ${name}`);
  }
  for (const source of rule.sources) await scan(resolve(rule.path, source), rule);
}
const workspaceNames = (
  await Promise.all(
    ['apps', 'packages'].map(async (directory) =>
      (await readdir(directory, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${directory}/${entry.name}`),
    ),
  )
).flat();
if (workspaceNames.some((path) => !rules.some((rule) => rule.path === path)))
  throw new Error('Unregistered workspace: add its dependency direction before implementation.');
console.log(
  `${rules.length} workspace members: dependency directions and exact direct pins verified.`,
);
