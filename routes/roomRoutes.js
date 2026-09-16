// server/routes/roomRoutes.js
import express from 'express';
import {
  getApprovedRooms,
  getRoomById,
  createRoom,
  getMyRooms,
  updateRoom,
  deleteRoom,
} from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public route to search & view approved listings
router.get('/', getApprovedRooms);

// Owner-specific listings
router.get('/my-rooms', protect, authorizeRoles('owner', 'admin'), getMyRooms);

// Single room detail (public or protected view)
router.get('/:id', getRoomById);

// Owner & Admin CRUD endpoints
router.post('/', protect, authorizeRoles('owner', 'admin'), createRoom);
router.put('/:id', protect, authorizeRoles('owner', 'admin'), updateRoom);
router.delete('/:id', protect, authorizeRoles('owner', 'admin'), deleteRoom);

export default router;