import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { PredictionService } from '../services/predictionService';

export const getPredictionsForResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resourceId } = req.params;

    const forecast = await PredictionService.getForecastForResource(resourceId);

    if (!forecast) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    res.json(forecast);
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Failed to compute predictions' });
  }
};

export const getAllPredictionsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const resources = await prisma.resource.findMany({
      include: {
        sensors: true,
        predictions: {
          orderBy: { timeOffsetMinutes: 'asc' },
        },
      },
    });

    // Sequential: SQLite does not like many concurrent write transactions
    const forecasts = [];
    for (const resItem of resources) forecasts.push(await PredictionService.getForecastForResource(resItem.id));

    res.json({
      timestamp: new Date().toISOString(),
      forecasts: forecasts.filter(Boolean),
    });
  } catch (error) {
    console.error('Get all predictions overview error:', error);
    res.status(500).json({ error: 'Failed to fetch predictions overview' });
  }
};

export const getModelInfo = async (_req: Request, res: Response): Promise<void> => {
  res.json(PredictionService.modelInfo());
};
