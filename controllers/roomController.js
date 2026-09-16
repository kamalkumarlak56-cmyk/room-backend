// server/controllers/roomController.js
import Room from '../models/Room.js';

// @desc    Get all approved rooms (with optional city/search query)
// @route   GET /api/rooms
// @access  Public
export const getApprovedRooms = async (req, res) => {
  try {
    const { city, maxRent, keyword } = req.query;

    const query = { status: 'approved' };

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (maxRent) {
      query.rent = { $lte: Number(maxRent) };
    }

    if (keyword) {
      query.title = { $regex: keyword, $options: 'i' };
    }

    const rooms = await Room.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single room details by ID
// @route   GET /api/rooms/:id
// @access  Public
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate(
      'owner',
      'name email phone'
    );

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Allow viewing if approved, or if the requester is the owner/admin
    if (
      room.status !== 'approved' &&
      (!req.user || (req.user.role !== 'admin' && room.owner._id.toString() !== req.user._id.toString()))
    ) {
      return res.status(403).json({ message: 'Room listing is pending approval' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new room listing
// @route   POST /api/rooms
// @access  Private (Owner or Admin)
export const createRoom = async (req, res) => {
  try {
    const { title, description, rent, location, amenities, images } = req.body;

    // Admins get automatic approval; owners default to pending
    const status = req.user.role === 'admin' ? 'approved' : 'pending';

    const room = await Room.create({
      title,
      description,
      rent,
      location,
      amenities: amenities || [],
      images: images || [],
      owner: req.user._id,
      status,
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all rooms belonging to the logged-in owner
// @route   GET /api/rooms/my-rooms
// @access  Private (Owner or Admin)
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a room listing
// @route   PUT /api/rooms/:id
// @access  Private (Owner or Admin)
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Ensure the requester owns the room or is an admin
    if (room.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this room' });
    }

    const { title, description, rent, location, amenities, images } = req.body;

    room.title = title || room.title;
    room.description = description || room.description;
    room.rent = rent !== undefined ? rent : room.rent;
    room.location = location || room.location;
    room.amenities = amenities || room.amenities;
    room.images = images || room.images;

    // If an owner edits an existing listing, reset status to pending for re-approval
    if (req.user.role !== 'admin') {
      room.status = 'pending';
    }

    const updatedRoom = await room.save();
    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a room listing
// @route   DELETE /api/rooms/:id
// @access  Private (Owner or Admin)
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this room' });
    }

    await room.deleteOne();
    res.json({ message: 'Room listing removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};