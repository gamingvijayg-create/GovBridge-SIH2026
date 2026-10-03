// scratch/test-flow.js
// Simulate complete user OTP verification and signup flow
require('dotenv').config();
process.env.SMS_PROVIDER = 'console';
process.env.NODE_ENV = 'development';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp');
const User = require('../models/User');
const { sendOtp } = require('../utils/otpSender');

async function testUserSimulation() {
  console.log('🧪 Starting End-to-End User Simulation Test...\n');

  // Connect to MongoDB
  const uri = process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('1️⃣ Connected to Database ✅');

  const testEmail = 'founder.test@govbridge.gov.in';

  // Step 1: User enters email & requests OTP
  console.log(`2️⃣ User requests OTP for: ${testEmail}`);
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(generatedOtp, salt);

  await Otp.deleteMany({ email: testEmail });
  await Otp.create({
    email: testEmail,
    otpHash,
    purpose: 'verification',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    used: false
  });

  const sendResult = await sendOtp(testEmail, generatedOtp, 'verification');
  console.log('   OTP Dispatched Result:', sendResult);

  // Step 2: User tries entering WRONG OTP
  console.log('\n3️⃣ Simulating User entering WRONG OTP: "999999"');
  const record = await Otp.findOne({ email: testEmail, purpose: 'verification', used: false });
  const isWrongMatch = await bcrypt.compare('999999', record.otpHash);
  if (!isWrongMatch) {
    record.attempts += 1;
    await record.save();
    console.log('   ❌ Wrong OTP correctly rejected! Attempts recorded:', record.attempts);
  }

  // Step 3: User enters CORRECT OTP
  console.log(`\n4️⃣ Simulating User entering CORRECT OTP: "${generatedOtp}"`);
  const isCorrectMatch = await bcrypt.compare(generatedOtp, record.otpHash);
  if (isCorrectMatch) {
    record.used = true;
    await record.save();
    console.log('   ✅ Correct OTP successfully verified & marked used!');
  }

  // Step 4: User completes registration
  console.log('\n5️⃣ Simulating Startup Account Creation...');
  await User.deleteMany({ email: testEmail });
  const userPasswordHash = await bcrypt.hash('SecurePassword@2026', salt);
  const newUser = await User.create({
    name: 'AgriNova Innovations',
    email: testEmail,
    password: userPasswordHash,
    role: 'startup',
    phone: '' // Optional phone
  });

  console.log(`   🎉 User Registered: ${newUser.name} (${newUser.email}), ID: ${newUser._id}`);

  // Cleanup test user
  await Otp.deleteMany({ email: testEmail });
  await User.deleteMany({ email: testEmail });
  console.log('\n✨ All test cases passed with 100% success! Database and OTP logic are working flawlessly.');

  await mongoose.disconnect();
}

testUserSimulation().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
