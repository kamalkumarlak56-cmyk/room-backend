// server/models/Room.js
import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for the room'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a room description'],
    },
    roomType: {
      type: String,
      enum: ['1RK', '1BHK', '2BHK', '3BHK', 'Single Room', 'PG/Shared'],
      default: '1RK',
      required: true,
    },
    rent: {
      type: Number,
      required: [true, 'Please provide the monthly rent'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    electricityIncluded: {
      type: Boolean,
      default: false,
    },
    electricityRatePerUnit: {
      type: Number,
      default: 8, // INR per unit if electricity is not included
    },
    furnishingStatus: {
      type: String,
      enum: ['Furnished', 'Semi-Furnished', 'Unfurnished'],
      default: 'Semi-Furnished',
    },
    bedConfiguration: {
      type: String,
      enum: ['1 Bed', '2 Beds', '3 Beds', '4+ Beds', 'No Bed'],
      default: '1 Bed',
    },
    location: {
      address: { type: String, required: true },
      landmark: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    // Main facilities: Parking, Camera, AC, Cooler, Washing Machine, RO, etc.
    facilities: {
      type: [String],
      default: [],
    },
    // Legacy/alias field kept in sync
    amenities: {
      type: [String],
      default: [],
    },
    // House rules / other facilities: drinking allow, smoking allow, late night allow, etc.
    rules: {
      drinkingAllowed: { type: Boolean, default: false },
      smokingAllowed: { type: Boolean, default: false },
      lateNightAllowed: { type: Boolean, default: false },
      visitorsAllowed: { type: Boolean, default: true },
      petsAllowed: { type: Boolean, default: false },
      nonVegAllowed: { type: Boolean, default: true },
    },
    // Target tenants: Students, Job Employees, Women, Family, Anyone
    suitableFor: {
      type: [String],
      default: ['Anyone'],
    },
    images: {
      type: [String],
      default: [],
    },
    videos: {
      type: [String],
      default: [],
    },
    videoUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model('Room', roomSchema);

export default Room;