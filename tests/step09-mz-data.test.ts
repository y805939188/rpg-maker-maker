import { expect, it } from 'vitest';
import { prepareStep09System } from '../scripts/step09-mz-data.js';

it('normalizes only the missing pinned native window opacity and preserves owned input', () => {
  const input = { advanced: { tileSize: 48, fontSize: 26 }, gameTitle: 'original' };
  expect(prepareStep09System(input, '1.10.0')).toEqual({
    system: { ...input, advanced: { ...input.advanced, windowOpacity: 192 } },
    normalizations: ['mz-1.10.0-window-opacity-default-v1'],
  });
  expect(input.advanced).not.toHaveProperty('windowOpacity');
  for (const windowOpacity of [0, 128, 192, 255]) {
    const value = { advanced: { windowOpacity } };
    expect(prepareStep09System(value, '1.10.0')).toEqual({ system: value, normalizations: [] });
  }
});

it('rejects incompatible data rather than declaring an unbootable preparation successful', () => {
  for (const windowOpacity of [null, '192', -1, 256, 1.5, NaN, Infinity])
    expect(() => prepareStep09System({ advanced: { windowOpacity } }, '1.10.0')).toThrow(
      'MZ_TEMPLATE_WINDOW_OPACITY',
    );
  for (const value of [null, [], {}, { advanced: [] }])
    expect(() => prepareStep09System(value, '1.10.0')).toThrow('MZ_TEMPLATE');
  expect(() => prepareStep09System({ advanced: {} }, 'other')).toThrow(
    'MZ_TEMPLATE_VERSION_UNSUPPORTED',
  );
});
