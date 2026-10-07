import { Router } from 'express';
import {
  getSimulationStatus,
  toggleSimulation,
  setSimulationSpeed,
  triggerSurgeScenario,
  resetSimulation,
} from '../controllers/simulationController';

const router = Router();

router.get('/status', getSimulationStatus);
router.post('/toggle', toggleSimulation);
router.post('/speed', setSimulationSpeed);
router.post('/trigger-surge', triggerSurgeScenario);
router.post('/reset', resetSimulation);

export default router;
