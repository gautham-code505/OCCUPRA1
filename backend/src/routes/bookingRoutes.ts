import { Router } from 'express';
import { getBookings, getMyBookings, createBooking, cancelBooking } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getBookings);
router.get('/my', authenticate, getMyBookings);
router.post('/', createBooking);
router.delete('/:id', cancelBooking);

export default router;
