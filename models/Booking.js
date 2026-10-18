// server/models/Booking.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['token_advance', 'full_rent'],
      default: 'full_rent',
    },
    moveInDate: {
      type: String,
      default: '',
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'vacated', 'failed'],
      default: 'created',
    },
    isCurrentTenant: {
      type: Boolean,
      default: true,
    },
    vacatedAt: {
      type: Date,
    },
    review: {
      rating: { type: Number, default: 0 },
      comment: { type: String, default: '' },
      reviewedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
