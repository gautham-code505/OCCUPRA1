import { prisma } from '../utils/prisma';
import { PredictionService } from './predictionService';

export interface RecommendationRequest {
  need: 'STUDY' | 'COMPUTER' | 'GROUP' | 'INDIVIDUAL' | 'CLASSROOM' | 'LAB' | 'FOOD';
  requiredSeats?: number;
  maxCrowd?: number; // e.g. 30, 50, 70
  maxDistance?: number; // meters e.g. 100, 250, 500, 1000
}

export interface RecommendedResource {
  id: string;
  name: string;
  code: string;
  type: string;
  matchScore: number;
  currentOccupancyPercent: number;
  availableUnits: number;
  capacity: number;
  distanceMeters: number;
  currentCrowdStatus: string;
  predictedInOneHour: number;
  facilities: string;
  reasons: string[];
}

export interface RecommendationResponse {
  bestMatch: RecommendedResource | null;
  alternatives: RecommendedResource[];
  totalAnalyzed: number;
  criteria: RecommendationRequest;
}

export class RecommendationService {
  public static async getRecommendations(req: RecommendationRequest): Promise<RecommendationResponse> {
    const { need, requiredSeats = 1, maxCrowd = 70, maxDistance = 1000 } = req;

    const allResources = await prisma.resource.findMany({
      include: {
        sensors: true,
      },
    });

    const scoredResources: RecommendedResource[] = [];

    for (const res of allResources) {
      const reasons: string[] = [];
      let score = 100;

      // 1. Need to Type affinity
      let typeMatch = false;
      switch (need) {
        case 'STUDY':
          typeMatch = ['STUDY_ROOM', 'LIBRARY'].includes(res.type);
          if (typeMatch) reasons.push('Optimized quiet study environment');
          break;
        case 'COMPUTER':
          typeMatch = ['COMPUTER_LAB', 'RESEARCH_LAB'].includes(res.type);
          if (typeMatch) reasons.push('High-performance desktop workstations available');
          break;
        case 'GROUP':
          typeMatch = ['STUDY_ROOM', 'SEMINAR_HALL', 'ACTIVITY_CENTER'].includes(res.type);
          if (res.facilities.toLowerCase().includes('collaborative') || res.facilities.toLowerCase().includes('pods')) {
            score += 10;
            reasons.push('Features collaborative pods & screens');
          }
          break;
        case 'INDIVIDUAL':
          typeMatch = ['STUDY_ROOM', 'LIBRARY'].includes(res.type);
          if (res.facilities.toLowerCase().includes('silent') || res.facilities.toLowerCase().includes('quiet')) {
            score += 8;
            reasons.push('Designated silent deep-focus zone');
          }
          break;
        case 'CLASSROOM':
          typeMatch = ['CLASSROOM', 'SEMINAR_HALL'].includes(res.type);
          break;
        case 'LAB':
          typeMatch = ['COMPUTER_LAB', 'RESEARCH_LAB'].includes(res.type);
          break;
        case 'FOOD':
          typeMatch = ['CANTEEN'].includes(res.type);
          break;
      }

      if (!typeMatch) {
        score -= 45; // heavy penalty for irrelevant type
      }

      // 2. Capacity & Available Units
      if (res.availableUnits < requiredSeats) {
        score -= 50; // insufficient seats
      } else {
        reasons.push(`${res.availableUnits} seats currently free (meets ${requiredSeats} requested)`);
      }

      // 3. Current Crowd Penalty
      const occPct = res.occupancyPercent;
      if (occPct > maxCrowd) {
        const excess = occPct - maxCrowd;
        score -= excess * 1.2;
      } else {
        score += (maxCrowd - occPct) * 0.4;
        if (occPct <= 35) {
          reasons.push(`Low crowd density (${Math.round(occPct)}%)`);
        }
      }

      // 4. Distance Penalty
      if (res.distanceMeters > maxDistance) {
        score -= ((res.distanceMeters - maxDistance) / 100) * 12;
      } else {
        score += ((maxDistance - res.distanceMeters) / 100) * 4;
        reasons.push(`Close proximity: ${res.distanceMeters}m away`);
      }

      // 5. 1-Hour Prediction
      const sensor = res.sensors[0];
      const entryRate = sensor ? sensor.entryRate : 4;
      const exitRate = sensor ? sensor.exitRate : 2;
      const preds = await PredictionService.calculatePredictions(
        res.occupancyPercent,
        res.capacity,
        entryRate,
        exitRate,
        res.type
      );
      const oneHourPred = preds.find((p: any) => p.timeOffsetMinutes === 60)?.predictedPercent || res.occupancyPercent;

      if (oneHourPred < 50) {
        score += 8;
        reasons.push(`Favorable 1hr forecast: projected at only ${Math.round(oneHourPred)}%`);
      } else if (oneHourPred > 80) {
        score -= 15;
      }

      // Clamp match score between 5% and 99%
      const finalMatchScore = Math.min(98, Math.max(12, Math.round(score)));

      scoredResources.push({
        id: res.id,
        name: res.name,
        code: res.code,
        type: res.type,
        matchScore: finalMatchScore,
        currentOccupancyPercent: res.occupancyPercent,
        availableUnits: res.availableUnits,
        capacity: res.capacity,
        distanceMeters: res.distanceMeters,
        currentCrowdStatus: res.currentCrowdStatus,
        predictedInOneHour: oneHourPred,
        facilities: res.facilities,
        reasons: reasons.slice(0, 3),
      });
    }

    // Sort descending by matchScore
    scoredResources.sort((a, b) => b.matchScore - a.matchScore);

    const bestMatch = scoredResources[0] || null;
    const alternatives = scoredResources.slice(1, 4);

    return {
      bestMatch,
      alternatives,
      totalAnalyzed: allResources.length,
      criteria: req,
    };
  }
}
