import { campusParts, campusTimestamp } from './time';

/**
 * Simulation clock. In "real" mode it follows wall time. In "demo" mode an admin can
 * jump to any weekday/time (e.g. Wednesday 12:20) and run it faster than real time,
 * so lunch peaks and class changes can be shown at any hour of the hackathon.
 */
export class SimClock {
  private anchorReal = Date.now();
  private anchorSim = Date.now();
  private rate = 1;
  private mode: 'real' | 'demo' = 'real';

  now(): Date {
    return new Date(this.nowMs());
  }

  nowMs(): number {
    return this.anchorSim + (Date.now() - this.anchorReal) * this.rate;
  }

  set(opts: { dow?: number; minuteOfDay?: number; rate?: number }) {
    const current = this.nowMs();
    const p = campusParts(current);
    const dow = opts.dow ?? p.dow;
    const minute = opts.minuteOfDay ?? p.minuteOfDay;
    this.anchorSim = campusTimestamp(current, dow, minute);
    this.anchorReal = Date.now();
    if (opts.rate !== undefined) this.rate = Math.max(0, Math.min(120, opts.rate));
    this.mode = 'demo';
  }

  setRate(rate: number) {
    this.anchorSim = this.nowMs();
    this.anchorReal = Date.now();
    this.rate = Math.max(0, Math.min(120, rate));
    if (rate !== 1) this.mode = 'demo';
  }

  reset() {
    this.anchorReal = Date.now();
    this.anchorSim = Date.now();
    this.rate = 1;
    this.mode = 'real';
  }

  info() {
    const ms = this.nowMs();
    const p = campusParts(ms);
    return { mode: this.mode, rate: this.rate, simTime: new Date(ms).toISOString(), ...p };
  }
}

export const simClock = new SimClock();
