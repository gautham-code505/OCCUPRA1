/**
 * What-if simulator: change the timetable (shift a slot, stagger departments, attendance swing)
 * and compare the expected crowd curves against today's baseline.
 */
import { Resource } from '@prisma/client';
import { expectedDaySeries } from '../campus/dynamics';
import { Scenario, applyScenario, getTimetable, sessionsForDay } from '../campus/timetable';
import { hhmm } from '../campus/time';

const OVERCROWD_PCT = 85;
const STEP = 10;

function summarize(minutes: number[], pcts: number[]) {
  let peak = -1;
  let peakAt = minutes[0];
  let over = 0;
  pcts.forEach((p, i) => {
    if (p > peak) {
      peak = p;
      peakAt = minutes[i];
    }
    if (p >= OVERCROWD_PCT) over += STEP;
  });
  return { peakPct: Math.round(peak * 10) / 10, peakTime: hhmm(peakAt), minutesOver85: over };
}

export function runWhatIf(resources: Resource[], dow: number, scenario: Scenario) {
  const base = getTimetable();
  const modified = applyScenario(base, scenario);
  const rooms = resources.filter((r) => r.isAvailable);
  const opts = { from: 420, to: 1260, stepMin: STEP, attendance: undefined };
  const a = expectedDaySeries(rooms, base, dow, opts);
  const b = expectedDaySeries(rooms, modified, dow, opts);

  const perResource = rooms.map((r) => {
    const before = summarize(a.minutes, a.series[r.code]);
    const after = summarize(b.minutes, b.series[r.code]);
    return {
      id: r.id, code: r.code, name: r.name, type: r.type,
      baseline: before, scenario: after,
      peakChange: Math.round((after.peakPct - before.peakPct) * 10) / 10,
      overcrowdChange: after.minutesOver85 - before.minutesOver85,
      baselineSeries: a.series[r.code],
      scenarioSeries: b.series[r.code],
    };
  });

  const totalBefore = perResource.reduce((s, r) => s + r.baseline.minutesOver85, 0);
  const totalAfter = perResource.reduce((s, r) => s + r.scenario.minutesOver85, 0);
  const movedSessions = sessionsForDay(modified, dow).filter((s, i) => {
    const o = sessionsForDay(base, dow)[i];
    return o && (o.start !== s.start || o.enrollment !== s.enrollment);
  }).length;

  return {
    dow,
    scenario,
    times: a.minutes.map(hhmm),
    movedSessions,
    campus: {
      overcrowdedRoomMinutesBefore: totalBefore,
      overcrowdedRoomMinutesAfter: totalAfter,
      change: totalAfter - totalBefore,
    },
    resources: perResource.sort((x, y) => Math.abs(y.peakChange) - Math.abs(x.peakChange)),
  };
}
