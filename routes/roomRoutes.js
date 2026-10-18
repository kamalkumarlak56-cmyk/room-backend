import express from 'express';
import {
  getApprovedRooms,
  getRoomById,
  createRoom,
  getMyRooms,
  updateRoom,
  deleteRoom,
  toggleRoomAvailability,
  createRoomReview,
} from '../controllers/roomController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public route to search & view approved listings
router.get('/', getApprovedRooms);

// Owner-specific listings
router.get('/my-rooms', protect, authorizeRoles('owner', 'admin'), getMyRooms);

// Single room detail (public for approved, protected for owner/admin)
router.get('/:id', optionalProtect, getRoomById);

// Room Reviews (Allowed after 1 month of living in the booked room)
router.post('/:id/reviews', protect, createRoomReview);

// Owner & Admin CRUD endpoints
router.post('/', protect, authorizeRoles('owner', 'admin'), createRoom);
router.put('/:id', protect, authorizeRoles('owner', 'admin'), updateRoom);
router.patch('/:id/availability', protect, authorizeRoles('owner', 'admin'), toggleRoomAvailability);
router.delete('/:id', protect, authorizeRoles('owner', 'admin'), deleteRoom);

export default router;