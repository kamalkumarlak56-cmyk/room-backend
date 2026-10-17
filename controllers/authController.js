// server/controllers/authController.js
import User from '../models/user.js';
import Booking from '../models/Booking.js';
import generateToken from '../utils/generateToken.js';

const formatUserResponse = (user, includeToken = true) => {
  const docType =
    user.documentType ||
    (user.aadharDetails?.number ? 'aadhar' : user.panDetails?.number ? 'pan' : 'none');

  const isDocVerified =
    user.documentVerified ??
    Boolean(
      (docType === 'aadhar' && (user.aadharDetails?.documentUrl || user.aadharDetails?.number)) ||
      (docType === 'pan' && (user.panDetails?.documentUrl || user.panDetails?.number))
    );

  const response = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role === 'landlord' ? 'owner' : user.role,
    phone: user.phone || '',
    location: user.location || '',
    profilePic: user.profilePic || '',
    documentType: docType,
    documentVerified: isDocVerified,
    aadharDetails: user.aadharDetails || { number: '', documentUrl: '' },
    panDetails: user.panDetails || { number: '', documentUrl: '' },
    wishlist: user.wishlist || [],
    searchedRooms: user.searchedRooms || [],
    visitedRooms: user.visitedRooms || [],
    olderRooms: user.olderRooms || [],
    createdAt: user.createdAt,
  };
  if (includeToken) {
    response.token = generateToken(user._id);
  }
  return response;
};

// @desc    Register a new user / owner (basic details only; KYC entered later in Profile)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, location } = req.body;

    const normalizedEmail = email?.toLowerCase()?.trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Guard: Prevent self-registration as admin; allow only 'user' or 'owner'
    const assignedRole = role === 'owner' ? 'owner' : 'user';

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: assignedRole,
      phone: phone || '',
      location: location || '',
    });

    if (user) {
      res.status(201).json(formatUserResponse(user, true));
    } else {
      res.status(400).json({ message: 'Invalid user data received' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user / owner / admin & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase()?.trim() });

    if (user && (await user.matchPassword(password))) {
      res.json(formatUserResponse(user, true));
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile data with populated wishlist, searched, visited, and older rooms
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'wishlist',
        populate: { path: 'owner', select: 'name email phone profilePic' },
      })
      .populate({
        path: 'searchedRooms.room',
        populate: { path: 'owner', select: 'name email phone profilePic' },
      })
      .populate({
        path: 'visitedRooms.room',
        populate: { path: 'owner', select: 'name email phone profilePic' },
      })
      .populate({
        path: 'olderRooms.room',
        populate: { path: 'owner', select: 'name email phone profilePic' },
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const paidBookings = await Booking.find({ tenant: req.user._id, status: 'paid' })
      .populate({
        path: 'room',
        populate: { path: 'owner', select: 'name email phone profilePic' },
      })
      .populate('landlord', 'name email phone profilePic');

    const profileData = formatUserResponse(user, false);
    profileData.paidBookings = paidBookings;

    res.json(profileData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile details only (name, email, phone, location, profilePic, single document aadhar or PAN)
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      name,
      email,
      phone,
      location,
      profilePic,
      documentType,
      aadharDetails,
      panDetails,
      role,
      password,
    } = req.body;

    if (name !== undefined && name.trim()) {
      user.name = name.trim();
    }

    // Allow changing email (User ID) if unique
    if (email !== undefined && email.trim()) {
      const normalizedNewEmail = email.toLowerCase().trim();
      if (normalizedNewEmail !== user.email) {
        const emailTaken = await User.findOne({
          email: normalizedNewEmail,
          _id: { $ne: user._id },
        });
        if (emailTaken) {
          return res
            .status(400)
            .json({ message: 'This email address is already in use by another account' });
        }
        user.email = normalizedNewEmail;
      }
    }

    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (profilePic !== undefined) user.profilePic = profilePic;

    // Single document upload: user chooses either 'aadhar' or 'pan'
    const chosenDocType = documentType || user.documentType;
    if (chosenDocType === 'aadhar') {
      user.documentType = 'aadhar';
      const aNum = aadharDetails?.number !== undefined ? aadharDetails.number : user.aadharDetails?.number || '';
      const aUrl = aadharDetails?.documentUrl !== undefined ? aadharDetails.documentUrl : user.aadharDetails?.documentUrl || '';
      user.aadharDetails = {
        number: aNum,
        documentUrl: aUrl,
      };
      // Clear PAN details so only one document is retained
      user.panDetails = { number: '', documentUrl: '' };
      user.documentVerified = Boolean(aUrl || aNum);
    } else if (chosenDocType === 'pan') {
      user.documentType = 'pan';
      const pNum = panDetails?.number !== undefined ? panDetails.number.toUpperCase() : user.panDetails?.number || '';
      const pUrl = panDetails?.documentUrl !== undefined ? panDetails.documentUrl : user.panDetails?.documentUrl || '';
      user.panDetails = {
        number: pNum,
        documentUrl: pUrl,
      };
      // Clear Aadhar details so only one document is retained
      user.aadharDetails = { number: '', documentUrl: '' };
      user.documentVerified = Boolean(pUrl || pNum);
    } else if (chosenDocType === 'none') {
      user.documentType = 'none';
      user.aadharDetails = { number: '', documentUrl: '' };
      user.panDetails = { number: '', documentUrl: '' };
      user.documentVerified = false;
    }

    if (req.body.documentVerified !== undefined) {
      user.documentVerified = Boolean(req.body.documentVerified);
    }

    // Allow switching between 'user' and 'owner' role if not admin
    if (user.role !== 'admin' && (role === 'user' || role === 'owner')) {
      user.role = role;
    }

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res
          .status(400)
          .json({ message: 'New password must be at least 6 characters long' });
      }
      user.password = password.trim();
    }

    const updatedUser = await user.save();
    res.json(formatUserResponse(updatedUser, true));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change user password with old password verification
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Please enter your current/older password' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect older password. Please enter your correct current password.' });
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }

    user.password = newPassword.trim();
    await user.save();

    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle room in user wishlist (add or remove)
