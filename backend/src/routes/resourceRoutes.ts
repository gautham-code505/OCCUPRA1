import { Router } from 'express';
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController';

const router = Router();

router.get('/', getResources);
router.get('/:id', getResourceById);
router.post('/', createResource);
router.put('/:id', updateResource);
router.delete('/:id', deleteResource);

export default router;
