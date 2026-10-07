import { Router } from 'express';
import { getSmartRecommendations } from '../controllers/recommendationController';

const router = Router();

router.post('/', getSmartRecommendations);

export default router;