// @route   POST /api/auth/wishlist/:roomId
// @access  Private
export const toggleWishlist = async (req, res) => {
  try {
    const { roomId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isWishlisted = user.wishlist.some((id) => id.toString() === roomId.toString());
    if (isWishlisted) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== roomId.toString());
    } else {
      user.wishlist.unshift(roomId);
    }

    await user.save();
    res.json({
      wishlist: user.wishlist,
      isWishlisted: !isWishlisted,
      message: !isWishlisted ? 'Room added to wishlist' : 'Room removed from wishlist',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's wishlisted rooms
// @route   GET /api/auth/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: { path: 'owner', select: 'name email phone profilePic' },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record a room as searched/viewed by user
// @route   POST /api/auth/searched/:roomId
// @access  Private
export const recordSearchedRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove if already in searched list to move to top
    user.searchedRooms = (user.searchedRooms || []).filter(
      (item) => item.room && item.room.toString() !== roomId.toString()
    );
    user.searchedRooms.unshift({ room: roomId, searchedAt: new Date() });
    if (user.searchedRooms.length > 30) {
      user.searchedRooms = user.searchedRooms.slice(0, 30);
    }

    await user.save();
    res.json({ message: 'Searched room recorded', count: user.searchedRooms.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark room as visited
// @route   POST /api/auth/visited/:roomId
// @access  Private
export const markVisitedRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { notes } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existsIndex = (user.visitedRooms || []).findIndex(
      (item) => item.room && item.room.toString() === roomId.toString()
    );

    if (existsIndex > -1) {
      if (req.query.action === 'remove') {
        user.visitedRooms.splice(existsIndex, 1);
      } else {
        user.visitedRooms[existsIndex].visitedAt = new Date();
        if (notes) user.visitedRooms[existsIndex].notes = notes;
      }
    } else {
      user.visitedRooms.unshift({
        room: roomId,
        visitedAt: new Date(),
        notes: notes || '',
      });
    }

    await user.save();
    res.json({ message: 'Visited status updated', visitedRooms: user.visitedRooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add an older room where user lived before
// @route   POST /api/auth/older
// @access  Private
export const addOlderRoom = async (req, res) => {
  try {
    const { roomId, title, location, rent, stayDuration, notes } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.olderRooms.unshift({
      room: roomId || null,
      title: title || 'Previous Room/Apartment',
      location: location || '',
      rent: Number(rent) || 0,
      stayDuration: stayDuration || '',
      notes: notes || '',
      addedAt: new Date(),
    });

    await user.save();
    res.status(201).json({ message: 'Older room recorded', olderRooms: user.olderRooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove an older room record
// @route   DELETE /api/auth/older/:olderId
// @access  Private
export const removeOlderRoom = async (req, res) => {
  try {
    const { olderId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.olderRooms = (user.olderRooms || []).filter(
      (item) => item._id && item._id.toString() !== olderId.toString()
    );

    await user.save();
    res.json({ message: 'Older room removed', olderRooms: user.olderRooms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};