const readline = require('readline');
const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ADMIN_EMAIL_DOMAIN = '@my.sliit.lk';

const question = (prompt) =>
  new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

const createAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing. Check backend/.env configuration.');
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✓ Connected to MongoDB\n');

    // Get inputs
    let email = '';
    let password = '';
    let passwordConfirm = '';

    while (!email) {
      const rawEmail = await question('Enter admin email: ');
      email = rawEmail.trim().toLowerCase();

      if (!email.includes('@')) {
        console.log('❌ Please enter a valid email');
        email = '';
        continue;
      }

      if (!email.endsWith(ADMIN_EMAIL_DOMAIN)) {
        console.log(`❌ Admin email must end with ${ADMIN_EMAIL_DOMAIN}`);
        email = '';
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ Email already registered in the system');
      process.exit(1);
    }

    // Get password with confirmation
    while (password.length < 6) {
      password = await question('Enter admin password (min 6 characters): ');
      if (password.length < 6) {
        console.log('❌ Password must be at least 6 characters');
        password = '';
      }
    }

    while (passwordConfirm !== password) {
      passwordConfirm = await question('Confirm password: ');
      if (passwordConfirm !== password) {
        console.log('❌ Passwords do not match. Please try again.');
        passwordConfirm = '';
      }
    }

    // Create admin user
    const admin = await User.create({
      username: email.split('@')[0],
      email: email.toLowerCase(),
      password, // Will be hashed by User model pre-save hook
      role: 'admin',
      currentYear: 1,
      currentSemester: 1,
    });

    console.log('\n✓ Admin account created successfully!');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👤 Username: ${admin.username}`);
    console.log(`🔑 Role: ${admin.role}`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    rl.close();
    process.exit(1);
  }
};

createAdmin();
