// server/controllers/adminController.js
import Room from '../models/Room.js';
import User from '../models/user.js';

// @desc    Get all rooms with optional status filtering (pending, approved, rejected)
// @route   GET /api/admin/rooms
// @access  Private (Admin only)
export const getAllRoomsForAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const rooms = await Room.find(filter)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update room status (approve or reject)
// @route   PATCH /api/admin/rooms/:id/status
// @access  Private (Admin only)
export const updateRoomStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Allowed values: 'approved', 'rejected', 'pending'",
      });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.status = status;
    const updatedRoom = await room.save();

    res.json({
      message: `Room status updated to ${status}`,
      room: updatedRoom,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics summary
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin only)
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOwners = await User.countDocuments({ role: 'owner' });
    const totalRooms = await Room.countDocuments();
    const pendingRooms = await Room.countDocuments({ status: 'pending' });
    const approvedRooms = await Room.countDocuments({ status: 'approved' });

    res.json({
      totalUsers,
      totalOwners,
      totalRooms,
      pendingRooms,
      approvedRooms,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all registered users
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};