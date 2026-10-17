import { runStep08Real } from '../apps/api/dist/step08-real.js';
import { runStep08AdditionalEdit } from '../apps/api/dist/step08-additional-edit.js';
import { PROFILE } from '../dist/src/profile.js';
if (
  ![4, 5, 6].includes(process.argv.length) ||
  process.argv[2] !== '--provider-env' ||
  process.argv
    .slice(4)
    .some((flag) => !['--repair-png-text-metadata', '--additional-edit-size-fix'].includes(flag)) ||
  new Set(process.argv.slice(4)).size !== process.argv.slice(4).length
) {
  console.error('Use pnpm test:step08:real --provider-env /absolute/private/provider.env');
  process.exitCode = 1;
} else {
  try {
    const runner = process.argv.includes('--additional-edit-size-fix')
      ? runStep08AdditionalEdit
      : runStep08Real;
    await runner(process.argv[3], PROFILE, process.argv.includes('--repair-png-text-metadata'));
  } catch (error) {
    // Never print SDK exceptions, response bodies or private values.
    const code =
      error instanceof Error && /^[A-Z_]{3,100}$/.test(error.message)
        ? error.message
        : 'STEP08_REAL_BLOCKED';
    console.error(code);
    process.exitCode = 1;
  }
}
