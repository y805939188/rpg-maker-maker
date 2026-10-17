import { runStep08Real } from '../apps/api/dist/step08-real.js';
import { PROFILE } from '../dist/src/profile.js';
if (process.argv.length !== 4 || process.argv[2] !== '--provider-env') {
  console.error('Use pnpm test:step08:real --provider-env /absolute/private/provider.env');
  process.exitCode = 1;
} else {
  try {
    await runStep08Real(process.argv[3], PROFILE);
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
