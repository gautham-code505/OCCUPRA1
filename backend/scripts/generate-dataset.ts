/**
 * Generates the ML training set by running the shared campus dynamics over many simulated
 * days WITH realistic noise the model cannot see (day-to-day demand, attendance swings,
 * unscheduled events, slow "mood" drift per space).
 *
 *   npx tsx scripts/generate-dataset.ts [days=70]
 * Output: ../ml/timetable/dataset.csv
 */
import fs from 'fs';
import path from 'path';
import {
  computeDayPressure, groupCapacities, stepOccupancy, targetPeople, gaussian,
} from '../src/campus/dynamics';
import { getTimetable } from '../src/campus/timetable';
import { ALL_FEATURES, HORIZONS, buildFeatures, pick } from '../src/ml/features';
import { CATALOG } from './catalog';

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(7);
const gauss = () => gaussian(rand);

const DAYS = Number(process.argv[2] ?? 70);
const tt = getTimetable();
const caps = groupCapacities(CATALOG);
const SAMPLE_FROM = 7 * 60;
const SAMPLE_TO = 19 * 60 + 50;
const SAMPLE_EVERY = 10;

const lines: string[] = [
  ['day_index', 'resource_code', ...HORIZONS.flatMap((h) => ALL_FEATURES.map((f) => `${f}@${h.key}`)), ...HORIZONS.map((h) => `y_${h.key}`)].join(','),
];

for (let d = 0; d < DAYS; d++) {
  const dow = (d + 1) % 7; // start on Monday
  const isWeekend = dow === 0 || dow === 6;
  const dayFactor = 0.82 + rand() * 0.36;
  const attendance = 0.72 + rand() * 0.2;
  const truePressure = computeDayPressure(tt, dow, attendance);
  const modelPressure = computeDayPressure(tt, dow); // what the model can know: the timetable at nominal attendance

  // Unscheduled events (club meet, guest talk) — invisible to the model
  const events: { code: string; start: number; end: number; people: number }[] = [];
  if (rand() < 0.25) events.push({ code: 'SAC-01', start: 960 + Math.floor(rand() * 120), end: 0, people: 50 + rand() * 70 });
  if (rand() < 0.15) events.push({ code: 'SEM-01', start: 600 + Math.floor(rand() * 360), end: 0, people: 60 + rand() * 90 });
  events.forEach((e) => (e.end = e.start + 90 + Math.floor(rand() * 60)));

  for (const r of CATALOG) {
    const pctSeries = new Float32Array(1440);
    let mood = 1;
    let occ = targetPeople(r, 360, isWeekend, truePressure, caps, dayFactor);
    for (let m = 360; m < 1440; m++) {
      mood = 1 + (mood - 1) * 0.985 + gauss() * 0.012; // slow AR(1) drift
      let target = targetPeople(r, m, isWeekend, truePressure, caps, dayFactor) * mood;
      for (const e of events) if (e.code === r.code && m >= e.start && m < e.end) target += e.people;
      occ = stepOccupancy(occ, Math.min(r.capacity, target), 1, r.capacity, gauss);
      pctSeries[m] = (occ / r.capacity) * 100;
    }

    for (let m = SAMPLE_FROM; m <= SAMPLE_TO; m += SAMPLE_EVERY) {
      const current = pctSeries[m];
      const trend15 = current - pctSeries[m - 15];
      const ys = HORIZONS.map((h) => pctSeries[Math.min(1439, m + h.minutes)].toFixed(2));
      // Horizon-dependent features are written as separate column groups: <feature>@<h>
      lines.push(
        [
          d,
          r.code,
          ...HORIZONS.flatMap((h) =>
            pick(
              buildFeatures({ resource: r, minuteOfDay: m, dow, currentPct: current, trend15, horizonMin: h.minutes, pressure: modelPressure, caps }),
              ALL_FEATURES
            ).map((v) => +v.toFixed(3))
          ),
          ...ys,
        ].join(',')
      );
    }
  }
}

const outFile = path.join(__dirname, '..', '..', 'ml', 'timetable', 'dataset.csv');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'));
console.log(`Wrote ${lines.length - 1} rows (${DAYS} days × ${CATALOG.length} spaces) to ${outFile}`);
