import { Router } from 'express';
import { getOccupancyOverview, getResourceOccupancy } from '../controllers/occupancyController';

const router = Router();

router.get('/', getOccupancyOverview);
router.get('/:resourceId', getResourceOccupancy);

export default router;
