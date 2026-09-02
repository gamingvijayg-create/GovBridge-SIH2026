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

    // 1. Seed Admin User
    const adminEmail = 'admin@govbridge.gov.in';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123456', salt);
      await User.create({
        name: 'GovBridge Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('👑 Default Admin Created: admin@govbridge.gov.in / Admin@123456');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }

    // 2. Seed Sample Government Problem Statements
    const samplePS = [
      {
        title: 'Smart Crop Advisory & Regional Pest Outbreak Warning System',
        department: 'Ministry of Agriculture & Farmers Welfare',
        category: 'AgriTech',
        description: 'Development of an AI-driven, regional-language crop advisory platform that predicts pest outbreaks and irrigation timing from soil IoT sensors and weather satellite data for smallholder farmers.',
        requiredSkills: ['IoT Sensors', 'Machine Learning', 'Satellite Imagery', 'Regional Vernacular Languages', 'Agronomy Data'],
        eligibilityCriteria: 'DPIIT recognized startup, minimum 3 years AgriTech software experience, turnover >= 40 Lakhs INR.',
        minimumExperience: 3,
        dpiitRequired: true,
        minimumTurnover: '40 Lakhs',
        deadline: 'Q4 2026',
        active: true
      },
      {
        title: 'Interoperable Digital Health Records & Zero-Trust Consent Layer',
        department: 'Ministry of Health & Family Welfare',
        category: 'HealthTech',
        description: 'Creation of a high-security, consent-managed health data exchange layer that allows district government hospitals to securely exchange patient records in FHIR and DICOM formats without a central database.',
        requiredSkills: ['FHIR Standards', 'Health Data Encryption', 'ABDM Compliance', 'Zero-Trust Architecture', 'Medical Imaging'],
        eligibilityCriteria: 'DPIIT recognized startup, minimum 4 years HealthTech encryption experience, turnover >= 50 Lakhs INR.',
        minimumExperience: 4,
        dpiitRequired: true,
        minimumTurnover: '50 Lakhs',
        deadline: 'Q4 2026',
        active: true
      },
      {
        title: 'Computer-Vision Robotic Conveyor Waste Sorting System',
        department: 'Ministry of Housing & Urban Affairs',
        category: 'CleanTech',
        description: 'Deployment of low-cost edge computer-vision cameras and pneumatic sorting arms at municipal waste collection centers to automatically segregate wet waste, recyclables, and hazardous materials before landfill transport.',
        requiredSkills: ['Computer Vision', 'OpenCV', 'Edge AI Hardware', 'Robotics', 'Conveyor Automation'],
        eligibilityCriteria: 'DPIIT recognized startup, hardware prototype readiness (TRL 4+), minimum 3 years operational experience.',
        minimumExperience: 3,
        dpiitRequired: true,
        minimumTurnover: '30 Lakhs',
        deadline: 'Q4 2026',
        active: true
      },
      {
        title: 'Vernacular Micro-Lending Alternative Credit Risk Assessment Model',
        department: 'Department of Financial Services',
        category: 'FinTech',
        description: 'An AI credit-risk assessment engine for first-time rural micro-borrowers using alternative data (utility bills, local trade history, UPI transactions) instead of formal credit bureau scores.',
        requiredSkills: ['Credit Risk Analytics', 'Alternative Data Modeling', 'Vernacular UI', 'RBI Sandbox Compliance', 'FinTech APIs'],
        eligibilityCriteria: 'DPIIT recognized startup, minimum 4 years FinTech risk modeling experience, turnover >= 50 Lakhs INR.',
        minimumExperience: 4,
        dpiitRequired: true,
        minimumTurnover: '50 Lakhs',
        deadline: 'Q4 2026',
        active: true
      }
    ];

    for (const psData of samplePS) {
      const existingPS = await ProblemStatement.findOne({ title: psData.title });
      const vector = generateVectorEmbedding(`${psData.title} ${psData.category} ${psData.description} ${psData.requiredSkills.join(' ')}`);

      if (!existingPS) {
        await ProblemStatement.create({ ...psData, vectorEmbedding: vector });
        console.log(`📌 Seeded Problem Statement: ${psData.title}`);
      }
    }

    console.log('✨ Seed process completed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seedData();
