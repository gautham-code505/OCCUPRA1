// Parity check: runs the exported trees in Node on the held-out days and reports MAE.
// Must match the MAE printed by ml/timetable/train.py.   npx tsx scripts/verify-model.ts
import fs from 'fs';
import path from 'path';
import { predictHorizon, horizonStats } from '../src/ml/gbm';
import { ALL_FEATURES, HORIZONS } from '../src/ml/features';

const csv = fs.readFileSync(path.join(__dirname, '..', '..', 'ml', 'timetable', 'dataset.csv'), 'utf-8').trim().split('\n');
const header = csv[0].split(',');
const idx = (c: string) => header.indexOf(c);
const days = Math.max(...csv.slice(1).map((l) => Number(l.split(',', 1)[0]))) + 1;
const testFrom = Math.floor(days * 0.8);

for (const h of HORIZONS) {
  const cols = ALL_FEATURES.map((f) => idx(`${f}@${h.key}`));
  const yi = idx(`y_${h.key}`);
  let err = 0, n = 0;
  for (const line of csv.slice(1)) {
    const v = line.split(',');
    if (Number(v[0]) < testFrom) continue;
    const p = predictHorizon(h.key, cols.map((c) => Number(v[c])))!;
    err += Math.abs(p - Number(v[yi]));
    n++;
  }
  console.log(`[${h.key}] Node MAE ${(err / n).toFixed(2)}  vs  Python MAE ${horizonStats(h.key)!.mae}  (${n} rows)`);
}
