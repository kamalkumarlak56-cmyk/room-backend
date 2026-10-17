// server/config/db.js
import mongoose from 'mongoose';
import User from '../models/user.js';

const seedInitialAdmin = async () => {
  try {
    // Migrate any legacy 'landlord' role strings to 'owner'
    await User.updateMany({ role: 'landlord' }, { $set: { role: 'owner' } });

    // Check if an admin already exists in DB (preserve any edits made by admin)
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return;
    }

    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    const adminEmail = (
      process.env.ADMIN_EMAIL || 'kamalkumarlak56@gmail.com'
    )
      .toLowerCase()
      .trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
    const adminPhone = process.env.ADMIN_PHONE || '8231050912';

    const userWithAdminEmail = await User.findOne({ email: adminEmail });
    if (userWithAdminEmail) {
      userWithAdminEmail.role = 'admin';
      if (!userWithAdminEmail.name) userWithAdminEmail.name = adminName;
      await userWithAdminEmail.save();
      console.log(`Initial Admin role assigned to ${adminEmail}`);
    } else {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        phone: adminPhone,
      });
      console.log(`Initial Admin created from .env (${adminEmail})`);
    }
  } catch (err) {
    console.error('Admin seed check error:', err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
    await seedInitialAdmin();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;