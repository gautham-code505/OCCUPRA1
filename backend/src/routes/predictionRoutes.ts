import { Router } from 'express';
import { getPredictionsForResource, getAllPredictionsOverview, getModelInfo } from '../controllers/predictionController';

const router = Router();

router.get('/overview', getAllPredictionsOverview);
router.get('/model-info', getModelInfo);
router.get('/:resourceId', getPredictionsForResource);

export default router;
