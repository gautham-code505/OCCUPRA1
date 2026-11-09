/**
 * Early-peak nudges: "Main Canteen will hit ~88% in 30 min — go now, or try X (34%)."
 * Runs every few simulated minutes from the engine, using the timetable-aware forecast.
 */
import { Resource } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { PredictionService, PredictionResult } from './predictionService';
import { ResLite, groupOf } from '../campus/dynamics';
import { nowContext } from '../campus/liveState';
import { sessionsForDay, getTimetable } from '../campus/timetable';
import { hhmm } from '../campus/time';

const PEAK_THRESHOLD = 78;
const COOLDOWN_SIM_MS = 60 * 60000;
const cooldown = new Map<string, number>();

// Spaces a student would accept instead of each other
const ALTERNATIVE_GROUP: Record<string, string[]> = {
  LIBRARY: ['LIBRARY', 'STUDY_ROOM'],
  STUDY_ROOM: ['STUDY_ROOM', 'LIBRARY'],
  COMPUTER_LAB: ['COMPUTER_LAB'],
  RESEARCH_LAB: ['RESEARCH_LAB'],
  CANTEEN: ['CANTEEN', 'ACTIVITY_CENTER'],
  ACTIVITY_CENTER: ['ACTIVITY_CENTER'],
};

export interface Nudge {
  resourceId: string;
  title: string;
  message: string;
  peakPct: number;
  minutesAhead: number;
  alternativeId?: string;
}

export function computeNudges(resources: Resource[], forecasts: Map<string, PredictionResult[]>, simMs: number): Nudge[] {
  const lite: ResLite[] = resources;
  const ctx = nowContext(lite);
  const sessions = sessionsForDay(getTimetable(), ctx.dow);
  const nudges: Nudge[] = [];

  for (const r of resources) {
    if (!r.isAvailable || groupOf(r.type) === 'teaching' || !ALTERNATIVE_GROUP[r.type]) continue;
    if ((cooldown.get(r.id) ?? 0) > simMs) continue;
    const preds = forecasts.get(r.id);
    if (!preds) continue;
    const soon = preds.filter((p) => p.timeOffsetMinutes <= 60);
    const peak = soon.reduce((best, p) => (p.predictedPercent > best.predictedPercent ? p : best), soon[0]);
    if (!peak || peak.predictedPercent < PEAK_THRESHOLD || r.occupancyPercent > peak.predictedPercent - 10) continue;

    // Best alternative: same kind of space with the lowest forecast at that time
    const alts = resources
      .filter((a) => a.id !== r.id && a.isAvailable && ALTERNATIVE_GROUP[r.type].includes(a.type))
      .map((a) => ({ a, p: PredictionService.predictPctAtSync(a, peak.timeOffsetMinutes, lite, forecasts.get(a.id)) }))
      .filter((x) => x.p < 60)
      .sort((x, y) => x.p - y.p);
    const alt = alts[0];

    const ending = sessions.filter((s) => s.end > ctx.minuteOfDay && s.end <= ctx.minuteOfDay + peak.timeOffsetMinutes);
    const students = ending.reduce((a, s) => a + s.enrollment, 0);
    const why = students > 0 ? ` — ${students} students finish class around ${hhmm(Math.min(...ending.map((s) => s.end)))}` : '';
    const when = peak.timeOffsetMinutes <= 30 ? '~30 min' : '~1 hour';

    nudges.push({
      resourceId: r.id,
      title: `Early peak: ${r.name}`,
      message:
        `${r.name} is forecast to reach ${Math.round(peak.predictedPercent)}% in ${when}${why}. ` +
        (r.occupancyPercent < 70 ? `It's ${Math.round(r.occupancyPercent)}% now — go now to beat the rush` : 'Expect queues') +
        (alt ? `, or try ${alt.a.name} (forecast ${Math.round(alt.p)}%).` : '.'),
      peakPct: peak.predictedPercent,
      minutesAhead: peak.timeOffsetMinutes,
      alternativeId: alt?.a.id,
    });
    cooldown.set(r.id, simMs + COOLDOWN_SIM_MS);
  }
  return nudges;
}

export async function persistNudge(n: Nudge) {
  return prisma.notification.create({
    data: { userId: null, resourceId: n.resourceId, type: 'PREDICTION', title: n.title, message: n.message, isRead: false },
  });
}

export function resetNudgeCooldowns() {
  cooldown.clear();
}
