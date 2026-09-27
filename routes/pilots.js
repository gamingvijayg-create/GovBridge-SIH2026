const express = require('express');
const router = express.Router();
const PilotLifecycle = require('../models/PilotLifecycle');

// GET /api/pilots - Get all pilot lifecycles
router.get('/', async (req, res) => {
  try {
    let pilots = await PilotLifecycle.find().sort({ createdAt: -1 });
    if (pilots.length === 0) {
      // Auto seed sample pilot for demo
      pilots = await seedSamplePilots();
    }
    res.json({ success: true, count: pilots.length, data: pilots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pilots/:id - Get single pilot details
router.get('/:id', async (req, res) => {
  try {
    const pilot = await PilotLifecycle.findById(req.params.id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });
    res.json({ success: true, data: pilot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pilots - Create new Pilot / Sandbox Specification
router.post('/', async (req, res) => {
  try {
    const pilotData = req.body;
    if (!pilotData.milestones || pilotData.milestones.length === 0) {
      pilotData.milestones = [
        {
          milestoneCode: 'M1',
          title: 'Pilot Ready (Sandbox Setup & Security Approval)',
          description: 'Deploy sandbox environment, sign IP & cybersecurity protocols',
          dueDate: 'Month 1',
          amount: 500000,
          baselineMetric: '0% Deployment',
          targetMetric: '100% Sandbox Readiness',
          verificationStatus: 'Verified',
          paymentStatus: 'Paid'
        },
        {
          milestoneCode: 'M2',
          title: 'Evidence Achieved (Core AI Model & Field Trial)',
          description: 'Submit preliminary field trial data and KPI metric report',
          dueDate: 'Month 3',
          amount: 1500000,
          baselineMetric: '60% Accuracy',
          targetMetric: '92% Accuracy',
          verificationStatus: 'Pending',
          paymentStatus: 'Unpaid'
        },
        {
          milestoneCode: 'M3',
          title: 'Payment Gate (Full Integration & Audit Proof)',
          description: 'Complete system audit & STQC verification',
          dueDate: 'Month 5',
          amount: 2000000,
          baselineMetric: 'Manual Workflow',
          targetMetric: 'Automated Interoperable Pipeline',
          verificationStatus: 'Pending',
          paymentStatus: 'Unpaid'
        },
        {
          milestoneCode: 'FinalGate',
          title: 'Independent Validation & Scale-Up Readiness',
          description: 'Final evaluation by independent committee before GeM procurement transition',
          dueDate: 'Month 6',
          amount: 1000000,
          baselineMetric: 'Pilot Stage',
          targetMetric: 'National Scale-Up Ready',
          verificationStatus: 'Pending',
          paymentStatus: 'Unpaid'
        }
      ];
    }

    const newPilot = await PilotLifecycle.create(pilotData);
    res.json({ success: true, message: 'Pilot / Sandbox created successfully', data: newPilot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pilots/:id/milestones/:milestoneId - Update milestone performance & status
router.put('/:id/milestones/:milestoneId', async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const update = req.body;

    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    const ms = pilot.milestones.id(milestoneId);
    if (!ms) return res.status(404).json({ success: false, error: 'Milestone not found' });

    if (update.actualMetric !== undefined) ms.actualMetric = update.actualMetric;
    if (update.evidenceNotes !== undefined) ms.evidenceNotes = update.evidenceNotes;
    if (update.evidenceUrl !== undefined) ms.evidenceUrl = update.evidenceUrl;
    if (update.verificationStatus !== undefined) ms.verificationStatus = update.verificationStatus;
    if (update.issuesLogged !== undefined) ms.issuesLogged = update.issuesLogged;
    if (update.costValueBenefit !== undefined) ms.costValueBenefit = update.costValueBenefit;
    if (update.paymentStatus !== undefined) ms.paymentStatus = update.paymentStatus;

    await pilot.save();
    res.json({ success: true, message: 'Milestone updated successfully', data: pilot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pilots/:id/milestones/:milestoneId/request-payment
router.post('/:id/milestones/:milestoneId/request-payment', async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const { evidenceNotes, evidenceUrl } = req.body;

    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    const ms = pilot.milestones.id(milestoneId);
    if (!ms) return res.status(404).json({ success: false, error: 'Milestone not found' });

    ms.paymentStatus = 'Requested';
    ms.paymentRequestedAt = new Date();
    if (evidenceNotes) ms.evidenceNotes = evidenceNotes;
    if (evidenceUrl) ms.evidenceUrl = evidenceUrl;

    await pilot.save();
    res.json({ success: true, message: 'Payment request submitted to Department Admin', data: pilot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pilots/:id/milestones/:milestoneId/approve-payment
router.post('/:id/milestones/:milestoneId/approve-payment', async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    const ms = pilot.milestones.id(milestoneId);
    if (!ms) return res.status(404).json({ success: false, error: 'Milestone not found' });

    ms.paymentStatus = 'Paid';
    ms.verificationStatus = 'Verified';
    ms.paymentApprovedAt = new Date();

    await pilot.save();
    res.json({ success: true, message: 'Milestone payment approved and disbursed!', data: pilot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pilots/:id/scale-up-decision - Execute Scale-Up Decision Gate
router.post('/:id/scale-up-decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, justification, validatorNotes, gemTenderBridgeStatus } = req.body;

    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    pilot.scaleUpDecision = {
      decision,
      justification: justification || 'KPIs evaluated against baseline targets by independent committee.',
      validatorNotes: validatorNotes || 'Verified STQC security compliance & performance logs.',
      gemTenderBridgeStatus: decision === 'Scale' ? 'Published on GeM Portal (Direct Tender Bridge)' : 'N/A',
      decidedAt: new Date()
    };

    if (decision === 'Scale') pilot.status = 'Scaled_Up';
    else if (decision === 'Extend') pilot.status = 'Extended';
    else if (decision === 'Redesign') pilot.status = 'Redesign';
    else if (decision === 'Stop') pilot.status = 'Stopped';

    await pilot.save();
    res.json({ success: true, message: `Scale-Up Gate Decision recorded: ${decision}`, data: pilot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function to seed initial demo data matching the slides
async function seedSamplePilots() {
  const sampleData = [
    {
      title: 'AI Pest Outbreak Warning & Vernacular Advisory Pilot',
      problemStatementTitle: 'Smart Crop Advisory & Regional Pest Outbreak Warning System',
      department: 'Ministry of Agriculture & Farmers Welfare',
      startupName: 'AgriSense Innovations Pvt Ltd',
      founderName: 'Rajesh Kumar',
      contactEmail: 'contact@agrisense.in',
      outcomeObjective: 'Predict pest outbreaks 7 days in advance across 50 districts with >=90% accuracy.',
      baselineTargetKPIs: 'Baseline: 45% manual field prediction -> Target: 90% automated satellite/sensor AI prediction.',
      scope: '50 Krishi Vigyan Kendras (KVKs) in Tamil Nadu, Andhra Pradesh, and Karnataka.',
      durationMonths: 6,
      acceptanceCriteria: 'STQC security audit passed; latency < 2 sec for audio advisories in 4 languages.',
      cybersecurityControls: 'ISO 27001 Certified, Encrypted IoT telemetry, Zero-Trust API gateway.',
      dataHandling: 'Data hosted strictly on MeitY-empanelled Cloud (NIC Data Centre, Chennai).',
      ipOwnership: 'Core AI algorithm owned by Startup; Department retains perpetual non-exclusive government usage license.',
      riskManagement: 'Fail-safe offline SMS fallback if cellular IoT data is interrupted.',
      validationPlan: 'Independent evaluation by ICAR & STQC certified labs.',
      status: 'Sandbox_Active',
      milestones: [
        {
          milestoneCode: 'M1',
          title: 'M1 — Pilot Ready (Sandbox Setup & SOW Signed)',
          description: 'Contract approved, sandbox environment initialized, baseline sensors deployed.',
          dueDate: 'Month 1',
          amount: 500000,
          baselineMetric: '0 KVKs Connected',
          targetMetric: '5 KVKs Connected & Sandbox Live',
          actualMetric: '5 KVKs Connected & Sandbox Live',
          evidenceNotes: 'SOW signed by Ministry Director. Initial baseline dataset ingested.',
          verificationStatus: 'Verified',
          paymentStatus: 'Paid',
          paymentApprovedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000)
        },
        {
          milestoneCode: 'M2',
          title: 'M2 — Evidence Achieved (KPI Verification & Pilot Data)',
          description: 'KPI evidence submitted showing pest prediction accuracy and alerts generated.',
          dueDate: 'Month 3',
          amount: 1500000,
          baselineMetric: '45% Accuracy',
          targetMetric: '85% Accuracy',
          actualMetric: '88.4% Accuracy (Verified via 1,200 ground truth samples)',
          evidenceNotes: 'Submitted ICAR verification report & telemetry log dashboard.',
          verificationStatus: 'Verified',
          paymentStatus: 'Requested',
          paymentRequestedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
        },
        {
          milestoneCode: 'M3',
          title: 'M3 — Payment Gate (Scale Verification & Vernacular Audio)',
          description: 'Verified milestone triggering payment request package.',
          dueDate: 'Month 5',
          amount: 2000000,
          baselineMetric: 'English Only',
          targetMetric: '4 Regional Languages Live',
          actualMetric: 'Tamil, Telugu, Kannada & Hindi operational',
          evidenceNotes: 'Voice bot audio logs & farmer response surveys attached.',
          verificationStatus: 'Pending',
          paymentStatus: 'Unpaid'
        },
        {
          milestoneCode: 'FinalGate',
          title: 'Final Gate — Independent Validation & Scale-Up Bridge',
          description: 'Independent validation committee review before transition to compliant tender.',
          dueDate: 'Month 6',
          amount: 1000000,
          baselineMetric: 'Pilot Stage (50 KVKs)',
          targetMetric: 'Pan-India GeM Tender Ready',
          actualMetric: 'Pending Final Gate Committee Audit',
          evidenceNotes: 'Final compliance audit scheduled.',
          verificationStatus: 'Pending',
          paymentStatus: 'Unpaid'
        }
      ],
      scaleUpDecision: {
        decision: 'Scale',
        justification: 'Exceeded target accuracy (88.4% vs 85%). Farmer satisfaction at 94%.',
        validatorNotes: 'Independent ICAR panel recommended immediate procurement transition.',
        gemTenderBridgeStatus: 'Published on GeM Portal (Direct Tender Bridge)',
        decidedAt: new Date()
      }
    },
    {
      title: 'Interoperable FHIR Health Data Exchange Pilot',
      problemStatementTitle: 'Interoperable Digital Health Records & Zero-Trust Consent Layer',
      department: 'Ministry of Health & Family Welfare',
      startupName: 'MediTrust HealthTech Solutions',
      founderName: 'Priya Sharma',
      contactEmail: 'info@meditrust.io',
      outcomeObjective: 'Zero-trust FHIR & DICOM medical record exchange across 10 District Hospitals without central data storage.',
      baselineTargetKPIs: 'Baseline: 15 min record retrieval -> Target: < 3 sec encrypted exchange with ABDM compliance.',
      scope: '10 Government General Hospitals in Delhi NCR.',
      durationMonths: 4,
      acceptanceCriteria: 'ABDM M3 Certification, 0 data leaks during penetration testing.',
      cybersecurityControls: 'CERT-In audited, End-to-End Dynamic Consent Management.',
      dataHandling: 'Zero-storage relay architecture, patient consent validated on-chain/ABDM token.',
      ipOwnership: 'Startup retains background IP; Ministry holds perpetual license for public healthcare system.',
      riskManagement: 'Redundant HSM encryption fallback.',
      validationPlan: 'Independent review by National Health Authority (NHA) IT panel.',
      status: 'Sandbox_Active',
      milestones: [
        {
          milestoneCode: 'M1',
          title: 'M1 — Pilot Ready (ABDM Gateway Setup)',
          description: 'Gateway connected to ABDM sandbox & 2 test hospitals.',
          dueDate: 'Month 1',
          amount: 800000,
          baselineMetric: 'No Gateway',
          targetMetric: 'Gateway Operational',
          actualMetric: 'Gateway Operational',
          evidenceNotes: 'ABDM Sandbox Integration Certificate issued.',
          verificationStatus: 'Verified',
          paymentStatus: 'Paid'
        },
        {
          milestoneCode: 'M2',
          title: 'M2 — Evidence Achieved (Record Exchange Speed)',
          description: 'Demonstrate < 3 sec encrypted transmission for 10,000 synthetic patient records.',
          dueDate: 'Month 2',
          amount: 1200000,
          baselineMetric: '15 min manual',
          targetMetric: '< 3 seconds',
          actualMetric: '1.8 seconds average',
          evidenceNotes: 'Submitted load testing report by Third Party Auditor.',
          verificationStatus: 'Verified',
          paymentStatus: 'Paid'
        },
        {
          milestoneCode: 'M3',
          title: 'M3 — Payment Gate (Security & Penetration Test)',
          description: 'CERT-In empanelled auditor zero-vulnerability report.',
          dueDate: 'Month 3',
          amount: 1500000,
          baselineMetric: 'Unverified Security',
          targetMetric: 'Zero Critical Vulnerabilities',
          actualMetric: 'Audit Passed - 0 High/Critical Vulns',
          evidenceNotes: 'CERT-In Clearance Certificate uploaded.',
          verificationStatus: 'Verified',
          paymentStatus: 'Requested'
        },
        {
          milestoneCode: 'FinalGate',
          title: 'Final Gate — Independent Validation & Scale-Up',
          description: 'Final Gate committee assessment.',
          dueDate: 'Month 4',
          amount: 1000000,
          baselineMetric: '10 Hospitals',
          targetMetric: 'Ready for 500 District Hospitals',
          actualMetric: 'Audit complete',
          evidenceNotes: 'Ready for scale up decision.',
          verificationStatus: 'Pending',
          paymentStatus: 'Unpaid'
        }
      ],
      scaleUpDecision: {
        decision: 'Pending',
        justification: 'Awaiting Final Gate approval.',
        validatorNotes: 'NHA Audit report under review.',
        gemTenderBridgeStatus: 'In Review',
        decidedAt: null
      }
    }
  ];

  const created = await PilotLifecycle.insertMany(sampleData);
  return created;
}

module.exports = router;
