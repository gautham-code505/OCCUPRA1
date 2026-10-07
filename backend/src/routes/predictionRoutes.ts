import { Router } from 'express';
import { getPredictionsForResource, getAllPredictionsOverview } from '../controllers/predictionController';

const router = Router();

router.get('/overview', getAllPredictionsOverview);
router.get('/:resourceId', getPredictionsForResource);

export default router;
