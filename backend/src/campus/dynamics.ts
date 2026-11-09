/**
 * Shared campus crowd dynamics.
 *
 * The SAME functions drive (a) the live IoT simulation, (b) the ML training-data generator,
 * (c) the what-if simulator and (d) the energy planner — so the model is trained on the
 * behaviour it is later asked to forecast.
 *
 * Occupancy of a space = a time-of-day baseline + students routed there by the timetable
 * (people released from classes, with walking ramp and a typical dwell time). Classrooms and
 * seminar halls are driven directly by the scheduled enrollment.
 */
import { Timetable, sessionsForDay } from './timetable';

export interface ResLite {
  id?: string;
  code: string;
  type: string;
  capacity: number;
  isAvailable?: boolean;
}

export type Group = 'study' | 'lab' | 'research' | 'food' | 'activity' | 'teaching';

export const GROUP_OF: Record<string, Group> = {
  LIBRARY: 'study',
  STUDY_ROOM: 'study',
  COMPUTER_LAB: 'lab',
  RESEARCH_LAB: 'research',
  CANTEEN: 'food',
  ACTIVITY_CENTER: 'activity',
  CLASSROOM: 'teaching',
  SEMINAR_HALL: 'teaching',
};
export const groupOf = (type: string): Group => GROUP_OF[type] ?? 'study';

const HOURLY: Record<string, number[]> = {
  LIBRARY: [5, 5, 5, 5, 5, 8, 15, 28, 45, 58, 65, 72, 78, 75, 70, 78, 82, 76, 68, 55, 42, 30, 18, 8],
  COMPUTER_LAB: [3, 3, 3, 3, 3, 5, 12, 35, 58, 72, 82, 88, 84, 78, 82, 86, 80, 68, 52, 38, 24, 12, 5, 3],
  STUDY_ROOM: [3, 3, 3, 3, 3, 5, 10, 20, 35, 42, 48, 55, 58, 52, 48, 55, 62, 60, 54, 42, 32, 22, 12, 5],
  CANTEEN: [5, 5, 5, 5, 5, 8, 15, 55, 80, 72, 85, 92, 95, 88, 72, 65, 58, 55, 65, 72, 52, 35, 18, 8],
  SEMINAR_HALL: [3, 3, 3, 3, 3, 5, 8, 15, 25, 35, 40, 42, 38, 32, 30, 28, 25, 18, 12, 8, 5, 3, 3, 3],
  CLASSROOM: [3, 3, 3, 3, 3, 5, 10, 30, 55, 72, 80, 82, 78, 72, 68, 75, 70, 52, 38, 22, 12, 5, 3, 3],
  RESEARCH_LAB: [3, 3, 3, 3, 3, 5, 8, 18, 32, 45, 55, 60, 58, 55, 58, 62, 60, 55, 48, 38, 28, 18, 10, 5],
  ACTIVITY_CENTER: [3, 3, 3, 3, 3, 5, 8, 15, 25, 35, 42, 48, 52, 55, 52, 55, 58, 62, 65, 60, 52, 42, 28, 12],
};

// Fraction of the hourly pattern that is "walk-in" demand (the rest comes from the timetable).
const BASE_SCALE: Record<Group, number> = { study: 0.55, lab: 0.3, research: 0.8, food: 0.45, activity: 0.7, teaching: 0.06 };

// Where students go right after a class ends (normal break vs lunch break).
const RELEASE_SHARE: Record<Exclude<Group, 'teaching'>, { normal: number; lunch: number }> = {
  study: { normal: 0.28, lunch: 0.1 },
  lab: { normal: 0.08, lunch: 0.04 },
  research: { normal: 0.03, lunch: 0.02 },
  food: { normal: 0.13, lunch: 0.55 },
  activity: { normal: 0.06, lunch: 0.08 },
};
const DWELL_MIN: Record<Exclude<Group, 'teaching'>, number> = { study: 75, lab: 60, research: 90, food: 28, activity: 45 };
const WALK_MIN = 6;
export const ATTENDANCE = 0.85;

