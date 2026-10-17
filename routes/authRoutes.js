// server/routes/authRoutes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  toggleWishlist,
  getWishlist,
  recordSearchedRoom,
  markVisitedRoom,
  addOlderRoom,
  removeOlderRoom,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

// Wishlist routes
router.post('/wishlist/:roomId', protect, toggleWishlist);
router.get('/wishlist', protect, getWishlist);

// Room tracking routes
router.post('/searched/:roomId', protect, recordSearchedRoom);
router.post('/visited/:roomId', protect, markVisitedRoom);
router.post('/older', protect, addOlderRoom);
router.delete('/older/:olderId', protect, removeOlderRoom);

export default router;