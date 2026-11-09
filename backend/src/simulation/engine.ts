import { Resource } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { simClock } from '../campus/clock';
import { campusParts } from '../campus/time';
import { dayFactorFor, gaussian, stepOccupancy, targetPeople } from '../campus/dynamics';
import { nowContext, recordSample, clearHistory, wifiState } from '../campus/liveState';
import { PredictionService, PredictionResult, setResourceCache } from '../services/predictionService';
import { computeNudges, persistNudge, resetNudgeCooldowns } from '../services/nudgeService';
import { reservedSeatsAt } from '../services/bookingLogic';

export interface SimulationState {
  isRunning: boolean;
  speed: 'slow' | 'normal' | 'fast';
  speedMs: number;
  tickCount: number;
  lastTickTime: Date;
  surgeScenarioActive: boolean;
}

type StreamCallback = (eventType: string, data: any) => void;

const crowdStatus = (pct: number) => (pct > 70 ? 'CROWDED' : pct > 40 ? 'MODERATE' : 'QUIET');
const round1 = (x: number) => Math.round(x * 10) / 10;

// WiFi soft-sensing: true devices-per-person differs per zone (labs have desktops, canteens have phones only)
const TRUE_DEVICE_RATIO: Record<string, number> = {
  LIBRARY: 1.7, STUDY_ROOM: 1.8, COMPUTER_LAB: 1.15, RESEARCH_LAB: 1.9, CANTEEN: 1.05,
  SEMINAR_HALL: 1.25, CLASSROOM: 1.3, ACTIVITY_CENTER: 1.1,
};

export class IoTSimulationEngine {
  private static instance: IoTSimulationEngine;
  private intervalTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<StreamCallback> = new Set();
  private floatOcc = new Map<string, number>();
  private mood = new Map<string, number>();
  private flows = new Map<string, { entry: number; exit: number }>();
  private lastSimMs: number | null = null;
  private lastRecordReal = 0;
  private lastPruneReal = 0;
  private lastNudgeSim = 0;
  private ticking = false;
  private latestForecasts = new Map<string, PredictionResult[]>();

  private state: SimulationState = {
    isRunning: true,
    speed: 'normal',
    speedMs: 3000,
    tickCount: 0,
    lastTickTime: new Date(),
    surgeScenarioActive: false,
  };

  private constructor() {
    this.start();
  }

  public static getInstance(): IoTSimulationEngine {
    if (!IoTSimulationEngine.instance) IoTSimulationEngine.instance = new IoTSimulationEngine();
    return IoTSimulationEngine.instance;
  }

  public getState() {
    return { ...this.state, clock: simClock.info() };
  }

  public getLatestForecasts() {
    return this.latestForecasts;
  }

