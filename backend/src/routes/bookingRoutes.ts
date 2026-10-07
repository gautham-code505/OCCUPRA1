import { Router } from 'express';
import { getBookings, getMyBookings, createBooking, cancelBooking } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getBookings);
router.get('/my', authenticate, getMyBookings);
router.post('/', authenticate, createBooking);
router.delete('/:id', authenticate, cancelBooking);

export default router;