// Some spaces attract more than their capacity share (e.g. the main library).
const ATTRACTION: Record<string, number> = { 'LIB-MAIN': 1.6, 'SR-02': 0.8 };

const isLunchEnd = (end: number) => end >= 760 && end <= 790; // 12:40 – 13:10

export function baseProfilePct(type: string, minuteOfDay: number, isWeekend: boolean): number {
  const p = HOURLY[type] || HOURLY.LIBRARY;
  const m = Math.max(0, Math.min(1439, minuteOfDay));
  const h = Math.floor(m / 60);
  const frac = (m % 60) / 60;
  let v = p[h] * (1 - frac) + p[(h + 1) % 24] * frac;
  if (isWeekend && ['LIBRARY', 'COMPUTER_LAB', 'CLASSROOM', 'SEMINAR_HALL'].includes(type)) v *= 0.55;
  return v;
}

export interface DayPressure {
  /** extra people per group at each minute, campus-wide */
  groupExtra: Record<Exclude<Group, 'teaching'>, Float32Array>;
  /** scheduled attendees per teaching room at each minute */
  roomScheduled: Record<string, Float32Array>;
  /** students released from class at each minute */
  released: Float32Array;
}

const pressureCache = new Map<string, DayPressure>();

export function computeDayPressure(tt: Timetable, dow: number, attendance = ATTENDANCE): DayPressure {
  const key = `${tt.version}|${dow}|${attendance}`;
  const cached = pressureCache.get(key);
  if (cached) return cached;

  const mk = () => new Float32Array(1440);
  const groupExtra = { study: mk(), lab: mk(), research: mk(), food: mk(), activity: mk() };
  const roomScheduled: Record<string, Float32Array> = {};
  const released = mk();

  for (const s of sessionsForDay(tt, dow)) {
    const people = s.enrollment * attendance;
    const room = (roomScheduled[s.roomCode] ??= mk());
    for (let m = Math.max(0, s.start - 8); m < Math.min(1440, s.end + 3); m++) {
      let f = 1;
      if (m < s.start) f = (m - (s.start - 8)) / 8; // arriving
      else if (m >= s.end) f = 1 - (m - s.end + 1) / 4; // leaving
      room[m] += people * Math.max(0, f);
    }
    if (s.end < 1440) released[s.end] += people;

    const lunch = isLunchEnd(s.end);
    for (const g of Object.keys(groupExtra) as (keyof typeof groupExtra)[]) {
      const share = lunch ? RELEASE_SHARE[g].lunch : RELEASE_SHARE[g].normal;
      const dwell = DWELL_MIN[g] * (lunch && g === 'food' ? 1.25 : 1);
      const arr = groupExtra[g];
      const horizon = Math.min(1440, s.end + Math.round(dwell * 4));
      for (let m = s.end; m < horizon; m++) {
        const since = m - s.end;
        const ramp = Math.min(1, since / WALK_MIN);
        arr[m] += people * share * ramp * Math.exp(-since / dwell);
      }
    }
  }

  const result = { groupExtra, roomScheduled, released };
  if (pressureCache.size > 64) pressureCache.clear();
  pressureCache.set(key, result);
  return result;
}

export type GroupCaps = Record<Group, number>;

export function groupCapacities(resources: ResLite[]): GroupCaps {
  const caps: GroupCaps = { study: 0, lab: 0, research: 0, food: 0, activity: 0, teaching: 0 };
  for (const r of resources) {
    if (r.isAvailable === false) continue;
    caps[groupOf(r.type)] += r.capacity * (ATTRACTION[r.code] ?? 1);
  }
  return caps;
}

/** People attributable to the timetable for this resource at this minute. */
export function timetablePeople(r: ResLite, minuteOfDay: number, pressure: DayPressure, caps: GroupCaps): number {
  if (r.isAvailable === false) return 0;
  const m = Math.max(0, Math.min(1439, Math.round(minuteOfDay)));
  const g = groupOf(r.type);
  const scheduled = pressure.roomScheduled[r.code]?.[m] ?? 0; // timetabled class/lab in this room
  if (g === 'teaching') return scheduled;
  const total = pressure.groupExtra[g][m];
  const share = caps[g] > 0 ? (r.capacity * (ATTRACTION[r.code] ?? 1)) / caps[g] : 0;
  return total * share + scheduled;
}

