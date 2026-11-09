import { Resource } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { HORIZONS, HorizonKey, ALL_FEATURES, buildFeatures, pick } from '../ml/features';
import { loadModel, predictHorizon, horizonStats } from '../ml/gbm';
import { nowContext, trend15 } from '../campus/liveState';
import { targetPeople, ResLite, groupOf } from '../campus/dynamics';
import { sessionsForDay, getTimetable } from '../campus/timetable';
import { hhmm } from '../campus/time';

export interface PredictionResult {
  horizon: HorizonKey;
  timeOffsetMinutes: number;
  predictedPercent: number;
  confidence: number; // model R² on held-out days (1.0 = perfect)
  expectedErrorPct: number; // mean absolute error on held-out days, in % points
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  summary: string;
}

export interface ResourceForecast {
  resourceId: string;
  resourceName: string;
  currentOccupancyPercent: number;
  currentCrowdStatus: string;
  predictions: PredictionResult[];
  overallTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  interpretation: string;
  model: 'timetable-gbm' | 'analytical';
  drivers: string[];
}

type ResLike = Pick<Resource, 'id' | 'code' | 'type' | 'capacity' | 'occupancyPercent' | 'isAvailable'> & {
  sensors?: { entryRate: number; exitRate: number }[];
};

const toLite = (r: ResLike): ResLite => ({ id: r.id, code: r.code, type: r.type, capacity: r.capacity, isAvailable: r.isAvailable });

let resourceCache: { at: number; list: ResLite[] } | null = null;
async function allResourcesLite(): Promise<ResLite[]> {
  if (resourceCache && Date.now() - resourceCache.at < 10000) return resourceCache.list;
  const list = (await prisma.resource.findMany({ select: { id: true, code: true, type: true, capacity: true, isAvailable: true } })) as ResLite[];
  resourceCache = { at: Date.now(), list };
  return list;
}
export function setResourceCache(list: ResLite[]) {
  resourceCache = { at: Date.now(), list };
}

function describe(predicted: number, current: number): Pick<PredictionResult, 'trend' | 'summary'> {
  const diff = predicted - current;
  if (diff >= 3.5) return { trend: 'INCREASING', summary: `Expected to rise by ${Math.round(diff)}% to ${predicted}%` };
  if (diff <= -3.5) return { trend: 'DECREASING', summary: `Expected to subside by ${Math.abs(Math.round(diff))}% to ${predicted}%` };
  return { trend: 'STABLE', summary: 'Occupancy projected to stay steady' };
}

export class PredictionService {
  /** Live multi-horizon forecast for one resource (synchronous; pass the resource list for group shares). */
  public static forecastSync(res: ResLike, resources: ResLite[]): { predictions: PredictionResult[]; model: ResourceForecast['model'] } {
    const ctx = nowContext(resources);
    const current = res.occupancyPercent;
    const model = loadModel();

    if (model && res.isAvailable !== false) {
      const t15 = trend15(res.id, current, ctx.simMs);
      const predictions = HORIZONS.map(({ key, minutes }) => {
        const feats = buildFeatures({
          resource: toLite(res), minuteOfDay: ctx.minuteOfDay, dow: ctx.dow, currentPct: current,
          trend15: t15, horizonMin: minutes, pressure: ctx.pressure, caps: ctx.caps,
        });
        const raw = predictHorizon(key, pick(feats, ALL_FEATURES)) ?? current;
        const predicted = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
        const stats = horizonStats(key)!;
        return {
          horizon: key, timeOffsetMinutes: minutes, predictedPercent: predicted,
          confidence: Math.round(stats.r2 * 100) / 100, expectedErrorPct: stats.mae,
          ...describe(predicted, current),
        };
      });
      return { predictions, model: 'timetable-gbm' };
    }

    // Analytical fallback (used only if model.json is missing)
    const sensor = res.sensors?.[0];
    const net = (sensor?.entryRate ?? 4) - (sensor?.exitRate ?? 2);
    const vel = (net / Math.max(10, res.capacity)) * 100;
    const hour = Math.floor(ctx.minuteOfDay / 60);
    const predictions = HORIZONS.map(({ key, minutes }, i) => {
      const mult = [0.5, 1, 1.8, 3][i];
      let drift = vel * mult * 6.5;
      if (hour >= 11 && hour <= 17) drift += 5 * mult;
      else if (hour >= 19 || hour < 7) drift -= 8 * mult;
      const predicted = Math.round(Math.max(5, Math.min(98, current + drift)) * 10) / 10;
      return {
        horizon: key, timeOffsetMinutes: minutes, predictedPercent: predicted,
        confidence: Math.round((0.94 - (minutes / 240) * 0.16) * 100) / 100, expectedErrorPct: 10,
        ...describe(predicted, current),
      };
    });
    return { predictions, model: 'analytical' };
  }

