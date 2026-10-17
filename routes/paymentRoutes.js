// server/routes/paymentRoutes.js
import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyBookings,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);
router.get('/my-bookings', getMyBookings);

export default router;
