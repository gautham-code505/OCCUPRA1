/**
 * Energy & space-consolidation planner.
 *
 * Idea: most campus rooms run lights + AC for their whole opening hours regardless of use.
 * Using the timetable-aware occupancy forecast we (1) switch off teaching rooms with no class
 * and nobody inside, and (2) consolidate under-used interchangeable rooms (study rooms, labs)
 * into neighbours that still have comfortable headroom. All assumptions are returned so the
 * numbers can be challenged and tuned.
 */
import { Resource } from '@prisma/client';
import { expectedDaySeries, groupOf } from '../campus/dynamics';
import { getTimetable } from '../campus/timetable';
import { hhmm, parseClock } from '../campus/time';
import { config } from '../config';

// Connected load per seat while a room is "on" (lighting + HVAC + plug load), kW
const KW_PER_SEAT: Record<string, number> = {
  LIBRARY: 0.1, STUDY_ROOM: 0.12, COMPUTER_LAB: 0.25, RESEARCH_LAB: 0.3, CANTEEN: 0.08,
  SEMINAR_HALL: 0.08, CLASSROOM: 0.08, ACTIVITY_CENTER: 0.08,
};
const CONSOLIDATABLE: Record<string, string> = { STUDY_ROOM: 'study', LIBRARY: 'study', COMPUTER_LAB: 'lab', RESEARCH_LAB: 'research' };
const STANDBY_FRACTION = 0.1; // a "closed" room still draws ~10% (fridges, network, emergency lights)
const MAX_RECEIVER_PCT = 75; // never push a receiving room past this
const CLOSE_BELOW_PCT = 25; // only consolidate rooms under this occupancy
const IDLE_TEACHING_PCT = 5; // teaching rooms below this with no class are switched off
const SLOT_MIN = 15;

export interface EnergyOptions {
  dow: number;
  tariff?: number;
  co2Factor?: number;
  nowMinute?: number;
}

interface SlotState { t: string; pct: number; state: 'on' | 'off' | 'closed' }

