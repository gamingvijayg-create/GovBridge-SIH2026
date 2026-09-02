const mongoose = require('mongoose');

const adminShortlistedSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StartupProfile',
    required: true
  },
  startupSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  selectedProblemStatementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProblemStatement',
    required: false
  },
  eligibilityScore: {
    type: Number,
    default: 0
  },
  reasonForShortlisting: {
    type: String,
    default: 'Meets department criteria and demonstrates high domain capability.'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['shortlisted', 'in_review', 'approved_for_pilot', 'rejected'],
    default: 'shortlisted'
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AdminShortlisted', adminShortlistedSchema);
