const mongoose = require('mongoose');

const problemStatementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requiredSkills: [{
    type: String
  }],
  eligibilityCriteria: {
    type: String,
    default: 'DPIIT recognized startup, minimum 3 years experience, valid turnover.'
  },
  minimumExperience: {
    type: Number,
    default: 3
  },
  dpiitRequired: {
    type: Boolean,
    default: true
  },
  minimumTurnover: {
    type: String,
    default: '40 Lakhs'
  },
  deadline: {
    type: String,
    default: 'Q4 2026'
  },
  active: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('ProblemStatement', problemStatementSchema);
