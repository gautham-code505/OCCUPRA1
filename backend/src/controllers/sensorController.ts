import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { IoTSimulationEngine } from '../simulation/engine';

export const getSensors = async (req: Request, res: Response): Promise<void> => {
  try {
    const sensors = await prisma.sensor.findMany({
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            code: true,
            capacity: true,
            currentOccupancy: true,
            occupancyPercent: true,
            currentCrowdStatus: true,
            building: true,
          },
        },
      },
      orderBy: { sensorCode: 'asc' },
    });

    const totalSensors = sensors.length;
    const onlineSensors = sensors.filter((s) => s.status === 'ONLINE').length;
    const averageHealth = totalSensors > 0
      ? Math.round(sensors.reduce((acc, s) => acc + s.healthPercent, 0) / totalSensors)
      : 0;

    res.json({
      summary: {
        totalSensors,
        onlineSensors,
        pausedSensors: sensors.filter((s) => s.status === 'PAUSED').length,
        averageHealth,
      },
      sensors,
    });
  } catch (error) {
    console.error('Get sensors error:', error);
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
};

export const simulateEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { count = 3 } = req.body;

    const engine = IoTSimulationEngine.getInstance();
    const result = await engine.simulateEntry(id, Number(count));

    if (!result) {
      res.status(404).json({ error: 'Sensor not found' });
      return;
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Simulate entry error:', error);
    res.status(500).json({ error: 'Failed to simulate entry' });
  }
};

export const simulateExit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { count = 3 } = req.body;

    const engine = IoTSimulationEngine.getInstance();
    const result = await engine.simulateExit(id, Number(count));

    if (!result) {
      res.status(404).json({ error: 'Sensor not found' });
      return;
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Simulate exit error:', error);
    res.status(500).json({ error: 'Failed to simulate exit' });
  }
};

export const toggleSensorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const engine = IoTSimulationEngine.getInstance();
    const updated = await engine.toggleSensorStatus(id);

    if (!updated) {
      res.status(404).json({ error: 'Sensor not found' });
      return;
    }

    res.json({ success: true, sensor: updated });
  } catch (error) {
    console.error('Toggle sensor status error:', error);
    res.status(500).json({ error: 'Failed to toggle sensor status' });
  }
};
