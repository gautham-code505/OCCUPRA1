import fs from 'fs';
import path from 'path';

export interface ClassSession {
  id: string;
  courseCode: string;
  title: string;
  department: string;
  roomCode: string; // Resource.code where the class is held
  day: number; // 1 = Monday ... 5 = Friday
  start: number; // minute of day
  end: number; // minute of day
  enrollment: number;
}

export interface Timetable {
  version: string;
  source: string;
  generatedAt: string;
  sessions: ClassSession[];
}

const TIMETABLE_PATH = path.join(__dirname, '..', 'data', 'timetable.json');

let active: Timetable | null = null;

export function getTimetable(): Timetable {
  if (!active) {
    try {
      active = JSON.parse(fs.readFileSync(TIMETABLE_PATH, 'utf-8')) as Timetable;
    } catch (err) {
      console.warn('[timetable] Could not load timetable.json — running without class schedule.');
      active = { version: 'empty', source: 'none', generatedAt: new Date().toISOString(), sessions: [] };
    }
  }
  return active;
}

export function sessionsForDay(tt: Timetable, dow: number): ClassSession[] {
  return tt.sessions.filter((s) => s.day === dow);
}

// ---------- What-if scenario transforms (pure: never mutate the live timetable) ----------

export type Scenario =
  | { type: 'shift_slot'; slotStart: number; minutes: number }
  | { type: 'stagger'; minutes: number; window?: [number, number] }
  | { type: 'attendance'; factor: number }
  | { type: 'none' };

export function applyScenario(tt: Timetable, scenario: Scenario): Timetable {
  if (scenario.type === 'none') return tt;
  let sessions = tt.sessions.map((s) => ({ ...s }));

  if (scenario.type === 'shift_slot') {
    sessions = sessions.map((s) =>
      s.start === scenario.slotStart ? { ...s, start: s.start + scenario.minutes, end: s.end + scenario.minutes } : s
    );
  } else if (scenario.type === 'stagger') {
    // Every other department moves by `minutes` (only sessions in the window, default: all day)
    const depts = Array.from(new Set(sessions.map((s) => s.department))).sort();
    const shifted = new Set(depts.filter((_, i) => i % 2 === 1));
    const [from, to] = scenario.window ?? [0, 1440];
    sessions = sessions.map((s) =>
      shifted.has(s.department) && s.start >= from && s.start < to
        ? { ...s, start: s.start + scenario.minutes, end: s.end + scenario.minutes }
        : s
    );
  } else if (scenario.type === 'attendance') {
    sessions = sessions.map((s) => ({ ...s, enrollment: Math.round(s.enrollment * scenario.factor) }));
  }

  return { ...tt, version: `${tt.version}+${JSON.stringify(scenario)}`, sessions };
}
