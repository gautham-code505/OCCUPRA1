import { Router } from 'express';
import {
  getAnalyticsOverview,
  getUtilizationAnalytics,
  getTrendsAnalytics,
  getAIInsights,
} from '../controllers/analyticsController';

const router = Router();

router.get('/overview', getAnalyticsOverview);
router.get('/utilization', getUtilizationAnalytics);
router.get('/trends', getTrendsAnalytics);
router.get('/insights', getAIInsights);

export default router;
