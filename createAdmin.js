// server/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

const makeAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminEmail = 'kamalkumarlak56@gmail.com';
    const adminPassword = 'admin1234';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Existing user updated to admin role successfully!');
    } else {
      // Create fresh admin user
      await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword, // Password hook will automatically hash it
        role: 'admin',
        phone: '8231050912',
      });
      console.log('New Admin account created successfully!');
    }

    console.log(`Login Email: ${adminEmail}`);
    console.log(`Login Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

makeAdmin();