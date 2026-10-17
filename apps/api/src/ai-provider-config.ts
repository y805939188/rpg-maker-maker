import { readFile, stat } from 'node:fs/promises';
import { parse } from 'dotenv';
/** Explicit live command only. Never source/eval or install these values in process.env. */
export async function readProviderConfiguration(
  path: string,
): Promise<{ key: string; budgetUsd: number }> {
  const info = await stat(path);
  if (!info.isFile() || info.size > 8192) throw Error('PROVIDER_CONFIG_INVALID');
  const values = parse(await readFile(path));
  if (
    Object.keys(values).some(
      (key) => !['WAVESPEED_API_KEY', 'STEP08_REAL_API_TEST_BUDGET_USD'].includes(key),
    )
  )
    throw Error('PROVIDER_CONFIG_FIELDS');
  const key = values['WAVESPEED_API_KEY'];
  if (!key || !/^[A-Za-z0-9_.-]{16,512}$/.test(key)) throw Error('PROVIDER_KEY_MISSING_OR_INVALID');
  const budget = values['STEP08_REAL_API_TEST_BUDGET_USD'];
  if (
    !budget ||
    !/^\d+(\.\d{1,6})?$/.test(budget) ||
    !Number.isFinite(Number(budget)) ||
    Number(budget) <= 0
  )
    throw Error('PROVIDER_BUDGET_INVALID');
  return { key, budgetUsd: Number(budget) };
}
