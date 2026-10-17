// server/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

const makeAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    const adminEmail = (
      process.env.ADMIN_EMAIL || 'kamalkumarlak56@gmail.com'
    )
      .toLowerCase()
      .trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
    const adminPhone = process.env.ADMIN_PHONE || '8231050912';

    // Ensure no other user has admin role (strictly only one admin)
    await User.updateMany(
      { email: { $ne: adminEmail }, role: 'admin' },
      { $set: { role: 'user' } }
    );

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.role = 'admin';
      existingAdmin.password = adminPassword;
      existingAdmin.phone = adminPhone;
      await existingAdmin.save();
      console.log('Single Super Admin account updated from .env successfully!');
    } else {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        phone: adminPhone,
      });
      console.log('New Single Super Admin account created from .env successfully!');
    }

    console.log(`Admin Name: ${adminName}`);
    console.log(`Login Email: ${adminEmail}`);
    console.log(`Login Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

makeAdmin();