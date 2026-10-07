import { prisma } from '../utils/prisma';
import { PredictionService } from '../services/predictionService';

export interface SimulationState {
  isRunning: boolean;
  speed: 'slow' | 'normal' | 'fast';
  speedMs: number;
  tickCount: number;
  lastTickTime: Date;
  surgeScenarioActive: boolean;
}

type StreamCallback = (eventType: string, data: any) => void;

export class IoTSimulationEngine {
  private static instance: IoTSimulationEngine;
  private intervalTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<StreamCallback> = new Set();

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
    if (!IoTSimulationEngine.instance) {
      IoTSimulationEngine.instance = new IoTSimulationEngine();
    }
    return IoTSimulationEngine.instance;
  }

  public getState(): SimulationState {
    return { ...this.state };
  }

  public subscribe(cb: StreamCallback): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private broadcast(eventType: string, data: any) {
    for (const sub of this.subscribers) {
      try {
        sub(eventType, data);
      } catch (err) {
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
    if (this.state.isRunning) {
      this.start();
    }
  }

  /**
   * Main simulation tick: walks each sensor/resource, updates occupancy and rates realistically
   */
  public async tick() {
    this.state.tickCount++;
    this.state.lastTickTime = new Date();

    try {
      const resources = await prisma.resource.findMany({
        include: {
          sensors: true,
        },
      });

      const updatedResources = [];
      const updatedSensors = [];

      for (const res of resources) {
        const sensor = res.sensors[0];
        if (!sensor || sensor.status === 'PAUSED' || sensor.status === 'OFFLINE') {
          continue;
        }

        let entryDelta = 0;
        let exitDelta = 0;

        // If Demo Surge Scenario is active for Central Library
        if (this.state.surgeScenarioActive && res.code === 'LIB-MAIN') {
          entryDelta = Math.floor(Math.random() * 4) + 5; // +5 to +8 people
          exitDelta = Math.floor(Math.random() * 2);      // 0 to 1 exit
        } else {
          // Mean-reverting simulation toward time-of-day target
          const hour = new Date().getHours();
          const isWeekend = [0, 6].includes(new Date().getDay());
          const targetPct = this.getTargetOccupancyPct(res.type, hour, isWeekend);
          const targetOccupancy = Math.round((targetPct / 100) * res.capacity);

          // Gentle drift toward target (max ±3 people/tick)
          const diff = targetOccupancy - res.currentOccupancy;
          let netChange = Math.sign(diff) * Math.min(3, Math.abs(diff));
          // Add realistic noise: ±1 person
          netChange += Math.round(Math.random() * 2 - 1);
          netChange = Math.max(-3, Math.min(3, netChange));

          if (netChange > 0) { entryDelta = netChange; exitDelta = 0; }
          else { entryDelta = 0; exitDelta = Math.abs(netChange); }
        }

        const netChange = entryDelta - exitDelta;
        let newOccupancy = Math.max(2, Math.min(res.capacity, res.currentOccupancy + netChange));
        let newPercent = Math.round(((newOccupancy / res.capacity) * 100) * 10) / 10;
        let newAvailable = Math.max(0, res.capacity - newOccupancy);

        let newCrowdStatus = 'QUIET';
        if (newPercent > 70) newCrowdStatus = 'CROWDED';
        else if (newPercent > 40) newCrowdStatus = 'MODERATE';

        // Update database
        const updatedRes = await prisma.resource.update({
          where: { id: res.id },
          data: {
            currentOccupancy: newOccupancy,
            occupancyPercent: newPercent,
            availableUnits: newAvailable,
            currentCrowdStatus: newCrowdStatus,
          },
        });

        const updatedSensor = await prisma.sensor.update({
          where: { id: sensor.id },
          data: {
            entryRate: Math.max(0, Math.min(30, sensor.entryRate + (Math.floor(Math.random() * 3) - 1))),
            exitRate: Math.max(0, Math.min(25, sensor.exitRate + (Math.floor(Math.random() * 3) - 1))),
            lastHeartbeat: new Date(),
          },
        });

        updatedResources.push(updatedRes);
        updatedSensors.push(updatedSensor);

        // Check for Smart Alerts
        if (newPercent >= 80 && res.occupancyPercent < 80) {
          await this.triggerAlert('CROWD', `⚠ ${res.name} has crossed 80% occupancy (${newOccupancy}/${res.capacity})!`, res.id);
        } else if (newPercent <= 35 && res.occupancyPercent > 35) {
          await this.triggerAlert('AVAILABILITY', `🔔 ${res.name} now has available capacity (${newAvailable} spaces open).`, res.id);
        }
      }

      // Broadcast tick update to connected frontend clients
      this.broadcast('TICK', {
        tickCount: this.state.tickCount,
        timestamp: this.state.lastTickTime,
        resources: updatedResources,
        sensors: updatedSensors,
        surgeScenarioActive: this.state.surgeScenarioActive,
      });
    } catch (err) {
      console.error('[IoT Simulation Tick Error]', err);
    }
  }

  /**
   * Returns a realistic target occupancy % for a resource type at a given hour
   */
  private getTargetOccupancyPct(type: string, hour: number, isWeekend: boolean): number {
    const patterns: Record<string, number[]> = {
      LIBRARY:        [5, 5, 5, 5, 5, 8, 15, 28, 45, 58, 65, 72, 78, 75, 70, 78, 82, 76, 68, 55, 42, 30, 18, 8],
      COMPUTER_LAB:   [3, 3, 3, 3, 3, 5, 12, 35, 58, 72, 82, 88, 84, 78, 82, 86, 80, 68, 52, 38, 24, 12, 5, 3],
      STUDY_ROOM:     [3, 3, 3, 3, 3, 5, 10, 20, 35, 42, 48, 55, 58, 52, 48, 55, 62, 60, 54, 42, 32, 22, 12, 5],
      CANTEEN:        [5, 5, 5, 5, 5, 8, 15, 55, 80, 72, 85, 92, 95, 88, 72, 65, 58, 55, 65, 72, 52, 35, 18, 8],
      SEMINAR_HALL:   [3, 3, 3, 3, 3, 5, 8, 15, 25, 35, 40, 42, 38, 32, 30, 28, 25, 18, 12, 8, 5, 3, 3, 3],
      CLASSROOM:      [3, 3, 3, 3, 3, 5, 10, 30, 55, 72, 80, 82, 78, 72, 68, 75, 70, 52, 38, 22, 12, 5, 3, 3],
      RESEARCH_LAB:   [3, 3, 3, 3, 3, 5, 8, 18, 32, 45, 55, 60, 58, 55, 58, 62, 60, 55, 48, 38, 28, 18, 10, 5],
      ACTIVITY_CENTER:[3, 3, 3, 3, 3, 5, 8, 15, 25, 35, 42, 48, 52, 55, 52, 55, 58, 62, 65, 60, 52, 42, 28, 12],
    };
    const pattern = patterns[type] || patterns.LIBRARY;
    let target = pattern[Math.min(hour, 23)];
    if (isWeekend && ['LIBRARY', 'COMPUTER_LAB', 'CLASSROOM', 'SEMINAR_HALL'].includes(type)) {
      target = Math.round(target * 0.55);
    }
    const variance = (Math.random() - 0.5) * 8;
    return Math.max(3, Math.min(97, target + variance));
  }

  /**
   * Helper to insert smart alert and broadcast
   */
  private async triggerAlert(type: string, message: string, resourceId: string) {
    try {
      const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      const notif = await prisma.notification.create({
        data: {
          userId: student ? student.id : null,
          resourceId,
          type,
          title: type === 'CROWD' ? 'Crowd Surge Warning' : 'Availability Alert',
          message,
          isRead: false,
        },
      });
      this.broadcast('NOTIFICATION', notif);
    } catch (err) {
      // ignore
    }
  }

  /**
   * Manual override: simulate entry on a sensor
   */
  public async simulateEntry(sensorId: string, count: number = 3) {
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
      include: { resource: true },
    });
    if (!sensor) return null;

    const res = sensor.resource;
    const newOccupancy = Math.min(res.capacity, res.currentOccupancy + count);
    const newPercent = Math.round(((newOccupancy / res.capacity) * 100) * 10) / 10;
    const newAvailable = Math.max(0, res.capacity - newOccupancy);
    const newStatus = newPercent > 70 ? 'CROWDED' : newPercent > 40 ? 'MODERATE' : 'QUIET';

    await prisma.resource.update({
      where: { id: res.id },
      data: {
        currentOccupancy: newOccupancy,
        occupancyPercent: newPercent,
        availableUnits: newAvailable,
        currentCrowdStatus: newStatus,
      },
    });

    await prisma.sensor.update({
      where: { id: sensor.id },
      data: {
        entryRate: sensor.entryRate + 2,
        lastHeartbeat: new Date(),
      },
    });

    // Save record
    await prisma.occupancyRecord.create({
      data: {
        resourceId: res.id,
        occupancy: newOccupancy,
        occupancyPercent: newPercent,
        entryCount: count,
        exitCount: 0,
      },
    });

    this.broadcast('RESOURCE_UPDATE', { resourceId: res.id, occupancyPercent: newPercent });
    return { resourceId: res.id, newOccupancy, newPercent };
  }

  /**
   * Manual override: simulate exit on a sensor
   */
  public async simulateExit(sensorId: string, count: number = 3) {
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
      include: { resource: true },
    });
    if (!sensor) return null;

    const res = sensor.resource;
    const newOccupancy = Math.max(0, res.currentOccupancy - count);
    const newPercent = Math.round(((newOccupancy / res.capacity) * 100) * 10) / 10;
    const newAvailable = Math.max(0, res.capacity - newOccupancy);
    const newStatus = newPercent > 70 ? 'CROWDED' : newPercent > 40 ? 'MODERATE' : 'QUIET';

    await prisma.resource.update({
      where: { id: res.id },
      data: {
        currentOccupancy: newOccupancy,
        occupancyPercent: newPercent,
        availableUnits: newAvailable,
        currentCrowdStatus: newStatus,
      },
    });

    await prisma.sensor.update({
      where: { id: sensor.id },
      data: {
        exitRate: sensor.exitRate + 2,
        lastHeartbeat: new Date(),
      },
    });

    await prisma.occupancyRecord.create({
      data: {
        resourceId: res.id,
        occupancy: newOccupancy,
        occupancyPercent: newPercent,
        entryCount: 0,
        exitCount: count,
      },
    });

    this.broadcast('RESOURCE_UPDATE', { resourceId: res.id, occupancyPercent: newPercent });
    return { resourceId: res.id, newOccupancy, newPercent };
  }

  /**
   * Pause / restart a sensor
   */
  public async toggleSensorStatus(sensorId: string) {
    const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) return null;

    const newStatus = sensor.status === 'ONLINE' ? 'PAUSED' : 'ONLINE';
    const updated = await prisma.sensor.update({
      where: { id: sensorId },
      data: { status: newStatus },
    });
    return updated;
  }

  /**
   * Trigger the Hackathon Demo Peak Surge Scenario
   */
  public async triggerDemoSurge() {
    this.state.surgeScenarioActive = true;
    const library = await prisma.resource.findUnique({ where: { code: 'LIB-MAIN' } });
    if (library) {
      await prisma.resource.update({
        where: { id: library.id },
        data: {
          currentOccupancy: 168,
          occupancyPercent: 84.0,
          availableUnits: 32,
          currentCrowdStatus: 'CROWDED',
        },
      });

      await this.triggerAlert(
        'CROWD',
        '⚠ Central Library is expected to reach 85% occupancy within 30 minutes.',
        library.id
      );

      // Also create a recommendation alert pointing to Study Room B
      const studyB = await prisma.resource.findUnique({ where: { code: 'SR-02' } });
      if (studyB) {
        await this.triggerAlert(
          'RECOMMENDATION',
          '💡 Study Room B currently has 75% less crowd than Central Library (only 25% full).',
          studyB.id
        );
      }
    }

    this.broadcast('SURGE_TRIGGERED', { surgeActive: true });
    return { success: true, message: 'Peak surge scenario initiated' };
  }

  /**
   * Reset simulation to baseline initial state
   */
  public async resetSimulation() {
    this.state.surgeScenarioActive = false;
    const initialMap: Record<string, { occ: number; cap: number; status: string }> = {
      'LIB-MAIN': { occ: 124, cap: 200, status: 'MODERATE' },
      'LAB-01': { occ: 66, cap: 80, status: 'CROWDED' },
      'LAB-02': { occ: 36, cap: 75, status: 'MODERATE' },
      'LAB-03': { occ: 25, cap: 60, status: 'MODERATE' },
      'SR-01': { occ: 8, cap: 24, status: 'QUIET' },
      'SR-02': { occ: 5, cap: 20, status: 'QUIET' },
      'SR-03': { occ: 6, cap: 20, status: 'QUIET' },
      'CAN-01': { occ: 220, cap: 250, status: 'CROWDED' },
    };

    for (const [code, vals] of Object.entries(initialMap)) {
      const res = await prisma.resource.findUnique({ where: { code } });
      if (res) {
        await prisma.resource.update({
          where: { id: res.id },
          data: {
            currentOccupancy: vals.occ,
            occupancyPercent: Math.round(((vals.occ / vals.cap) * 100) * 10) / 10,
            availableUnits: vals.cap - vals.occ,
            currentCrowdStatus: vals.status,
          },
        });
      }
    }

    this.broadcast('RESET', { success: true });
    return { success: true, message: 'Simulation reset to baseline' };
  }
}
