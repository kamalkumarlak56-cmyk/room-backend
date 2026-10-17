// server/controllers/adminController.js
import Room from '../models/Room.js';
import User from '../models/user.js';
import Booking from '../models/Booking.js';

// @desc    Get all rooms with optional status filtering (pending, approved, rejected)
// @route   GET /api/admin/rooms
// @access  Private (Admin only)
export const getAllRoomsForAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const rooms = await Room.find(filter)
      .populate(
        'owner',
        'name email phone profilePic role aadharDetails panDetails accountDetails createdAt'
      )
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update room status (approve or reject)
// @route   PATCH /api/admin/rooms/:id/status (also PUT)
// @access  Private (Admin only)
export const updateRoomStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

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
    if (status === 'rejected') {
      room.rejectionReason = rejectionReason || 'Did not meet verification criteria';
    } else if (status === 'approved') {
      room.rejectionReason = '';
    }

    const updatedRoom = await room.save();
    const populatedRoom = await Room.findById(updatedRoom._id).populate(
      'owner',
      'name email phone profilePic role aadharDetails panDetails accountDetails createdAt'
    );

    res.json({
      message: `Room status updated to ${status}`,
      room: populatedRoom,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics summary
// @route   GET /api/admin/stats
// @access  Private (Admin only)
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOwners = await User.countDocuments({ role: 'owner' });
    const totalAccounts = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const pendingRooms = await Room.countDocuments({ status: 'pending' });
    const approvedRooms = await Room.countDocuments({ status: 'approved' });
    const rejectedRooms = await Room.countDocuments({ status: 'rejected' });
    const totalBookings = await Booking.countDocuments({ status: 'paid' });

    res.json({
      totalUsers,
      totalOwners,
      totalAccounts,
      totalRooms,
      pendingRooms,
      approvedRooms,
      rejectedRooms,
      totalBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all registered users & owners with their posted rooms
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};

    if (role === 'owner') {
      filter.role = 'owner';
    } else if (role === 'user') {
      filter.role = 'user';
    } else if (role === 'admin') {
      filter.role = 'admin';
    }

    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
    const allRooms = await Room.find({}).sort({ createdAt: -1 }).lean();

    const roomsByOwner = {};
    for (const room of allRooms) {
      const ownerId = room.owner?.toString();
      if (!ownerId) continue;
      if (!roomsByOwner[ownerId]) {
        roomsByOwner[ownerId] = [];
      }
      roomsByOwner[ownerId].push(room);
    }

    const enrichedUsers = users.map((u) => {
      const userRooms = roomsByOwner[u._id.toString()] || [];
      return {
        ...u,
        role: u.role === 'landlord' ? 'owner' : u.role,
        rooms: userRooms,
        postedRoomsCount: userRooms.length,
        approvedRoomsCount: userRooms.filter((r) => r.status === 'approved').length,
        pendingRoomsCount: userRooms.filter((r) => r.status === 'pending').length,
        rejectedRoomsCount: userRooms.filter((r) => r.status === 'rejected').length,
      };
    });

    res.json(enrichedUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single user/owner full profile + all rooms posted + bookings
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
export const getUserFullDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rooms = await Room.find({ owner: user._id }).sort({ createdAt: -1 }).lean();
    const bookings = await Booking.find({
      $or: [{ tenant: user._id }, { landlord: user._id }],
    })
      .populate('room', 'title rent roomType location')
      .populate('tenant', 'name email phone')
      .populate('landlord', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ...user,
      role: user.role === 'landlord' ? 'owner' : user.role,
      rooms,
      bookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a user/owner and their listings (Admin control)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
export const deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete the Admin account' });
    }

    await Room.deleteMany({ owner: user._id });
    await user.deleteOne();

    res.json({ message: 'User and associated listings removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};