  public static async forecast(res: ResLike) {
    return this.forecastSync(res, await allResourcesLite());
  }

  /**
   * Predicted occupancy % for any time up to ~10h ahead: interpolates the ML horizons,
   * beyond 4h falls back to the expected timetable-driven profile.
   */
  public static predictPctAtSync(res: ResLike, minutesAhead: number, resources: ResLite[], forecast?: PredictionResult[]): number {
    if (res.isAvailable === false) return 100;
    const preds = forecast ?? this.forecastSync(res, resources).predictions;
    const points = [{ m: 0, p: res.occupancyPercent }, ...preds.map((p) => ({ m: p.timeOffsetMinutes, p: p.predictedPercent }))];
    if (minutesAhead <= 0) return res.occupancyPercent;
    for (let i = 1; i < points.length; i++) {
      if (minutesAhead <= points[i].m) {
        const a = points[i - 1], b = points[i];
        return a.p + ((b.p - a.p) * (minutesAhead - a.m)) / (b.m - a.m);
      }
    }
    const ctx = nowContext(resources);
    const m = Math.min(1439, ctx.minuteOfDay + minutesAhead);
    return (targetPeople(toLite(res), m, ctx.isWeekend, ctx.pressure, ctx.caps) / res.capacity) * 100;
  }

  /** Human-readable reasons from the timetable for what the forecast is doing. */
  public static drivers(res: ResLike): string[] {
    const ctx = nowContext([]);
    const now = ctx.minuteOfDay;
    const sessions = sessionsForDay(getTimetable(), ctx.dow);
    const out: string[] = [];
    const g = groupOf(res.type);
    if (g === 'teaching' || res.code.startsWith('LAB')) {
      const next = sessions.filter((s) => s.roomCode === res.code && s.end > now).sort((a, b) => a.start - b.start)[0];
      if (next) out.push(next.start <= now ? `${next.courseCode} in session until ${hhmm(next.end)} (${next.enrollment} enrolled)` : `Next class ${next.courseCode} at ${hhmm(next.start)} (${next.enrollment} enrolled)`);
    }
    const ending = sessions.filter((s) => s.end > now && s.end <= now + 60);
    if (ending.length && g !== 'teaching') {
      const students = ending.reduce((a, s) => a + s.enrollment, 0);
      const at = Math.min(...ending.map((s) => s.end));
      out.push(`${students} students leave class around ${hhmm(at)} (timetable)`);
    }
    return out;
  }

  /** Forecast for a resource (API shape) and persist latest predictions. */
  public static async getForecastForResource(resourceId: string): Promise<ResourceForecast | null> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId }, include: { sensors: true } });
    if (!resource) return null;

    const { predictions, model } = await this.forecast(resource);

    await prisma.$transaction(async (tx) => {
      await tx.prediction.deleteMany({ where: { resourceId: resource.id } });
      await tx.prediction.createMany({
        data: predictions.map((p) => ({
          resourceId: resource.id,
          timeOffsetMinutes: p.timeOffsetMinutes,
          predictedOccupancyPercent: p.predictedPercent,
          confidence: p.confidence,
          trend: p.trend,
          summary: p.summary,
        })),
      });
    });

    const oneHour = predictions.find((p) => p.timeOffsetMinutes === 60);
    const overallTrend = oneHour ? oneHour.trend : 'STABLE';
    let interpretation = 'Steady occupancy expected throughout the next 2 hours.';
    if (oneHour && oneHour.predictedPercent >= 75) interpretation = '⚠ Crowd expected to increase significantly. High contention anticipated.';
    else if (overallTrend === 'DECREASING') interpretation = '✓ Crowd expected to decrease. Availability opening up soon.';
    else if (overallTrend === 'INCREASING') interpretation = '📈 Moderate crowd increase forecasted. Reserve early to guarantee space.';

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      currentOccupancyPercent: resource.occupancyPercent,
      currentCrowdStatus: resource.currentCrowdStatus,
      predictions,
      overallTrend,
      interpretation,
      model,
      drivers: this.drivers(resource),
    };
  }

  public static modelInfo() {
    const m = loadModel();
    if (!m) return { model: 'analytical', horizons: {} };
    return {
      model: 'timetable-gbm',
      algorithm: m.algorithm,
      trainedAt: m.trained_at,
      features: m.features,
      horizons: Object.fromEntries(
        HORIZONS.map(({ key }) => [key, horizonStats(key)])
      ),
    };
  }
}
