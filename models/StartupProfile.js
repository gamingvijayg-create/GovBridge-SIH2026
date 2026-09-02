const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  skills: { type: String, default: '' },
  experienceYears: { type: Number, default: 0 },
  linkedIn: { type: String, default: '' }
}, { _id: false });

const startupProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  startupName: {
    type: String,
    required: true,
    trim: true
  },
  founderName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'India'
  },
  sector: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  dpiitRegistered: {
    type: Boolean,
    default: false
  },
  dpiitNumber: {
    type: String,
    default: ''
  },
  turnover: {
    type: String,
    default: '0 Lakhs'
  },
  experienceYears: {
    type: Number,
    default: 0
  },
  teamMembers: [teamMemberSchema],
  resumeUrl: {
    type: String,
    default: ''
  },
  rawResumeText: {
    type: String,
    default: ''
  },
  eligibilityScore: {
    type: Number,
    default: 0
  },
  eligibilityResult: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  matchedProblemStatements: {
    type: Array,
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'eligible', 'shortlisted', 'rejected'],
    default: 'pending'
  },
  vectorEmbedding: {
    type: [Number],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StartupProfile', startupProfileSchema);
