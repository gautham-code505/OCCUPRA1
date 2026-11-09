import { Router } from 'express';
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getResources);
router.get('/:id', getResourceById);
router.post('/', authenticate, requireAdmin, createResource);
router.put('/:id', authenticate, requireAdmin, updateResource);
router.delete('/:id', authenticate, requireAdmin, deleteResource);

export default router;
