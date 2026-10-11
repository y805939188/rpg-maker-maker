import { PROFILE } from './profile.js';
import { blank, copyRect, validatePixels } from './pixels.js';
import type { Pixels } from './pixels.js';

function validateSource(source: Pixels): void {
  validatePixels(source);
  if (source.width !== PROFILE.source.width || source.height !== PROFILE.source.height) {
    throw new Error('Source basic pattern must be 96×144; implicit resizing is forbidden');
  }
  for (let i = 3; i < source.data.length; i += 4) {
    if (source.data[i] !== 255) throw new Error('Baked shoreline profile requires opaque source patterns');
  }
}

/** Step-01 fixed experimental layout, NOT a Pack slot allocator or production Fragment compiler. */
export function compileFixedPrototype(ground: Pixels, water: readonly Pixels[]): { a1: Pixels; a2: Pixels } {
  if (water.length !== PROFILE.animation.sourceFrames) throw new Error('Native water requires exactly 3 source frames');
  [ground, ...water].forEach(validateSource);
  const a1 = blank(PROFILE.atlas.width, PROFILE.atlas.height);
  const a2 = blank(PROFILE.atlas.width, PROFILE.atlas.height);
  for (const slot of PROFILE.groundSlots) {
    copyRect(ground, a2, 0, 0, ground.width, ground.height, slot.x, slot.y);
  }
  for (const slot of PROFILE.waterSlots) {
    water.forEach((frame, i) => copyRect(frame, a1, 0, 0, frame.width, frame.height,
      slot.x + i * frame.width, slot.y));
  }
  return { a1, a2 };
}
