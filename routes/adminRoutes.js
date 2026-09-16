// server/routes/adminRoutes.js
import express from 'express';
import {
  getAllRoomsForAdmin,
  updateRoomStatus,
  getAdminStats,
  getAllUsers,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth and admin-only check to all routes in this file
router.use(protect, authorizeRoles('admin'));

router.get('/stats', getAdminStats);
router.get('/rooms', getAllRoomsForAdmin);
router.patch('/rooms/:id/status', updateRoomStatus);
router.get('/users', getAllUsers);

export default router;