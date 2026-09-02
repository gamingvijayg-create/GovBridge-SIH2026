const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    rawResumeText: { type: String },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    eligibilityScore: { type: Number, default: 0 },
    matchedSchemes: [{ type: String }],

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

