require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');

// Fix Windows DNS resolution issue for MongoDB Atlas srv lookups
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback if custom DNS set fails
}

const authRoutes = require('./routes/auth');
const startupRoutes = require('./routes/startups');
const singleStartupRoutes = require('./routes/startup');
const problemStatementRoutes = require('./routes/problemStatements');
const adminRoutes = require('./routes/admin');
const extractionRoutes = require('./routes/extraction');
const pilotRoutes = require('./routes/pilots');
const selectedRoutes = require('./routes/selected');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static web UI from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/startup', singleStartupRoutes);
app.use('/api/problem-statements', problemStatementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/extraction', extractionRoutes);
app.use('/api/pilots', pilotRoutes);
app.use('/api/selected', selectedRoutes);

// Health check API endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    success: true,
    message: 'GovBridge Production Backend Running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Serve Selected Startup page
app.get('/selected', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'selected.html'));
});

// Single Page Application (SPA) Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler for APIs
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const User = require('./models/User');
const ProblemStatement = require('./models/ProblemStatement');
const bcrypt = require('bcryptjs');
const { generateVectorEmbedding } = require('./utils/aiEngine');

const { adminUsers, problemStatements } = require('./data/seedData');

async function autoSeedData() {
  try {
    // 1. Seed & Update Admin Accounts
    // Migrate legacy admin emails if present
    await User.updateOne({ email: 'vijayasarathi@govbridge.gov.in' }, { $set: { email: 'vijayasarathisarathi@gmail.com' } });
    await User.updateOne({ email: 'santhanathanush@govbridge.gov.in' }, { $set: { email: 'santhanathanush2007@gmail.com' } });

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
        console.log(`👑 Auto-Seeded Admin: ${admin.name} (${admin.email})`);
      } else {
        // Ensure admin role is set
        if (existingAdmin.role !== 'admin') {
          existingAdmin.role = 'admin';
          await existingAdmin.save();
        }
      }
    }

    // 2. Seed Problem Statements (Upsert all 100 items if missing)
    let seededCount = 0;
    for (const psData of problemStatements) {
      const existingPS = await ProblemStatement.findOne({ title: psData.title });
      if (!existingPS) {
        const vector = generateVectorEmbedding(`${psData.title} ${psData.category} ${psData.description} ${(psData.requiredSkills || []).join(' ')}`);
        await ProblemStatement.create({ ...psData, vectorEmbedding: vector });
        seededCount++;
      }
    }

    const totalPS = await ProblemStatement.countDocuments();
    console.log(`📌 Auto-Seeding Complete: Added ${seededCount} new Problem Statements. Total in DB: ${totalPS}`);

  } catch (err) {
    console.error('Auto Seed Warning:', err.message);
  }
}

// Database Connection Manager (Cloud Atlas with Local Memory Fallback)
async function connectDatabase() {
  const cloudUri = process.env.MONGO_URI;

  if (!cloudUri) {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      console.error('❌ FATAL: MONGO_URI is not set in production! Server cannot start.');
      process.exit(1);
    }
    console.warn('⚠️ MONGO_URI not set. Development mode: falling back to in-memory MongoDB.');
  } else {
    try {
      console.log('Connecting to MongoDB Atlas Cloud...');
      await mongoose.connect(cloudUri, { serverSelectionTimeoutMS: 30000 });
      console.log('✅ Connected to MongoDB Atlas Cloud successfully!');
      await autoSeedData();
      return;
    } catch (err) {
      console.error('❌ Atlas connection failed:', err.message);
      if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        process.exit(1);
      }
    }
  }

  // Local development fallback only
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'govbridge' }
  });
  await mongoose.connect(mongoServer.getUri());
  console.log('Local dev MongoDB is live');
  await autoSeedData();
}
connectDatabase();
// Start HTTP server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GovBridge Server running on http://127.0.0.1:${PORT} and http://localhost:${PORT}`);
});
