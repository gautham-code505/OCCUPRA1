/**
 * In-memory live state shared by the simulation engine, forecaster, nudges, agent and energy
 * planner (kept separate to avoid import cycles).
 */
import { simClock } from './clock';
import { campusParts } from './time';
import { computeDayPressure, groupCapacities, ResLite, DayPressure, GroupCaps } from './dynamics';
import { getTimetable } from './timetable';

interface Sample { t: number; pct: number }

const history = new Map<string, Sample[]>(); // resourceId -> recent samples (sim time)
const HISTORY_SPAN_MS = 90 * 60000;

export function recordSample(resourceId: string, simMs: number, pct: number) {
  const arr = history.get(resourceId) ?? [];
  const last = arr[arr.length - 1];
  if (last && simMs < last.t) arr.length = 0; // clock moved backwards
  arr.push({ t: simMs, pct });
  while (arr.length && simMs - arr[0].t > HISTORY_SPAN_MS) arr.shift();
  if (arr.length > 2000) arr.splice(0, arr.length - 2000);
  history.set(resourceId, arr);
}

export function clearHistory() {
  history.clear();
}

/** Change in occupancy % over the last ~15 simulated minutes (0 if not enough history). */
export function trend15(resourceId: string, currentPct: number, simMs: number): number {
  const arr = history.get(resourceId);
  if (!arr || arr.length < 2) return 0;
  const targetT = simMs - 15 * 60000;
  let ref = arr[0];
  for (const s of arr) {
    if (s.t <= targetT) ref = s;
    else break;
  }
  const spanMin = (simMs - ref.t) / 60000;
  if (spanMin < 3) return 0;
  return (currentPct - ref.pct) * Math.min(1, 15 / spanMin);
}

export function nowContext(resources: ResLite[]): {
  simMs: number; dow: number; minuteOfDay: number; dateKey: string; isWeekend: boolean;
  pressure: DayPressure; caps: GroupCaps;
} {
  const simMs = simClock.nowMs();
  const p = campusParts(simMs);
  return {
    simMs,
    ...p,
    pressure: computeDayPressure(getTimetable(), p.dow),
    caps: groupCapacities(resources),
  };
}

// WiFi soft-sensing state (per resource): learned devices-per-person ratio
export const wifiState = new Map<string, { devices: number; estimate: number; ratio: number; sumDev: number; sumPeople: number }>();
