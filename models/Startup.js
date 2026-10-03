const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: { type: String, required: true },

    rawResumeText: { type: String },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    eligibilityScore: { type: Number, default: 0 },
    matchedSchemes: [{ type: String }],

    phone: {
      type: String,
      default: '',
      trim: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'shortlisted', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Startup', startupSchema);
