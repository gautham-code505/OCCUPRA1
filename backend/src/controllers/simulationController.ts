import { Request, Response } from 'express';
import { IoTSimulationEngine } from '../simulation/engine';

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
