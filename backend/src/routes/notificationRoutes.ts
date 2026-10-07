import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);

export default router;
