require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const { MongoMemoryServer } = require('mongodb-memory-server');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('../models/User');
const ProblemStatement = require('../models/ProblemStatement');
const { generateVectorEmbedding } = require('../utils/aiEngine');
const { adminUsers, problemStatements } = require('../data/seedData');

async function connectDB() {
  const cloudUri = process.env.MONGO_URI;
  if (cloudUri) {
    try {
      console.log('Connecting to MongoDB Atlas Cloud...');
      await mongoose.connect(cloudUri, { serverSelectionTimeoutMS: 3000 });
      console.log('✅ Connected to MongoDB Atlas Cloud successfully!');
      return;
    } catch (err) {
      console.warn('⚠️ Atlas connection unavailable:', err.message);
      console.log('🔄 Starting Local Embedded MongoDB Server for Seeding...');
    }
  }

  const mongoServer = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'govbridge' }
  });
  const localUri = mongoServer.getUri();
  await mongoose.connect(localUri);
  console.log('✅ Local MongoDB Database Server is Live!');
}

async function seedData() {
  try {
    console.log('🌱 Connecting to MongoDB for seeding...');
    await connectDB();

    // 1. Seed Admin Users
    for (const admin of adminUsers) {
      const existingAdmin = await User.findOne({ email: admin.email });
      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        await User.create({
          name: admin.name,
          email: admin.email,
          password: hashedPassword,
          role: 'admin'
        });
        console.log(`👑 Admin Created: ${admin.name} (${admin.email})`);
      } else {
        console.log(`ℹ️ Admin ${admin.name} (${admin.email}) already exists.`);
      }
    }

    // 2. Seed 100 Government Problem Statements
    let newCount = 0;
    for (const psData of problemStatements) {
      const existingPS = await ProblemStatement.findOne({ title: psData.title });
      if (!existingPS) {
        const vector = generateVectorEmbedding(`${psData.title} ${psData.category} ${psData.description} ${(psData.requiredSkills || []).join(' ')}`);
        await ProblemStatement.create({ ...psData, vectorEmbedding: vector });
        newCount++;
        console.log(`📌 Seeded Problem Statement: ${psData.title}`);
      }
    }

    const totalInDB = await ProblemStatement.countDocuments();
    console.log(`✨ Seed process completed successfully! Added ${newCount} new items. Total Problem Statements in DB: ${totalInDB}`);
    process.exit(0);

  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seedData();
