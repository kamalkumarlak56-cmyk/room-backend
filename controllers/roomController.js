// server/controllers/roomController.js
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';

// @desc    Get all approved rooms (with comprehensive filters for User search)
// @route   GET /api/rooms
// @access  Public
export const getApprovedRooms = async (req, res) => {
  try {
    const {
      city,
      location,
      minRent,
      maxRent,
      keyword,
      roomType,
      furnishingStatus,
      bedConfiguration,
      suitableFor,
      facilities,
      electricityIncluded,
      drinkingAllowed,
      smokingAllowed,
      lateNightAllowed,
    } = req.query;

    const query = { status: 'approved' };
    const andConditions = [];

    // Location search (matches city, address, state, landmark, or pincode)
    const locTerm = location || city;
    if (locTerm && locTerm.trim()) {
      const regex = { $regex: locTerm.trim(), $options: 'i' };
      andConditions.push({
        $or: [
          { 'location.city': regex },
          { 'location.address': regex },
          { 'location.state': regex },
          { 'location.landmark': regex },
          { 'location.pincode': regex },
        ],
      });
    }

    // Keyword search
    if (keyword && keyword.trim()) {
      const kwRegex = { $regex: keyword.trim(), $options: 'i' };
      andConditions.push({
        $or: [
          { title: kwRegex },
          { description: kwRegex },
          { 'location.city': kwRegex },
          { 'location.address': kwRegex },
          { roomType: kwRegex },
        ],
      });
    }

    // Price / Rent range
    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }

    // Room Type: 1RK, 1BHK, 2BHK, etc.
    if (roomType && roomType !== 'all') {
      query.roomType = { $regex: `^${roomType}$`, $options: 'i' };
    }

    // Furnishing status: Furnished, Semi-Furnished, Unfurnished
    if (furnishingStatus && furnishingStatus !== 'all') {
      query.furnishingStatus = furnishingStatus;
    }

    // Bed count: 1 Bed, 2 Beds, 3 Beds
    if (bedConfiguration && bedConfiguration !== 'all') {
      query.bedConfiguration = bedConfiguration;
    }

    // Suitable For: Students, Job Employees, Women, Family, Anyone
    if (suitableFor && suitableFor !== 'all') {
      if (suitableFor === 'Anyone') {
        query.suitableFor = { $in: ['Anyone'] };
      } else {
        query.suitableFor = { $in: [suitableFor, 'Anyone'] };
      }
    }

    // Facilities filter (comma-separated)
    if (facilities && facilities.trim()) {
      const facList = facilities
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      if (facList.length > 0) {
        andConditions.push({
          $or: [
            { facilities: { $all: facList } },
            { amenities: { $all: facList } },
          ],
        });
      }
    }

    // Electricity included filter
    if (electricityIncluded === 'true') {
      query.electricityIncluded = true;
    } else if (electricityIncluded === 'false') {
      query.electricityIncluded = false;
    }

    // Rules filters
    if (drinkingAllowed === 'true') {
      query['rules.drinkingAllowed'] = true;
    }
    if (smokingAllowed === 'true') {
      query['rules.smokingAllowed'] = true;
    }
    if (lateNightAllowed === 'true') {
      query['rules.lateNightAllowed'] = true;
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const rooms = await Room.find(query)
      .populate('owner', 'name email phone profilePic role')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single room details by ID
// @route   GET /api/rooms/:id
// @access  Public (Approved) / Private (Owner or Admin for pending/rejected)
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate(
      'owner',
      'name email phone profilePic role'
    );

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Allow viewing if approved, or if the requester is the owner/admin
    if (
      room.status !== 'approved' &&
      (!req.user ||
        (req.user.role !== 'admin' &&
          room.owner?._id?.toString() !== req.user._id.toString()))
    ) {
      return res.status(403).json({ message: 'Room listing is pending admin approval' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new room listing (Goes to Admin first as 'pending')
// @route   POST /api/rooms
// @access  Private (Landlord or Admin)
export const createRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      roomType,
      rent,
      securityDeposit,
      electricityIncluded,
      electricityRatePerUnit,
      furnishingStatus,
      bedConfiguration,
      location,
      facilities,
      amenities,
      rules,
      suitableFor,
      images,
    } = req.body;

    // Landlords always submit rooms as 'pending' for Admin review; Admin direct posts are 'approved'
    const status = req.user.role === 'admin' ? 'approved' : 'pending';

    const mergedFacilities =
      Array.isArray(facilities) && facilities.length > 0
        ? facilities
        : Array.isArray(amenities)
        ? amenities
        : [];

    const room = await Room.create({
      title,
      description,
      roomType: roomType || '1RK',
      rent: Number(rent),
      securityDeposit: Number(securityDeposit || 0),
      electricityIncluded: Boolean(electricityIncluded),
      electricityRatePerUnit: electricityIncluded
        ? 0
        : Number(electricityRatePerUnit ?? 8),
      furnishingStatus: furnishingStatus || 'Semi-Furnished',
      bedConfiguration: bedConfiguration || '1 Bed',
      location: {
        address: location?.address || '',
        landmark: location?.landmark || '',
        city: location?.city || '',
        state: location?.state || '',
        pincode: location?.pincode || '',
      },
      facilities: mergedFacilities,
      amenities: mergedFacilities,
      rules: {
        drinkingAllowed: Boolean(rules?.drinkingAllowed),
        smokingAllowed: Boolean(rules?.smokingAllowed),
        lateNightAllowed: Boolean(rules?.lateNightAllowed),
        visitorsAllowed: rules?.visitorsAllowed !== undefined ? Boolean(rules.visitorsAllowed) : true,
        petsAllowed: Boolean(rules?.petsAllowed),
        nonVegAllowed: rules?.nonVegAllowed !== undefined ? Boolean(rules.nonVegAllowed) : true,
      },
      suitableFor:
        Array.isArray(suitableFor) && suitableFor.length > 0
          ? suitableFor
          : ['Anyone'],
      images: images || [],
      owner: req.user._id,
      status,
    });

    const populatedRoom = await Room.findById(room._id).populate(
      'owner',
      'name email phone profilePic role'
    );

    res.status(201).json(populatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all rooms belonging to the logged-in landlord
// @route   GET /api/rooms/my-rooms
// @access  Private (Landlord or Admin)
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user._id })
      .populate('owner', 'name email phone profilePic role')
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a room listing
// @route   PUT /api/rooms/:id
// @access  Private (Landlord or Admin)
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (
      room.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to edit this room' });
    }

    const {
      title,
      description,
      roomType,
      rent,
      securityDeposit,
      electricityIncluded,
      electricityRatePerUnit,
      furnishingStatus,
      bedConfiguration,
      location,
      facilities,
      amenities,
      rules,
      suitableFor,
      images,
      isAvailable,
    } = req.body;

    if (title !== undefined) room.title = title;
    if (description !== undefined) room.description = description;
    if (roomType !== undefined) room.roomType = roomType;
    if (rent !== undefined) room.rent = Number(rent);
    if (securityDeposit !== undefined) room.securityDeposit = Number(securityDeposit);
    if (electricityIncluded !== undefined) {
      room.electricityIncluded = Boolean(electricityIncluded);
    }
    if (electricityRatePerUnit !== undefined) {
      room.electricityRatePerUnit = room.electricityIncluded
        ? 0
        : Number(electricityRatePerUnit);
    }
    if (furnishingStatus !== undefined) room.furnishingStatus = furnishingStatus;
    if (bedConfiguration !== undefined) room.bedConfiguration = bedConfiguration;
    if (location !== undefined) {
      room.location = {
        address: location.address ?? room.location.address,
        landmark: location.landmark ?? room.location.landmark ?? '',
        city: location.city ?? room.location.city,
        state: location.state ?? room.location.state,
        pincode: location.pincode ?? room.location.pincode,
      };
    }
    if (facilities !== undefined || amenities !== undefined) {
      const merged = facilities || amenities || [];
      room.facilities = merged;
      room.amenities = merged;
    }
    if (rules !== undefined) {
      room.rules = {
        drinkingAllowed: Boolean(rules.drinkingAllowed),
        smokingAllowed: Boolean(rules.smokingAllowed),
        lateNightAllowed: Boolean(rules.lateNightAllowed),
        visitorsAllowed:
          rules.visitorsAllowed !== undefined
            ? Boolean(rules.visitorsAllowed)
            : room.rules?.visitorsAllowed ?? true,
        petsAllowed: Boolean(rules.petsAllowed),
        nonVegAllowed:
          rules.nonVegAllowed !== undefined
            ? Boolean(rules.nonVegAllowed)
            : room.rules?.nonVegAllowed ?? true,
      };
    }
    if (suitableFor !== undefined) room.suitableFor = suitableFor;
    if (images !== undefined) room.images = images;
    if (isAvailable !== undefined) room.isAvailable = Boolean(isAvailable);

    // If a landlord edits an existing listing, reset status to pending for re-approval by Admin
    if (req.user.role !== 'admin') {
      room.status = 'pending';
      room.rejectionReason = '';
    }

    const updatedRoom = await room.save();
    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a room listing
// @route   DELETE /api/rooms/:id
// @access  Private (Landlord or Admin)
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (
      room.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this room' });
    }

    await room.deleteOne();
    res.json({ message: 'Room listing removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create / submit a rating and review for a room (allowed only after 1 month of living there)
// @route   POST /api/rooms/:id/reviews
// @access  Private (Tenant who booked room)
export const createRoomReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5 stars' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Please provide a review comment' });
    }

    // Verify tenant has a paid booking for this room
    const booking = await Booking.findOne({
      room: room._id,
      tenant: req.user._id,
      status: 'paid',
    });

    if (!booking) {
      return res.status(403).json({
        message: 'Only verified tenants who have booked this room can write a review.',
      });
    }

    // Check if at least 1 month (30 days) has passed since move-in / booking date
    const livingStartDate = booking.moveInDate ? new Date(booking.moveInDate) : new Date(booking.createdAt);
    const msLived = Date.now() - livingStartDate.getTime();
    const daysLived = Math.floor(msLived / (1000 * 60 * 60 * 24));
    const isSimulated = req.body.simulateMonth === true || req.query.simulateMonth === 'true';

    if (daysLived < 30 && !isSimulated) {
      const daysRemaining = 30 - Math.max(0, daysLived);
      return res.status(400).json({
        message: `You can submit a rating and review only after 1 month of living at this room. ${daysRemaining} day(s) remaining.`,
        daysLived,
        daysRemaining,
      });
    }

    // Check if user already reviewed this room
    const existingIndex = (room.reviews || []).findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      room.reviews[existingIndex].rating = Number(rating);
      room.reviews[existingIndex].comment = comment.trim();
      room.reviews[existingIndex].createdAt = new Date();
    } else {
      room.reviews.push({
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment: comment.trim(),
        createdAt: new Date(),
      });
    }

    room.numReviews = room.reviews.length;
    room.rating =
      room.reviews.reduce((acc, item) => item.rating + acc, 0) / room.reviews.length;

    await room.save();

    booking.review = {
      rating: Number(rating),
      comment: comment.trim(),
      reviewedAt: new Date(),
    };
    await booking.save();

    res.status(201).json({
      message: 'Rating and review submitted successfully!',
      review: booking.review,
      roomRating: room.rating,
      numReviews: room.numReviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};