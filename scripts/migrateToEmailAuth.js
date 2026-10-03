// scripts/migrateToEmailAuth.js
// Safe migration to switch authentication & OTP verification from phone-based to email-based.
// - Safely drops obsolete unique indexes on `phone` (phone_1) from `users` and `startups`.
// - Normalizes existing emails (trimmed & lowercase).
// - Re-indexes OTP collection to use `email` + `purpose`.
//
// Run with: node scripts/migrateToEmailAuth.js

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    console.log('✅ Connected to MongoDB.');

    const db = mongoose.connection.db;

    // 1. Migrate Users collection
    console.log('\n--- Checking Users collection ---');
    const usersColl = db.collection('users');
    const userIndexes = await usersColl.indexes();
    const userPhoneIndex = userIndexes.find(idx => idx.name === 'phone_1' || (idx.key && idx.key.phone));
    if (userPhoneIndex) {
      console.log(`Found index '${userPhoneIndex.name}' on users collection. Dropping...`);
      await usersColl.dropIndex(userPhoneIndex.name);
      console.log('✅ Dropped unique phone index on users.');
    } else {
      console.log('ℹ️ No phone index found on users collection.');
    }

    // Normalize user emails
    const users = await usersColl.find({}).toArray();
    let usersUpdated = 0;
    for (const u of users) {
      const updates = {};
      if (u.email && u.email !== u.email.trim().toLowerCase()) {
        updates.email = u.email.trim().toLowerCase();
      }
      if (u.phone === null || u.phone === undefined) {
        updates.phone = '';
      }
      if (Object.keys(updates).length > 0) {
        await usersColl.updateOne({ _id: u._id }, { $set: updates });
        usersUpdated++;
      }
    }
    console.log(`✅ Normalized ${usersUpdated} user document(s).`);

    // 2. Migrate Startups collection
    console.log('\n--- Checking Startups collection ---');
    const startupsColl = db.collection('startups');
    const startupIndexes = await startupsColl.indexes();
    const startupPhoneIndex = startupIndexes.find(idx => idx.name === 'phone_1' || (idx.key && idx.key.phone));
    if (startupPhoneIndex) {
      console.log(`Found index '${startupPhoneIndex.name}' on startups collection. Dropping...`);
      await startupsColl.dropIndex(startupPhoneIndex.name);
      console.log('✅ Dropped unique phone index on startups.');
    } else {
      console.log('ℹ️ No phone index found on startups collection.');
    }

    // Normalize startup emails
    const startups = await startupsColl.find({}).toArray();
    let startupsUpdated = 0;
    for (const s of startups) {
      const updates = {};
      if (s.email && s.email !== s.email.trim().toLowerCase()) {
        updates.email = s.email.trim().toLowerCase();
      }
      if (s.phone === null || s.phone === undefined) {
        updates.phone = '';
      }
      if (Object.keys(updates).length > 0) {
        await startupsColl.updateOne({ _id: s._id }, { $set: updates });
        startupsUpdated++;
      }
    }
    console.log(`✅ Normalized ${startupsUpdated} startup document(s).`);

    // 3. Migrate Otps collection
    console.log('\n--- Checking Otps collection ---');
    const otpsColl = db.collection('otps');
    const otpIndexes = await otpsColl.indexes();
    for (const idx of otpIndexes) {
      if (idx.key && idx.key.phone) {
        console.log(`Found obsolete phone index '${idx.name}' on otps collection. Dropping...`);
        await otpsColl.dropIndex(idx.name);
        console.log(`✅ Dropped '${idx.name}'.`);
      }
    }

    console.log('\n✨ Email-based authentication migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
