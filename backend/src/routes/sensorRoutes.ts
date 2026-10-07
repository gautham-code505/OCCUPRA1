import { Router } from 'express';
import {
  getSensors,
  simulateEntry,
  simulateExit,
  toggleSensorStatus,
} from '../controllers/sensorController';

const router = Router();

router.get('/', getSensors);
router.post('/:id/simulate-entry', simulateEntry);
router.post('/:id/simulate-exit', simulateExit);
router.post('/:id/toggle-status', toggleSensorStatus);

export default router;
