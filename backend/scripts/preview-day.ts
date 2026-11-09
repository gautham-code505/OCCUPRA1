// Prints the expected occupancy (%) of every space for a weekday — handy sanity check.
//   npx tsx scripts/preview-day.ts [dow=1]
import { expectedDaySeries } from '../src/campus/dynamics';
import { getTimetable } from '../src/campus/timetable';
import { CATALOG } from './catalog';

const dow = Number(process.argv[2] ?? 1);
const { minutes, series } = expectedDaySeries(CATALOG, getTimetable(), dow, { stepMin: 30 });
console.log('time    ' + minutes.map((m) => String(Math.floor(m / 60)).padStart(2) + (m % 60 ? '½' : ' ')).join(''));
for (const k of Object.keys(series)) console.log(k.padEnd(8) + series[k].map((v) => String(Math.round(v)).padStart(3)).join(''));
