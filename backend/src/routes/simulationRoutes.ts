import { Router } from 'express';
import {
  getSimulationStatus,
  toggleSimulation,
  setSimulationSpeed,
  triggerSurgeScenario,
  resetSimulation,
  setClock,
} from '../controllers/simulationController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/status', getSimulationStatus);
router.post('/toggle', authenticate, requireAdmin, toggleSimulation);
router.post('/speed', authenticate, requireAdmin, setSimulationSpeed);
router.post('/trigger-surge', authenticate, requireAdmin, triggerSurgeScenario);
router.post('/reset', authenticate, requireAdmin, resetSimulation);
router.post('/clock', authenticate, requireAdmin, setClock);

export default router;
