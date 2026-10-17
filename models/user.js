// server/models/user.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: ['user', 'owner', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    profilePic: {
      type: String,
      default: '',
    },
    documentType: {
      type: String,
      enum: ['aadhar', 'pan', 'none'],
      default: 'none',
    },
    aadharDetails: {
      number: { type: String, default: '' },
      documentUrl: { type: String, default: '' },
    },
    panDetails: {
      number: { type: String, default: '' },
      documentUrl: { type: String, default: '' },
    },
    documentVerified: {
      type: Boolean,
      default: false,
    },
    accountDetails: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
      },
    ],
    searchedRooms: [
      {
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
        searchedAt: { type: Date, default: Date.now },
      },
    ],
    visitedRooms: [
      {
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
        visitedAt: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
    olderRooms: [
      {
        room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
        title: { type: String, default: '' },
        location: { type: String, default: '' },
        rent: { type: Number, default: 0 },
        stayDuration: { type: String, default: '' },
        notes: { type: String, default: '' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to database.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify entered password against hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;