/** Expected (noise-free) target headcount for a resource. */
export function targetPeople(
  r: ResLite,
  minuteOfDay: number,
  isWeekend: boolean,
  pressure: DayPressure,
  caps: GroupCaps,
  dayFactor = 1
): number {
  if (r.isAvailable === false) return 0;
  const g = groupOf(r.type);
  const m = Math.max(0, Math.min(1439, Math.round(minuteOfDay)));
  // While a class/lab is timetabled in this room, walk-in use is mostly displaced
  const classInRoom = (pressure.roomScheduled[r.code]?.[m] ?? 0) > 0;
  const walkIn = classInRoom && g !== 'teaching' ? 0.25 : 1;
  const base = (baseProfilePct(r.type, minuteOfDay, isWeekend) / 100) * r.capacity * BASE_SCALE[g] * dayFactor * walkIn;
  const tt = timetablePeople(r, minuteOfDay, pressure, caps) * (g === 'teaching' ? 1 : dayFactor);
  return Math.max(0, Math.min(r.capacity * 0.98, base + tt));
}

/** Seasonal baseline (what "a typical day at this hour" looks like) as a % — used as an ML feature. */
export function baselinePct(r: ResLite, minuteOfDay: number, isWeekend: boolean): number {
  return baseProfilePct(r.type, minuteOfDay, isWeekend) * BASE_SCALE[groupOf(r.type)];
}

const TAU_MIN = 6;
/** First-order lag toward target + scaled noise. `gauss` returns N(0,1). */
export function stepOccupancy(current: number, target: number, dtMin: number, capacity: number, gauss: () => number = () => 0): number {
  const alpha = 1 - Math.exp(-Math.max(0, dtMin) / TAU_MIN);
  const noise = gauss() * capacity * 0.012 * Math.sqrt(Math.min(1, dtMin));
  return Math.max(0, Math.min(capacity, current + (target - current) * alpha + noise));
}

/** Deterministic per-day demand factor (0.9 – 1.1) so a given date always behaves the same. */
export function dayFactorFor(dateKey: string): number {
  let h = 2166136261;
  for (const c of dateKey) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 0.9 + ((h >>> 0) % 1000) / 5000;
}

export function gaussian(rand: () => number = Math.random): number {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Expected occupancy % series for a whole day (noise-free), used by what-if and energy.
 * Returns per-resource arrays sampled every `stepMin` minutes from `from` to `to`.
 */
export function expectedDaySeries(
  resources: ResLite[],
  tt: Timetable,
  dow: number,
  opts: { from?: number; to?: number; stepMin?: number; attendance?: number } = {}
): { minutes: number[]; series: Record<string, number[]> } {
  const from = opts.from ?? 420;
  const to = opts.to ?? 1260;
  const step = opts.stepMin ?? 10;
  const isWeekend = dow === 0 || dow === 6;
  const pressure = computeDayPressure(tt, dow, opts.attendance ?? ATTENDANCE);
  const caps = groupCapacities(resources);
  const minutes: number[] = [];
  for (let m = from; m <= to; m += step) minutes.push(m);

  const series: Record<string, number[]> = {};
  for (const r of resources) {
    let occ = targetPeople(r, from - 60, isWeekend, pressure, caps);
    for (let m = from - 60; m < from; m++) occ = stepOccupancy(occ, targetPeople(r, m, isWeekend, pressure, caps), 1, r.capacity);
    const out: number[] = [];
    let m = from;
    for (const sample of minutes) {
      for (; m < sample; m++) occ = stepOccupancy(occ, targetPeople(r, m, isWeekend, pressure, caps), 1, r.capacity);
      out.push(Math.round((occ / r.capacity) * 1000) / 10);
    }
    series[r.code] = out;
  }
  return { minutes, series };
}
