require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const StartupProfile = require('../models/StartupProfile');
const Startup = require('../models/Startup');
const AdminShortlisted = require('../models/AdminShortlisted');

async function viewDatabaseRecords() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/govbridge';

  try {
    console.log('\n==================================================');
    console.log('       GOVBRIDGE DATABASE RESUMES INSPECTOR       ');
    console.log('==================================================');
    console.log(`Connecting to: ${mongoUri.replace(/:([^@]+)@/, ':****@')}\n`);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully!\n');

    // 1. Fetch Startup Profiles
    const profiles = await StartupProfile.find().sort({ createdAt: -1 });
    console.log(`📌 STARTUP PROFILES (${profiles.length} total records):`);
    if (profiles.length === 0) {
      console.log('   (No startup profiles saved yet)');
    } else {
      profiles.forEach((p, idx) => {
        console.log(`\n--- Profile #${idx + 1} ---`);
        console.log(`ID:              ${p._id}`);
        console.log(`Startup Name:    ${p.startupName}`);
        console.log(`Founder:         ${p.founderName}`);
        console.log(`Sector:          ${p.sector}`);
        console.log(`Status:          ${p.status}`);
        console.log(`Score:           ${p.eligibilityScore}/100`);
        console.log(`Experience:      ${p.experienceYears} Years`);
        console.log(`Turnover:        ${p.turnover}`);
        console.log(`DPIIT Status:    ${p.dpiitRegistered ? 'Registered' : 'Not Registered'}`);
        console.log(`Resume Snippet:  ${(p.rawResumeText || '').slice(0, 100)}...`);
      });
    }

    // 2. Fetch Extracted Resumes (Startup Model)
    const startups = await Startup.find().sort({ createdAt: -1 });
    console.log(`\n\n📌 EXTRACTED RESUMES (${startups.length} total records):`);
    if (startups.length === 0) {
      console.log('   (No extracted resumes saved yet)');
    } else {
      startups.forEach((s, idx) => {
        console.log(`\n--- Resume #${idx + 1} ---`);
        console.log(`ID:              ${s._id}`);
        console.log(`Name:            ${s.name}`);
        console.log(`Email:           ${s.email}`);
        console.log(`Status:          ${s.status}`);
        console.log(`Score:           ${s.eligibilityScore}/100`);
        console.log(`Skills:          ${(s.extractedData?.skills || []).join(', ')}`);
        console.log(`Resume Snippet:  ${(s.rawResumeText || '').slice(0, 100)}...`);
      });
    }

    // 3. Fetch Admin Shortlisted
    const shortlisted = await AdminShortlisted.find().sort({ savedAt: -1 });
    console.log(`\n\n📌 ADMIN SHORTLISTED CANDIDATES (${shortlisted.length} total records):`);
    if (shortlisted.length === 0) {
      console.log('   (No admin shortlisted candidates yet)');
    } else {
      shortlisted.forEach((a, idx) => {
        console.log(`\n--- Shortlisted #${idx + 1} ---`);
        console.log(`ID:              ${a._id}`);
        console.log(`Startup Name:    ${a.startupSnapshot?.startupName}`);
        console.log(`Reason:          ${a.reasonForShortlisting}`);
        console.log(`Admin Notes:     ${a.adminNotes}`);
      });
    }

    console.log('\n==================================================\n');
    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error fetching records:', err.message);
    process.exit(1);
  }
}

viewDatabaseRecords();
