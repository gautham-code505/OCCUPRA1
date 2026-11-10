import { Router } from 'express';
import { register, login, getMe, updateMe, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.put('/password', authenticate, changePassword);

export default router;
