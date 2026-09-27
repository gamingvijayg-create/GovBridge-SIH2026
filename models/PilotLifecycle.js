const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  milestoneCode: { type: String, required: true }, // M1, M2, M3, FinalGate
  title: { type: String, required: true },
  description: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  amount: { type: Number, default: 0 }, // INR in Lakhs/Rupees
  baselineMetric: { type: String, default: '' },
  targetMetric: { type: String, default: '' },
  actualMetric: { type: String, default: '' },
  evidenceNotes: { type: String, default: '' },
  evidenceUrl: { type: String, default: '' },
  verificationStatus: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Disputed', 'Rejected'], 
    default: 'Pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Unpaid', 'Requested', 'Approved', 'Paid'], 
    default: 'Unpaid' 
  },
  paymentRequestedAt: Date,
  paymentApprovedAt: Date,
  issuesLogged: { type: String, default: '' },
  costValueBenefit: { type: String, default: '' }
});

const pilotLifecycleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  problemStatementTitle: { type: String, default: 'GovBridge Innovation Tender' },
  department: { type: String, default: 'Ministry of Electronics & IT' },
  startupName: { type: String, required: true },
  founderName: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  
  // 1. Pilot / Sandbox Specification
  outcomeObjective: { type: String, default: '' },
  baselineTargetKPIs: { type: String, default: '' },
  scope: { type: String, default: '' },
  durationMonths: { type: Number, default: 6 },
  acceptanceCriteria: { type: String, default: '' },
  cybersecurityControls: { type: String, default: 'Zero-Trust Architecture & AES-256 Encryption' },
  dataHandling: { type: String, default: 'Sovereign Government Cloud (NIC / MeitY compliant)' },
  ipOwnership: { type: String, default: 'Joint IP / Government Usage Rights with Startup IP protection' },
  riskManagement: { type: String, default: 'Continuous Monitoring & Fail-safe Rollback' },
  validationPlan: { type: String, default: 'Independent 3rd Party Audit by STQC / CERT-In' },

  // Overall Pilot Status
  status: { 
    type: String, 
    enum: ['Draft', 'Sandbox_Active', 'Milestone_In_Progress', 'Under_Independent_Validation', 'Scaled_Up', 'Extended', 'Redesign', 'Stopped'], 
    default: 'Sandbox_Active' 
  },

  // 2, 3, 4. Milestone Contract, Performance Record & Payment Requests
  milestones: [milestoneSchema],

  // 5. Scale-Up Decision Gate
  scaleUpDecision: {
    decision: { 
      type: String, 
      enum: ['Pending', 'Scale', 'Extend', 'Redesign', 'Stop'], 
      default: 'Pending' 
    },
    justification: { type: String, default: '' },
    validatorNotes: { type: String, default: '' },
    gemTenderBridgeStatus: { type: String, default: 'Not Initated' },
    decidedAt: Date
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PilotLifecycle', pilotLifecycleSchema);
