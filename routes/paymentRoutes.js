import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyBookings,
  vacateBooking,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);
router.get('/my-bookings', getMyBookings);
router.put('/bookings/:id/vacate', vacateBooking);

export default router;
