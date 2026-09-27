require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

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
    // 1. Seed Admin Accounts
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
  if (cloudUri) {
    try {
      console.log('Connecting to MongoDB Atlas Cloud...');
      await mongoose.connect(cloudUri, { serverSelectionTimeoutMS: 3000 });
      console.log('Connected to MongoDB Atlas Cloud successfully!');
      await autoSeedData();
      return;
    } catch (err) {
      console.warn(' Atlas connection unavailable:', err.message);
      console.log('Starting Local Embedded MongoDB Server for Desktop Compass...');
    }
  }

  try {
    const mongoServer = await MongoMemoryServer.create({
      instance: { port: 27017, dbName: 'govbridge' }
    });
    const localUri = mongoServer.getUri();
    await mongoose.connect(localUri);
    console.log(' Local MongoDB Database Server is Live!');
    console.log(' Connect Desktop MongoDB Compass to: mongodb://127.0.0.1:27017/govbridge');
    await autoSeedData();
  } catch (localErr) {
    try {
      const mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'govbridge' } });
      const localUri = mongoServer.getUri();
      await mongoose.connect(localUri);
      console.log(' Local MongoDB Database Server is Live!');
      console.log(` Connect Desktop MongoDB Compass to: ${localUri}`);
      await autoSeedData();
    } catch (e) {
      console.error('Local DB Initialization Error:', e.message);
    }
  }
}

connectDatabase();

// Start HTTP server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GovBridge Server running on http://127.0.0.1:${PORT} and http://localhost:${PORT}`);
});
