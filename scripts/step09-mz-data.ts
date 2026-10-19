import { strict as assert } from 'node:assert';

/** Explicit data preparation for the pinned 1.10.0 native core, not a core patch. */
export function prepareStep09System(value: unknown, engineVersion: string) {
  assert.equal(engineVersion, '1.10.0', 'MZ_TEMPLATE_VERSION_UNSUPPORTED');
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'MZ_TEMPLATE_SYSTEM');
  const system = structuredClone(value) as Record<string, unknown>;
  const advanced = system['advanced'];
  assert.ok(
    advanced && typeof advanced === 'object' && !Array.isArray(advanced),
    'MZ_TEMPLATE_ADVANCED',
  );
  const settings = advanced as Record<string, unknown>;
  const normalizations: string[] = [];
  if (settings['windowOpacity'] === undefined) {
    // Explicit preparation value, matching the editor-saved native baseline.
    // 1.10.0 Game_System.windowOpacity reads this field without a fallback.
    settings['windowOpacity'] = 192;
    normalizations.push('mz-1.10.0-window-opacity-default-v1');
  }
  assert.ok(
    Number.isInteger(settings['windowOpacity']) &&
      Number(settings['windowOpacity']) >= 0 &&
      Number(settings['windowOpacity']) <= 255,
    'MZ_TEMPLATE_WINDOW_OPACITY',
  );
  return { system, normalizations };
}
