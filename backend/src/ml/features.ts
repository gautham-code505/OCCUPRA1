/**
 * Feature engineering shared by the training-data generator and live inference.
 * Keep this file the single source of truth for feature order.
 */
import {
  DayPressure,
  GroupCaps,
  ResLite,
  baselinePct,
  timetablePeople,
} from '../campus/dynamics';

export const HORIZONS = [
  { key: '30m', minutes: 30 },
  { key: '1h', minutes: 60 },
  { key: '2h', minutes: 120 },
  { key: '4h', minutes: 240 },
] as const;
export type HorizonKey = (typeof HORIZONS)[number]['key'];

export const TYPES = [
  'ACTIVITY_CENTER', 'CANTEEN', 'CLASSROOM', 'COMPUTER_LAB', 'LIBRARY', 'RESEARCH_LAB', 'SEMINAR_HALL', 'STUDY_ROOM',
];

export const BASE_FEATURES = [
  'hour', 'day_of_week', 'is_weekend', 'capacity', 'current_pct', 'trend_15m', 'baseline_h_pct',
  ...TYPES.map((t) => `type_${t}`),
];
export const TIMETABLE_FEATURES = ['tt_now_pct', 'tt_h_pct', 'tt_peak_window_pct', 'released_window_100'];
export const ALL_FEATURES = [...BASE_FEATURES, ...TIMETABLE_FEATURES];

export interface FeatureInput {
  resource: ResLite;
  minuteOfDay: number;
  dow: number;
  currentPct: number;
  trend15: number;
  horizonMin: number;
  pressure: DayPressure;
  caps: GroupCaps;
}

/** Returns a feature dictionary (superset). Use pick() to order for a given model. */
export function buildFeatures(f: FeatureInput): Record<string, number> {
  const { resource: r, minuteOfDay: m, dow, horizonMin: h, pressure, caps } = f;
  const isWeekend = dow === 0 || dow === 6 ? 1 : 0;
  const mh = Math.min(1439, m + h);
  const pct = (people: number) => (people / r.capacity) * 100;

  // Timetable pressure: now, at the horizon, and the peak within the window (catches short canteen spikes)
  let peak = 0;
  for (let t = m; t <= mh; t += 5) peak = Math.max(peak, timetablePeople(r, t, pressure, caps));
  let released = 0;
  for (let t = m + 1; t <= mh; t++) released += pressure.released[t] ?? 0;

  const out: Record<string, number> = {
    hour: m / 60,
    day_of_week: dow,
    is_weekend: isWeekend,
    capacity: r.capacity,
    current_pct: f.currentPct,
    trend_15m: f.trend15,
    baseline_h_pct: baselinePct(r, mh, isWeekend === 1),
    tt_now_pct: pct(timetablePeople(r, m, pressure, caps)),
    tt_h_pct: pct(timetablePeople(r, mh, pressure, caps)),
    tt_peak_window_pct: pct(peak),
    released_window_100: released / 100,
  };
  for (const t of TYPES) out[`type_${t}`] = r.type === t ? 1 : 0;
  return out;
}

export const pick = (feats: Record<string, number>, names: readonly string[]) => names.map((n) => feats[n] ?? 0);
