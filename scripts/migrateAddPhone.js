// scripts/migrateAddPhone.js
// One‑off migration to add a nullable `phone` field to existing User documents.
// Run with: `node scripts/migrateAddPhone.js`

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI missing in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    console.log('✅ Connected to DB');
    const res = await User.updateMany({ phone: { $exists: false } }, { $set: { phone: null } });
    console.log(`✅ Migration complete – modified ${res.modifiedCount} user(s).`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
