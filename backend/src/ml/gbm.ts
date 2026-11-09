import fs from 'fs';
import path from 'path';
import { HorizonKey } from './features';

interface Tree { l: number[]; r: number[]; f: number[]; t: number[]; v: number[] }
interface HorizonModel { init: number; lr: number; trees: Tree[]; mae: number; r2: number; baseline_mae: number; naive_mae: number }
export interface GbmBundle { features: string[]; horizons: Record<HorizonKey, HorizonModel>; trained_at: string; algorithm: string }

const MODEL_PATH = path.join(__dirname, 'model.json');
let bundle: GbmBundle | null | undefined;

export function loadModel(): GbmBundle | null {
  if (bundle !== undefined) return bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf-8')) as GbmBundle;
    console.log(`[ml] Loaded timetable-aware GBM (${bundle.features.length} features, trained ${bundle.trained_at})`);
  } catch {
    console.warn('[ml] model.json not found — using analytical fallback forecasts.');
    bundle = null;
  }
  return bundle;
}

function evalTree(t: Tree, x: number[]): number {
  let node = 0;
  while (t.l[node] !== -1) node = x[t.f[node]] <= t.t[node] ? t.l[node] : t.r[node];
  return t.v[node];
}

/** Same arithmetic as sklearn GradientBoostingRegressor.predict for squared-error loss. */
export function predictHorizon(h: HorizonKey, x: number[]): number | null {
  const m = loadModel()?.horizons[h];
  if (!m) return null;
  let s = 0;
  for (const t of m.trees) s += evalTree(t, x);
  return m.init + m.lr * s;
}

export function horizonStats(h: HorizonKey) {
  const m = loadModel()?.horizons[h];
  return m ? { mae: m.mae, r2: m.r2, baselineMae: m.baseline_mae, naiveMae: m.naive_mae } : null;
}
