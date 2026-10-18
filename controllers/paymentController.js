// server/controllers/paymentController.js
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

// @desc    Create Razorpay Order for room booking / rent payment (0% Brokerage)
// @route   POST /api/payments/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  try {
    const { roomId, paymentType = 'full_rent', moveInDate = '' } = req.body;

    // Guard: One user can book only one room at once
    const existingActiveBooking = await Booking.findOne({
      tenant: req.user._id,
      status: 'paid',
    }).populate('room', 'title');

    if (existingActiveBooking) {
      return res.status(400).json({
        message: `You already have an active booked room ("${existingActiveBooking.room?.title || 'Active Booking'}"). A user can only book one room at once.`,
      });
    }

    const room = await Room.findById(roomId).populate('owner', 'name email phone');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isAvailable) {
      return res.status(400).json({ message: 'This room is already booked and not currently available.' });
    }

    const amountInRupees =
      paymentType === 'token_advance'
        ? Math.max(1000, Math.round(room.rent * 0.25))
        : room.rent;

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const hasRealKeys =
      Boolean(keyId && keySecret) &&
      !keyId.includes('your_') &&
      !keySecret.includes('your_');

    let razorpayOrderId = `order_rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let isSimulation = true;

    if (hasRealKeys) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountInRupees * 100, // in paise
          currency: 'INR',
          receipt: `room_${room._id}_${Date.now()}`.slice(0, 40),
        }),
      });

      if (response.ok) {
        const orderData = await response.json();
        razorpayOrderId = orderData.id;
        isSimulation = false;
      }
    }

    const booking = await Booking.create({
      room: room._id,
      tenant: req.user._id,
      landlord: room.owner._id,
      amount: amountInRupees,
      paymentType,
      moveInDate,
      razorpayOrderId,
      status: 'created',
    });

    res.status(201).json({
      bookingId: booking._id,
      orderId: razorpayOrderId,
      amount: amountInRupees * 100,
      amountInRupees,
      currency: 'INR',
      keyId: hasRealKeys ? keyId : 'rzp_test_demo_roomradar',
      isSimulation,
      roomTitle: room.title,
      landlordName: room.owner?.name || 'Landlord',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay payment signature & confirm booking
// @route   POST /api/payments/verify
// @access  Private
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isSimulation,
    } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking record not found' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const hasRealSecret = Boolean(keySecret) && !keySecret.includes('your_');

    if (hasRealSecret && !isSimulation) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        booking.status = 'failed';
        await booking.save();
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }

    booking.razorpayPaymentId =
      razorpay_payment_id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    booking.razorpaySignature = razorpay_signature || 'verified_razorpay_signature';
    booking.status = 'paid';
    await booking.save();

    await Room.findByIdAndUpdate(booking.room, { isAvailable: false });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('room', 'title rent roomType location images')
      .populate('tenant', 'name email phone')
      .populate('landlord', 'name email phone');

    res.json({
      message: 'Payment verified and room booked successfully!',
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings for logged-in user (as tenant and as landlord)
// @route   GET /api/payments/my-bookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const [tenantBookings, landlordBookings] = await Promise.all([
      Booking.find({ tenant: req.user._id, status: { $in: ['paid', 'vacated'] } })
        .populate('room', 'title rent roomType location images isAvailable')
        .populate('landlord', 'name email phone profilePic')
        .sort({ createdAt: -1 }),
      Booking.find({ landlord: req.user._id, status: { $in: ['paid', 'vacated'] } })
        .populate('room', 'title rent roomType location images isAvailable')
        .populate('tenant', 'name email phone profilePic')
        .sort({ createdAt: -1 }),
    ]);

    res.json({
      tenantBookings,
      landlordBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a tenant booking as vacated / past tenant & make room available
// @route   PUT /api/payments/bookings/:id/vacate
// @access  Private (Landlord or Admin)
export const vacateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (
      booking.landlord.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to manage this booking' });
    }

    booking.status = 'vacated';
    booking.isCurrentTenant = false;
    booking.vacatedAt = new Date();
    await booking.save();

    // Mark room back to available
    await Room.findByIdAndUpdate(booking.room, { isAvailable: true });

    const updated = await Booking.findById(booking._id)
      .populate('room', 'title rent roomType location images isAvailable')
      .populate('tenant', 'name email phone profilePic');

    res.json({
      message: 'Tenant marked as vacated and room is now available again',
      booking: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