export function analyzeEnergy(resources: Resource[], opts: EnergyOptions) {
  const tariff = opts.tariff ?? config.tariffInrPerKwh;
  const co2 = opts.co2Factor ?? config.gridKgCo2PerKwh;
  const rooms = resources.filter((r) => r.isAvailable);
  const { minutes, series } = expectedDaySeries(rooms, getTimetable(), opts.dow, { from: 420, to: 1380, stepMin: SLOT_MIN });

  const kw = (r: Resource) => r.capacity * (KW_PER_SEAT[r.type] ?? 0.1);
  const openAt = (r: Resource, m: number) => {
    const o = parseClock(r.openingTime) ?? 480;
    const c = parseClock(r.closingTime) ?? 1260;
    return m >= o && m < c;
  };

  const timeline: Record<string, SlotState[]> = Object.fromEntries(rooms.map((r) => [r.id, []]));
  const moves: Record<string, { from: string; to: string; people: number; slots: number }> = {};
  let baselineKwh = 0;
  let optimizedKwh = 0;

  minutes.forEach((m, i) => {
    const hours = SLOT_MIN / 60;
    const people = new Map(rooms.map((r) => [r.id, ((series[r.code]?.[i] ?? 0) / 100) * r.capacity]));
    const closed = new Set<string>();

    // (1) idle teaching rooms
    for (const r of rooms) {
      if (groupOf(r.type) === 'teaching' && openAt(r, m) && (series[r.code]?.[i] ?? 0) < IDLE_TEACHING_PCT) closed.add(r.id);
    }

    // (2) consolidate interchangeable rooms, emptiest first
    const groups = new Map<string, Resource[]>();
    for (const r of rooms) {
      const g = CONSOLIDATABLE[r.type];
      if (g && openAt(r, m)) groups.set(g, [...(groups.get(g) ?? []), r]);
    }
    for (const list of groups.values()) {
      const open = [...list].sort((a, b) => people.get(a.id)! / a.capacity - people.get(b.id)! / b.capacity);
      for (const donor of open) {
        if (closed.has(donor.id)) continue;
        const donorPct = (people.get(donor.id)! / donor.capacity) * 100;
        if (donorPct >= CLOSE_BELOW_PCT) break;
        const receivers = open.filter((x) => x.id !== donor.id && !closed.has(x.id));
        if (!receivers.length) break;
        // Fill the receiver with the most headroom
        const recv = receivers
          .map((x) => ({ x, room: (MAX_RECEIVER_PCT / 100) * x.capacity - people.get(x.id)! }))
          .sort((a, b) => b.room - a.room)[0];
        const movers = people.get(donor.id)!;
        if (recv.room >= movers) {
          people.set(recv.x.id, people.get(recv.x.id)! + movers);
          people.set(donor.id, 0);
          closed.add(donor.id);
          const key = `${donor.id}->${recv.x.id}`;
          moves[key] = moves[key] ?? { from: donor.name, to: recv.x.name, people: 0, slots: 0 };
          moves[key].people = Math.max(moves[key].people, Math.round(movers));
          moves[key].slots++;
        }
      }
    }

    for (const r of rooms) {
      if (!openAt(r, m)) {
        timeline[r.id].push({ t: hhmm(m), pct: 0, state: 'off' });
        continue;
      }
      baselineKwh += kw(r) * hours;
      const isClosed = closed.has(r.id);
      optimizedKwh += kw(r) * hours * (isClosed ? STANDBY_FRACTION : 1);
      timeline[r.id].push({ t: hhmm(m), pct: Math.round((series[r.code]?.[i] ?? 0) * 10) / 10, state: isClosed ? 'closed' : 'on' });
    }
  });

  const savedKwh = baselineKwh - optimizedKwh;
  const perRoom = rooms
    .map((r) => {
      const slots = timeline[r.id];
      const closedSlots = slots.filter((s) => s.state === 'closed').length;
      return {
        id: r.id, name: r.name, code: r.code, type: r.type, kw: Math.round(kw(r) * 10) / 10,
        closedHours: (closedSlots * SLOT_MIN) / 60,
        savedKwh: Math.round(kw(r) * ((closedSlots * SLOT_MIN) / 60) * (1 - STANDBY_FRACTION) * 10) / 10,
        timeline: slots,
      };
    })
    .sort((a, b) => b.savedKwh - a.savedKwh);

  // Right-now actions from LIVE occupancy
  const now = opts.nowMinute;
  const actionsNow: { action: string; resourceId: string; detail: string }[] = [];
  if (now !== undefined) {
    for (const r of rooms) {
      if (groupOf(r.type) === 'teaching' && openAt(r, now) && r.occupancyPercent < IDLE_TEACHING_PCT) {
        actionsNow.push({ action: 'SWITCH_OFF', resourceId: r.id, detail: `${r.name} is empty with no class scheduled — lights & AC off saves ${Math.round(kw(r) * 10) / 10} kW` });
      }
    }
    const byGroup = new Map<string, Resource[]>();
    for (const r of rooms) {
      const g = CONSOLIDATABLE[r.type];
      if (g && openAt(r, now)) byGroup.set(g, [...(byGroup.get(g) ?? []), r]);
    }
    for (const list of byGroup.values()) {
      const sorted = [...list].sort((a, b) => a.occupancyPercent - b.occupancyPercent);
      const donor = sorted[0];
      if (!donor || donor.occupancyPercent >= CLOSE_BELOW_PCT || sorted.length < 2) continue;
      const recv = sorted.slice(1).sort((a, b) => (b.capacity * MAX_RECEIVER_PCT) / 100 - b.currentOccupancy - ((a.capacity * MAX_RECEIVER_PCT) / 100 - a.currentOccupancy))[0];
      if ((recv.capacity * MAX_RECEIVER_PCT) / 100 - recv.currentOccupancy >= donor.currentOccupancy) {
        actionsNow.push({
          action: 'CONSOLIDATE', resourceId: donor.id,
          detail: `Move ${donor.currentOccupancy} people from ${donor.name} (${Math.round(donor.occupancyPercent)}%) to ${recv.name} (${Math.round(recv.occupancyPercent)}%) and power down — saves ${Math.round(kw(donor) * 10) / 10} kW`,
        });
      }
    }
  }

  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    summary: {
      baselineKwh: r1(baselineKwh),
      optimizedKwh: r1(optimizedKwh),
      savedKwh: r1(savedKwh),
      savedPct: baselineKwh > 0 ? r1((savedKwh / baselineKwh) * 100) : 0,
      savedInr: Math.round(savedKwh * tariff),
      savedCo2Kg: r1(savedKwh * co2),
      monthlySavedInr: Math.round(savedKwh * tariff * 22),
      monthlySavedCo2Kg: Math.round(savedKwh * co2 * 22),
    },
    consolidationPlan: Object.values(moves)
      .map((mv) => ({ ...mv, hours: (mv.slots * SLOT_MIN) / 60 }))
      .sort((a, b) => b.hours - a.hours),
    rooms: perRoom,
    actionsNow,
    assumptions: {
      tariffInrPerKwh: tariff,
      gridKgCo2PerKwh: co2,
      kwPerSeat: KW_PER_SEAT,
      standbyFraction: STANDBY_FRACTION,
      maxReceiverPct: MAX_RECEIVER_PCT,
      consolidateBelowPct: CLOSE_BELOW_PCT,
      workingDaysPerMonth: 22,
      baseline: 'Every room powered for its full opening hours (no occupancy control)',
      note: 'Estimates from forecast occupancy and assumed loads — replace kW/seat and tariff with metered values.',
    },
  };
}