  public subscribe(cb: StreamCallback): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  public broadcast(eventType: string, data: any) {
    for (const sub of this.subscribers) {
      try {
        sub(eventType, data);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  public start() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.state.isRunning = true;
    this.intervalTimer = setInterval(() => this.tick(), this.state.speedMs);
    console.log(`[IoT Simulation] Started with ${this.state.speed} speed (${this.state.speedMs}ms)`);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.state.isRunning = false;
    console.log('[IoT Simulation] Paused');
  }

  public setSpeed(speed: 'slow' | 'normal' | 'fast') {
    this.state.speed = speed;
    this.state.speedMs = speed === 'slow' ? 6000 : speed === 'normal' ? 3000 : 1000;
    if (this.state.isRunning) this.start();
  }

  /** Demo clock control: jump to a weekday/time and/or change how fast simulated time runs. */
  public setClock(opts: { dow?: number; minuteOfDay?: number; rate?: number; mode?: 'real' }) {
    if (opts.mode === 'real') simClock.reset();
    else if (opts.dow !== undefined || opts.minuteOfDay !== undefined) simClock.set(opts);
    else if (opts.rate !== undefined) simClock.setRate(opts.rate);
    // A time jump invalidates trends and cooldowns; occupancy will glide to the new targets.
    clearHistory();
    resetNudgeCooldowns();
    this.lastSimMs = null;
    this.broadcast('CLOCK', simClock.info());
    return simClock.info();
  }

  /**
   * Main simulation tick: advances simulated time, moves each space toward its timetable-driven
   * target, updates sensors/WiFi estimates, records history and emits forecasts + nudges.
   */
  public async tick() {
    if (this.ticking) return; // never overlap ticks
    this.ticking = true;
    this.state.tickCount++;
    this.state.lastTickTime = new Date();

    try {
      const simMs = simClock.nowMs();
      const dtMin = this.lastSimMs === null ? 0.05 : Math.max(0, Math.min(30, (simMs - this.lastSimMs) / 60000));
      this.lastSimMs = simMs;

      const resources = await prisma.resource.findMany({ include: { sensors: true } });
      setResourceCache(resources);
      const ctx = nowContext(resources);
      const dayFactor = dayFactorFor(ctx.dateKey);
      const reserved = await reservedSeatsAt(ctx.minuteOfDay);

      const resourceUpdates: Resource[] = [];
      const alerts: { type: string; message: string; resourceId: string }[] = [];

      for (const res of resources) {
        const sensor = res.sensors[0];
        const sensorLive = sensor && sensor.status === 'ONLINE';

        // Keep the float state in sync with manual entry/exit overrides
        let cur = this.floatOcc.get(res.id);
        if (cur === undefined || Math.round(cur) !== res.currentOccupancy) cur = res.currentOccupancy;

        if (sensorLive) {
          let m = this.mood.get(res.id) ?? 1;
          m = 1 + (m - 1) * Math.pow(0.985, dtMin) + gaussian() * 0.012 * Math.sqrt(Math.min(dtMin, 5));
          this.mood.set(res.id, Math.max(0.8, Math.min(1.2, m)));

          let target = targetPeople(res, ctx.minuteOfDay, ctx.isWeekend, ctx.pressure, ctx.caps, dayFactor) * m;
          if (this.state.surgeScenarioActive && res.code === 'LIB-MAIN') target = res.capacity * 0.93;
          cur = stepOccupancy(cur, Math.min(res.capacity, target), dtMin, res.capacity, gaussian);
        }
        this.floatOcc.set(res.id, cur);

        const prevOcc = res.currentOccupancy;
        const newOcc = Math.round(cur);
        const pct = round1((newOcc / res.capacity) * 100);
        const available = Math.max(0, res.capacity - newOcc - (reserved.get(res.id) ?? 0));
        recordSample(res.id, simMs, pct);

        // Door-counter flows (people/min, smoothed): net change + background churn
        if (sensor && dtMin > 0) {
          const delta = newOcc - prevOcc;
          const churn = (newOcc / 60) * Math.min(dtMin, 5);
          const f = this.flows.get(res.id) ?? { entry: sensor.entryRate, exit: sensor.exitRate };
          const a = Math.min(1, dtMin / 3);
          f.entry = f.entry * (1 - a) + ((Math.max(0, delta) + churn) / dtMin) * a;
          f.exit = f.exit * (1 - a) + ((Math.max(0, -delta) + churn) / dtMin) * a;
          this.flows.set(res.id, f);
        }

        // WiFi soft-sensing: devices seen by the access point → calibrated people estimate
        this.updateWifi(res.id, res.type, newOcc);

        const updated = { ...res, currentOccupancy: newOcc, occupancyPercent: pct, availableUnits: available, currentCrowdStatus: crowdStatus(pct) };
        resourceUpdates.push(updated);

        if (pct >= 85 && res.occupancyPercent < 85) {
          alerts.push({ type: 'CROWD', message: `⚠ ${res.name} has crossed 85% occupancy (${newOcc}/${res.capacity}).`, resourceId: res.id });
        }
      }

      // Persist in one transaction (much lighter on SQLite than 30 separate writes)
      await prisma.$transaction(
        resourceUpdates.flatMap((r) => {
          const ops: any[] = [
            prisma.resource.update({
              where: { id: r.id },
              data: { currentOccupancy: r.currentOccupancy, occupancyPercent: r.occupancyPercent, availableUnits: r.availableUnits, currentCrowdStatus: r.currentCrowdStatus },
            }),
          ];
          const s = resources.find((x) => x.id === r.id)?.sensors[0];
          const f = this.flows.get(r.id);
          if (s && s.status === 'ONLINE' && f) {
            ops.push(prisma.sensor.update({ where: { id: s.id }, data: { entryRate: Math.round(f.entry), exitRate: Math.round(f.exit), lastHeartbeat: new Date() } }));
          }
          return ops;
        })
      );

      // Forecast every tick (pure in-memory GBM, ~1ms)
      for (const r of resourceUpdates) this.latestForecasts.set(r.id, PredictionService.forecastSync(r, resourceUpdates).predictions);

      for (const a of alerts) await this.triggerAlert(a.type, a.message, a.resourceId);

      // Nudges every 5 simulated minutes
      if (simMs - this.lastNudgeSim >= 5 * 60000 || simMs < this.lastNudgeSim) {
        this.lastNudgeSim = simMs;
        for (const n of computeNudges(resourceUpdates, this.latestForecasts, simMs)) {
          const notif = await persistNudge(n);
          this.broadcast('NOTIFICATION', notif);
        }
      }

      // History once per real minute; prune > 48h every 10 min
      const nowReal = Date.now();
      if (nowReal - this.lastRecordReal > 60000) {
        this.lastRecordReal = nowReal;
        await prisma.occupancyRecord.createMany({
          data: resourceUpdates.map((r) => {
            const f = this.flows.get(r.id);
            return { resourceId: r.id, occupancy: r.currentOccupancy, occupancyPercent: r.occupancyPercent, entryCount: Math.round(f?.entry ?? 0), exitCount: Math.round(f?.exit ?? 0) };
          }),
        });
      }
      if (nowReal - this.lastPruneReal > 10 * 60000) {
        this.lastPruneReal = nowReal;
        await prisma.occupancyRecord.deleteMany({ where: { timestamp: { lt: new Date(nowReal - 48 * 3600 * 1000) } } });
      }

      const sensors = await prisma.sensor.findMany();
      this.broadcast('TICK', {
        tickCount: this.state.tickCount,
        timestamp: this.state.lastTickTime,
        clock: simClock.info(),
        resources: resourceUpdates.map(({ sensors: _s, ...r }: any) => r),
        sensors,
        surgeScenarioActive: this.state.surgeScenarioActive,
      });
    } catch (err) {
      console.error('[IoT Simulation Tick Error]', err);
    } finally {
      this.ticking = false;
    }
  }

  private updateWifi(resourceId: string, type: string, people: number) {
    const trueRatio = TRUE_DEVICE_RATIO[type] ?? 1.4;
    const background = 3; // printers, displays, access points' own clients
    const devices = Math.max(0, Math.round(people * trueRatio + background + gaussian() * Math.sqrt(people + 1) * 0.9));
    const w = wifiState.get(resourceId) ?? { devices, estimate: people, ratio: 1.5, sumDev: 0, sumPeople: 0 };
    // Online calibration against the door counter (exponentially-weighted least squares through origin)
    w.sumDev = w.sumDev * 0.995 + Math.max(0, devices - background) * Math.max(1, people);
    w.sumPeople = w.sumPeople * 0.995 + Math.max(1, people) * Math.max(1, people);
    w.ratio = w.sumPeople > 0 ? w.sumDev / w.sumPeople : 1.5;
    w.devices = devices;
    w.estimate = Math.max(0, Math.round((devices - background) / Math.max(0.5, w.ratio)));
    wifiState.set(resourceId, w);
  }

  /** Campus-wide alert (visible to every user) */
  private async triggerAlert(type: string, message: string, resourceId: string) {
    try {
      const titles: Record<string, string> = { CROWD: 'Crowd Surge Warning', AVAILABILITY: 'Availability Alert', RECOMMENDATION: 'Smart Recommendation' };
      const notif = await prisma.notification.create({
        data: { userId: null, resourceId, type, title: titles[type] ?? 'Campus Alert', message, isRead: false },
      });
      this.broadcast('NOTIFICATION', notif);
    } catch {
      // ignore
    }
  }

  private async applyManual(sensorId: string, count: number, direction: 1 | -1) {
    const sensor = await prisma.sensor.findUnique({ where: { id: sensorId }, include: { resource: true } });
    if (!sensor) return null;
    const res = sensor.resource;
    const newOccupancy = Math.max(0, Math.min(res.capacity, res.currentOccupancy + direction * count));
    const newPercent = round1((newOccupancy / res.capacity) * 100);
    await prisma.resource.update({
      where: { id: res.id },
      data: { currentOccupancy: newOccupancy, occupancyPercent: newPercent, availableUnits: Math.max(0, res.capacity - newOccupancy), currentCrowdStatus: crowdStatus(newPercent) },
    });
    this.floatOcc.set(res.id, newOccupancy);
    await prisma.occupancyRecord.create({
      data: { resourceId: res.id, occupancy: newOccupancy, occupancyPercent: newPercent, entryCount: direction > 0 ? count : 0, exitCount: direction < 0 ? count : 0 },
    });
    this.broadcast('RESOURCE_UPDATE', { resourceId: res.id, occupancyPercent: newPercent });
    return { resourceId: res.id, newOccupancy, newPercent };
  }

  public simulateEntry(sensorId: string, count = 3) {
    return this.applyManual(sensorId, count, 1);
  }

  public simulateExit(sensorId: string, count = 3) {
    return this.applyManual(sensorId, count, -1);
  }

  public async toggleSensorStatus(sensorId: string) {
    const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) return null;
    return prisma.sensor.update({ where: { id: sensorId }, data: { status: sensor.status === 'ONLINE' ? 'PAUSED' : 'ONLINE' } });
  }

  /** Demo surge: Central Library is pushed toward 93% and a nudge points students elsewhere. */
  public async triggerDemoSurge() {
    this.state.surgeScenarioActive = true;
    const library = await prisma.resource.findUnique({ where: { code: 'LIB-MAIN' } });
    if (library) {
      const occ = Math.max(library.currentOccupancy, Math.round(library.capacity * 0.8));
      this.floatOcc.set(library.id, occ);
      await prisma.resource.update({
        where: { id: library.id },
        data: { currentOccupancy: occ, occupancyPercent: round1((occ / library.capacity) * 100), availableUnits: library.capacity - occ, currentCrowdStatus: 'CROWDED' },
      });
      await this.triggerAlert('CROWD', '⚠ Central Library is surging and expected to exceed 90% within 30 minutes.', library.id);
      const studyB = await prisma.resource.findUnique({ where: { code: 'SR-02' } });
      if (studyB) {
        await this.triggerAlert('RECOMMENDATION', `💡 ${studyB.name} is only ${Math.round(studyB.occupancyPercent)}% full — a quieter alternative to Central Library.`, studyB.id);
      }
    }
    this.broadcast('SURGE_TRIGGERED', { surgeActive: true });
    return { success: true, message: 'Peak surge scenario initiated' };
  }

  /** Reset: end the surge and snap every space to its expected occupancy for the current sim time. */
  public async resetSimulation() {
    this.state.surgeScenarioActive = false;
    const resources = await prisma.resource.findMany();
    const ctx = nowContext(resources);
    const dayFactor = dayFactorFor(campusParts(ctx.simMs).dateKey);
    await prisma.$transaction(
      resources.map((r) => {
        const occ = Math.round(targetPeople(r, ctx.minuteOfDay, ctx.isWeekend, ctx.pressure, ctx.caps, dayFactor));
        this.floatOcc.set(r.id, occ);
        const pct = round1((occ / r.capacity) * 100);
        return prisma.resource.update({
          where: { id: r.id },
          data: { currentOccupancy: occ, occupancyPercent: pct, availableUnits: r.capacity - occ, currentCrowdStatus: crowdStatus(pct) },
        });
      })
    );
    clearHistory();
    resetNudgeCooldowns();
    this.broadcast('RESET', { success: true });
    return { success: true, message: 'Simulation reset to expected occupancy for the current time' };
  }
}
