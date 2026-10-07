import { Request, Response } from 'express';
import { RecommendationService, RecommendationRequest } from '../services/recommendationService';

export const getSmartRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { need, requiredSeats, maxCrowd, maxDistance } = req.body as RecommendationRequest;

    if (!need) {
      res.status(400).json({ error: 'Field "need" is required (STUDY, COMPUTER, GROUP, INDIVIDUAL, CLASSROOM, LAB, FOOD)' });
      return;
    }

    const result = await RecommendationService.getRecommendations({
      need,
      requiredSeats: requiredSeats ? Number(requiredSeats) : 1,
      maxCrowd: maxCrowd ? Number(maxCrowd) : 70,
      maxDistance: maxDistance ? Number(maxDistance) : 1000,
    });

    res.json(result);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to calculate smart recommendations' });
  }
};
