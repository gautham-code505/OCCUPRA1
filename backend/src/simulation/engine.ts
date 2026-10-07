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
          // Normal realistic drift
          const randomFactor = (Math.random() - 0.48); // slightly bias forward during day
          entryDelta = Math.max(0, Math.round(sensor.entryRate + (Math.random() * 4 - 2)));
          exitDelta = Math.max(0, Math.round(sensor.exitRate + (Math.random() * 4 - 2)));

          // Limit step change to 1-3 people per tick to guarantee smooth realism
          const step = Math.sign(entryDelta - exitDelta) * Math.min(3, Math.abs(entryDelta - exitDelta));
          if (step > 0) entryDelta = step; else { exitDelta = Math.abs(step); entryDelta = 0; }
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
            entryRate: Math.max(0, sensor.entryRate + (Math.floor(Math.random() * 3) - 1)),
            exitRate: Math.max(0, sensor.exitRate + (Math.floor(Math.random() * 3) - 1)),
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
