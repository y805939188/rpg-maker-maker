import { describe, expect, it } from 'vitest';
import { animationClip, fingerprint, freezeJson, frameAt, styleProfile } from '../src/index.js';

describe('STEP03-R1-001: absence is not JSON null or an animation value', () => {
  it('rejects sparse sequence and duration arrays before freeze or selection', () => {
    const valid = {
      frameCount: 3,
      sequence: [0],
      durations: [30],
      timebase: 'updates' as const,
      loop: true,
    };
    for (const clip of [
      { ...valid, sequence: new Array<number>(1) },
      { ...valid, durations: new Array<number>(1) },
    ]) {
      expect(() => animationClip(clip)).toThrow();
      expect(() => frameAt(clip, 0)).toThrow();
    }
    expect(frameAt(animationClip(valid), 0)).toBe(0);
  });
  it('rejects holes, explicit undefined and inherited array entries without filling them', () => {
    const inherited = new Array<number>(1);
    Object.setPrototypeOf(inherited, { 0: 7 });
    const middleHole = new Array<number>(3);
    middleHole[0] = 1;
    middleHole[2] = 3;
    for (const value of [
      { list: new Array<number>(1) },
      { list: middleHole },
      { list: [undefined] },
      { nested: [{ list: new Array<number>(1) }] },
      { list: inherited },
    ]) {
      expect(() => freezeJson(value)).toThrow();
      expect(() => fingerprint(value)).toThrow();
    }
    expect(freezeJson({ list: [null] })).toEqual({ list: [null] });
    expect(fingerprint({ list: [null] })).toBe(fingerprint({ list: [null] }));
  });
  it('rejects sparse nested palette channels and outer palette arrays', () => {
    const valid = {
      logicalPixelScale: 1,
      palette: [[1, 2, 3]] as [number, number, number][],
      lighting: 'flat' as const,
      outline: 'none' as const,
    };
    const missingChannel = new Array<number>(3);
    missingChannel[0] = 1;
    missingChannel[2] = 3;
    expect(() =>
      styleProfile('style', 1, { ...valid, palette: new Array<[number, number, number]>(1) }),
    ).toThrow();
    expect(() =>
      styleProfile('style', 1, {
        ...valid,
        palette: [missingChannel as unknown as [number, number, number]],
      }),
    ).toThrow();
    expect(styleProfile('style', 1, valid).value).toEqual(valid);
  });
});
