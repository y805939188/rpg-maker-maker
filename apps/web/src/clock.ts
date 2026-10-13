/** 60 fixed logical updates/s; RAF only supplies elapsed time. Pause/hidden discards wall time. */
export class LogicalClock {
  updates = 0;
  private fraction = 0;
  private last: number | undefined;
  playing = false;
  constructor(
    readonly updatesPerState: number,
    readonly sequence: readonly number[],
  ) {}
  get state() {
    return Math.floor(this.updates / this.updatesPerState) % this.sequence.length;
  }
  get sourceFrame() {
    return this.sequence[this.state]!;
  }
  play() {
    this.playing = true;
    this.last = undefined;
  }
  pause() {
    this.playing = false;
    this.last = undefined;
  }
  suspend() {
    this.last = undefined;
  }
  sample(now: number) {
    if (!this.playing) {
      this.last = undefined;
      return;
    }
    if (this.last !== undefined) {
      this.fraction += (Math.max(0, Math.min(now - this.last, 250)) * 60) / 1000;
      const ticks = Math.floor(this.fraction + 1e-8);
      this.fraction -= ticks;
      this.updates += ticks;
    }
    this.last = now;
  }
  step() {
    this.pause();
    this.fraction = 0;
    this.updates = (Math.floor(this.updates / this.updatesPerState) + 1) * this.updatesPerState;
  }
  select(state: number) {
    this.pause();
    this.fraction = 0;
    this.updates = state * this.updatesPerState;
  }
}
