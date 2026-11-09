import { Request, Response } from 'express';
import { IoTSimulationEngine } from '../simulation/engine';
import { parseClock } from '../campus/time';

export const getSimulationStatus = async (req: Request, res: Response): Promise<void> => {
  const engine = IoTSimulationEngine.getInstance();
  res.json({
    state: engine.getState(),
  });
};

export const toggleSimulation = async (req: Request, res: Response): Promise<void> => {
  const engine = IoTSimulationEngine.getInstance();
  const state = engine.getState();

  if (state.isRunning) {
    engine.stop();
  } else {
    engine.start();
  }

  res.json({
    success: true,
    state: engine.getState(),
  });
};

export const setSimulationSpeed = async (req: Request, res: Response): Promise<void> => {
  const { speed } = req.body;
  if (!['slow', 'normal', 'fast'].includes(speed)) {
    res.status(400).json({ error: 'Speed must be "slow", "normal", or "fast"' });
    return;
  }

  const engine = IoTSimulationEngine.getInstance();
  engine.setSpeed(speed);

  res.json({
    success: true,
    state: engine.getState(),
  });
};

export const triggerSurgeScenario = async (req: Request, res: Response): Promise<void> => {
  const engine = IoTSimulationEngine.getInstance();
  const result = await engine.triggerDemoSurge();
  res.json(result);
};

export const resetSimulation = async (req: Request, res: Response): Promise<void> => {
  const engine = IoTSimulationEngine.getInstance();
  const result = await engine.resetSimulation();
  res.json(result);
};

/**
 * Demo clock. Body examples:
 *   { "day": 3, "time": "12:20", "rate": 20 }  -> Wednesday 12:20, 20× faster than real time
 *   { "rate": 1 }                               -> keep time, run at real speed
 *   { "mode": "real" }                          -> back to the real wall clock
 */
export const setClock = async (req: Request, res: Response): Promise<void> => {
  const { day, time, rate, mode } = req.body ?? {};
  const engine = IoTSimulationEngine.getInstance();
  if (mode === 'real') {
    res.json({ success: true, clock: engine.setClock({ mode: 'real' }) });
    return;
  }
  const minuteOfDay = time !== undefined ? parseClock(String(time)) : undefined;
  if (time !== undefined && minuteOfDay === null) {
    res.status(400).json({ error: 'time must look like "12:20" or "02:30 PM"' });
    return;
  }
  const dow = day !== undefined ? Number(day) : undefined;
  if (dow !== undefined && (!Number.isInteger(dow) || dow < 0 || dow > 6)) {
    res.status(400).json({ error: 'day must be 0 (Sun) .. 6 (Sat)' });
    return;
  }
  const r = rate !== undefined ? Number(rate) : undefined;
  if (r !== undefined && (!Number.isFinite(r) || r < 0 || r > 120)) {
    res.status(400).json({ error: 'rate must be between 0 and 120' });
    return;
  }
  const clock = engine.setClock({ dow, minuteOfDay: minuteOfDay ?? undefined, rate: r });
  res.json({ success: true, clock });
};
