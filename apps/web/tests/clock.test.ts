import { describe, it, expect } from 'vitest';
import { LogicalClock } from '../src/clock.js';
describe('fixed logical MZ preview clock', () => {
  it('crosses 30-update boundaries for multiple cycles at 60 and 120 Hz', () => {
    for (const hz of [60, 120, 144]) {
      const c = new LogicalClock(30, [0, 1, 2, 1]);
      c.play();
      c.sample(0);
      for (let i = 1; i <= hz * 4; i++) c.sample((i * 1000) / hz);
      expect(c.updates).toBe(240);
      expect(c.state).toBe(0);
      expect(c.sourceFrame).toBe(0);
    }
    const c = new LogicalClock(30, [0, 1, 2, 1]);
    c.play();
    c.sample(0);
    for (let n = 1; n <= 240; n++) {
      c.sample((n * 1000) / 60);
      expect(c.sourceFrame).toBe([0, 1, 2, 1][Math.floor(n / 30) % 4]);
    }
  });
  it('pause/resume and hidden freeze discard time; step advances a state, not a source frame', () => {
    const c = new LogicalClock(30, [0, 1, 2, 1]);
    c.play();
    c.sample(0);
    c.sample(250);
    expect(c.updates).toBe(15);
    c.pause();
    c.sample(10000);
    expect(c.updates).toBe(15);
    c.play();
    c.sample(20000);
    c.sample(20250);
    expect(c.updates).toBe(30);
    c.suspend();
    c.sample(100000);
    expect(c.updates).toBe(30);
    c.select(2);
    c.step();
    expect(c.state).toBe(3);
    expect(c.sourceFrame).toBe(1);
    c.step();
    expect(c.sourceFrame).toBe(0);
  });
});
