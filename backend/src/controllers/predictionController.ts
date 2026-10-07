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

    const forecasts = await Promise.all(
      resources.map(async (resItem) => {
        return PredictionService.getForecastForResource(resItem.id);
      })
    );

    res.json({
      timestamp: new Date().toISOString(),
      forecasts: forecasts.filter(Boolean),
    });
  } catch (error) {
    console.error('Get all predictions overview error:', error);
    res.status(500).json({ error: 'Failed to fetch predictions overview' });
  }
};
