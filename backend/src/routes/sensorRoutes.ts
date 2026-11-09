import { Router } from 'express';
import {
  getSensors,
  simulateEntry,
  simulateExit,
  toggleSensorStatus,
} from '../controllers/sensorController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getSensors);
router.post('/:id/simulate-entry', authenticate, requireAdmin, simulateEntry);
router.post('/:id/simulate-exit', authenticate, requireAdmin, simulateExit);
router.post('/:id/toggle-status', authenticate, requireAdmin, toggleSensorStatus);

export default router;
