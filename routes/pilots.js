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

// POST /api/pilots/:id/daily-updates - Post daily progress update with photo/video evidence
router.post('/:id/daily-updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, progressPercentage, mediaType, mediaUrl, uploadedBy } = req.body;

    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    const newUpdate = {
      title: title || 'Daily Progress Update',
      description: description || '',
      progressPercentage: Number(progressPercentage) || 0,
      mediaType: mediaType || 'photo',
      mediaUrl: mediaUrl || '',
      uploadedBy: uploadedBy || pilot.startupName,
      uploadedAt: new Date(),
      adminReviewed: false
    };

    pilot.dailyUpdates.unshift(newUpdate);
    await pilot.save();

    res.json({
      success: true,
      message: 'Daily progress update with evidence posted successfully!',
      data: pilot.dailyUpdates[0],
      pilot
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/pilots/:id/daily-updates/:updateId/review - Admin marks update as reviewed
router.put('/:id/daily-updates/:updateId/review', async (req, res) => {
  try {
    const { id, updateId } = req.params;
    const { adminComment } = req.body;

    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    const update = pilot.dailyUpdates.id(updateId);
    if (!update) return res.status(404).json({ success: false, error: 'Daily update item not found' });

    update.adminReviewed = true;
    update.adminReviewedAt = new Date();
    if (adminComment !== undefined) update.adminComment = adminComment;

    await pilot.save();
    res.json({
      success: true,
      message: 'Daily update reviewed by Admin!',
      data: update,
      pilot
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pilots/:id/expenditures - Log expenditure (What did we spend money on?)
router.post('/:id/expenditures', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, amount, spendDate, receiptUrl, milestoneCode } = req.body;

    const pilot = await PilotLifecycle.findById(id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    if (!description || !amount) {
      return res.status(400).json({ success: false, error: 'Description and Amount are required' });
    }

    const newExpense = {
      category: category || 'Misc',
      description,
      amount: Number(amount),
      spendDate: spendDate || new Date().toISOString().split('T')[0],
      receiptUrl: receiptUrl || '',
      milestoneCode: milestoneCode || 'M1',
      loggedAt: new Date()
    };

    pilot.expenditures.unshift(newExpense);
    await pilot.save();

    res.json({
      success: true,
      message: 'Expenditure logged successfully',
      data: pilot.expenditures[0],
      pilot
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pilots/:id/financials - Financial breakdown (Paid, Balance, Spent)
router.get('/:id/financials', async (req, res) => {
  try {
    const pilot = await PilotLifecycle.findById(req.params.id);
    if (!pilot) return res.status(404).json({ success: false, error: 'Pilot not found' });

    const allocatedBudget = pilot.allocatedBudget || 5000000;
    const totalPaid = (pilot.milestones || [])
      .filter(m => m.paymentStatus === 'Paid')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalRequested = (pilot.milestones || [])
      .filter(m => m.paymentStatus === 'Requested')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const remainingBalance = allocatedBudget - totalPaid;
    const totalSpent = (pilot.expenditures || [])
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({
      success: true,
      data: {
        pilotId: pilot._id,
        startupName: pilot.startupName,
        allocatedBudget,
        totalPaid,
        totalRequested,
        remainingBalance,
        totalSpent,
        netCashOnHand: totalPaid - totalSpent,
        milestones: pilot.milestones,
        expenditures: pilot.expenditures
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function to seed initial 6 pilot teams
async function seedSamplePilots() {
  await PilotLifecycle.deleteMany({}); // clean old demo data

  const sampleData = [
    {
      title: 'AI Pest Outbreak Warning & Vernacular Advisory Pilot',
      problemStatementTitle: 'Smart Crop Advisory & Regional Pest Outbreak Warning System',
      department: 'Ministry of Agriculture & Farmers Welfare',
      startupName: 'AgriSense Innovations Pvt Ltd',
      founderName: 'Rajesh Kumar',
      contactEmail: 'contact@agrisense.in',
      allocatedBudget: 5000000,
      outcomeObjective: 'Predict pest outbreaks 7 days in advance across 50 districts with >=90% accuracy.',
      baselineTargetKPIs: 'Baseline: 45% manual field prediction -> Target: 90% automated satellite/sensor AI prediction.',
      scope: '50 Krishi Vigyan Kendras (KVKs) in Tamil Nadu, Andhra Pradesh, and Karnataka.',
      durationMonths: 6,
      status: 'Sandbox_Active',
      milestones: [
        { milestoneCode: 'M1', title: 'M1 — Sandbox Setup & SOW Signed', dueDate: 'Month 1', amount: 500000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M2', title: 'M2 — Telemetry & Sensor Deployment', dueDate: 'Month 3', amount: 1500000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M3', title: 'M3 — Vernacular AI Audio Bot Gate', dueDate: 'Month 5', amount: 2000000, verificationStatus: 'Pending', paymentStatus: 'Requested' },
        { milestoneCode: 'FinalGate', title: 'Final Gate — Scale-Up Audit', dueDate: 'Month 6', amount: 1000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' }
      ],
      dailyUpdates: [
        {
          title: 'Field Sensor Node #14 Installed in Madurai KVK',
          description: 'Deployed IoT pest traps with optical camera feed. Initial test image verified with 94.2% insect classification score.',
          progressPercentage: 65,
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1595838761569-808b8b0e87d3?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'AgriSense Engineering Team',
          uploadedAt: new Date(Date.now() - 24 * 3600 * 1000),
          adminReviewed: true,
          adminReviewedAt: new Date(Date.now() - 12 * 3600 * 1000),
          adminComment: 'Great field progress! Telemetry looks solid.'
        },
        {
          title: 'Vernacular Tamil Audio Bot Field Trial Video',
          description: 'Live farmer testing of voice query: "Fall armyworm control in maize". Video clip shows sub-2s latency.',
          progressPercentage: 70,
          mediaType: 'video',
          mediaUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'AgriSense Field Ops',
          uploadedAt: new Date(),
          adminReviewed: false
        }
      ],
      expenditures: [
        { category: 'Cloud & Hardware', description: 'Bought 25 IoT Optical Sensor Traps', amount: 450000, spendDate: '2026-09-10', milestoneCode: 'M1' },
        { category: 'R&D & AI APIs', description: 'Groq AI API Inference Credits', amount: 120000, spendDate: '2026-09-18', milestoneCode: 'M1' },
        { category: 'Field Testing & Operations', description: 'Farmer KVK Onboarding Workshops in TN', amount: 180000, spendDate: '2026-09-25', milestoneCode: 'M2' },
        { category: 'Team Salaries', description: 'Agri-AI Research Engineers Stipend', amount: 550000, spendDate: '2026-09-30', milestoneCode: 'M2' }
      ]
    },
    {
      title: 'Interoperable FHIR Health Data Exchange Pilot',
      problemStatementTitle: 'Interoperable Digital Health Records & Zero-Trust Consent Layer',
      department: 'Ministry of Health & Family Welfare',
      startupName: 'MediTrust HealthTech Solutions',
      founderName: 'Priya Sharma',
      contactEmail: 'info@meditrust.io',
      allocatedBudget: 4500000,
      outcomeObjective: 'Zero-trust FHIR medical record exchange across 10 District Hospitals without central storage.',
      baselineTargetKPIs: 'Baseline: 15 min record retrieval -> Target: < 3 sec encrypted exchange.',
      scope: '10 Government General Hospitals in Delhi NCR.',
      durationMonths: 4,
      status: 'Sandbox_Active',
      milestones: [
        { milestoneCode: 'M1', title: 'M1 — ABDM Gateway Setup', dueDate: 'Month 1', amount: 800000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M2', title: 'M2 — Record Transmission Speed', dueDate: 'Month 2', amount: 1200000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M3', title: 'M3 — CERT-In Security Clearance', dueDate: 'Month 3', amount: 1500000, verificationStatus: 'Pending', paymentStatus: 'Requested' },
        { milestoneCode: 'FinalGate', title: 'Final Gate — Scale Audit', dueDate: 'Month 4', amount: 1000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' }
      ],
      dailyUpdates: [
        {
          title: 'FHIR Vault Penetration Test & STQC Audit Log',
          description: 'Completed automated fuzzing. Zero critical vulnerabilities detected across 10 hospital consent nodes.',
          progressPercentage: 80,
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'MediTrust Lead Architect',
          uploadedAt: new Date(Date.now() - 5 * 3600 * 1000),
          adminReviewed: false
        }
      ],
      expenditures: [
        { category: 'Certifications & Audits', description: 'CERT-In Empanelled Penetration Testing Fee', amount: 350000, spendDate: '2026-09-12', milestoneCode: 'M1' },
        { category: 'Cloud & Hardware', description: 'HSM Cryptographic Key Nodes Hosting', amount: 420000, spendDate: '2026-09-20', milestoneCode: 'M2' },
        { category: 'Team Salaries', description: 'Healthcare Systems Integrators Payroll', amount: 600000, spendDate: '2026-09-28', milestoneCode: 'M2' }
      ]
    },
    {
      title: 'AI Adaptive Traffic Signal Control & Ambulance Priority Corridor',
      problemStatementTitle: 'Smart Urban Congestion Relief & Emergency Corridor Routing',
      department: 'Ministry of Housing & Urban Affairs',
      startupName: 'UrbanFlow Mobility AI',
      founderName: 'Siddharth Varma',
      contactEmail: 'contact@urbanflow.ai',
      allocatedBudget: 6000000,
      outcomeObjective: 'Reduce signal wait time by 35% and provide automated green-corridor for ambulances.',
      baselineTargetKPIs: 'Baseline: 8 min avg corridor clearance -> Target: < 2.5 min automated clearance.',
      scope: '24 busy junctions in Bengaluru Outer Ring Road.',
      durationMonths: 6,
      status: 'Sandbox_Active',
      milestones: [
        { milestoneCode: 'M1', title: 'M1 — Junction Camera Edge Node Deployment', dueDate: 'Month 1', amount: 1000000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M2', title: 'M2 — Ambulance Beacon Interoperability Test', dueDate: 'Month 3', amount: 2000000, verificationStatus: 'Pending', paymentStatus: 'Requested' },
        { milestoneCode: 'M3', title: 'M3 — Central Command Center Dashboard', dueDate: 'Month 5', amount: 2000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' },
        { milestoneCode: 'FinalGate', title: 'Final Gate — Scale Decision', dueDate: 'Month 6', amount: 1000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' }
      ],
      dailyUpdates: [
        {
          title: 'Silk Board Junction Edge AI Camera Calibration',
          description: 'Live test of traffic queue detection algorithm during peak evening rush. Accuracy at 96.1%.',
          progressPercentage: 50,
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'UrbanFlow Tech Team',
          uploadedAt: new Date(Date.now() - 18 * 3600 * 1000),
          adminReviewed: true,
          adminReviewedAt: new Date(Date.now() - 2 * 3600 * 1000),
          adminComment: 'Camera feeds approved by Bengaluru Traffic Police liaison.'
        }
      ],
      expenditures: [
        { category: 'Cloud & Hardware', description: 'NVIDIA Jetson Edge AI Computing Modules', amount: 650000, spendDate: '2026-09-05', milestoneCode: 'M1' },
        { category: 'Field Testing & Operations', description: 'Traffic Signal Pole Installation & Wiring', amount: 250000, spendDate: '2026-09-15', milestoneCode: 'M1' }
      ]
    },
    {
      title: 'Smart River Water Quality IoT & Contamination Alert Network',
      problemStatementTitle: 'Real-Time Industrial Effluent & River Quality Monitoring',
      department: 'Ministry of Jal Shakti',
      startupName: 'AquaPure IoT Networks',
      founderName: 'Ananya Roy',
      contactEmail: 'support@aquapure.org',
      allocatedBudget: 4000000,
      outcomeObjective: 'Deploy sub-surface sensor buoys detecting chemical spills within 60 seconds.',
      baselineTargetKPIs: 'Baseline: 48 hr lab testing -> Target: 60 sec real-time IoT alert.',
      scope: 'Ganges River Stretch near Kanpur & Varanasi.',
      durationMonths: 5,
      status: 'Sandbox_Active',
      milestones: [
        { milestoneCode: 'M1', title: 'M1 — Sensor Buoy Prototyping & Calibration', dueDate: 'Month 1', amount: 600000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M2', title: 'M2 — River Deployment & Solar Telemetry', dueDate: 'Month 3', amount: 1400000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M3', title: 'M3 — Pollution Control Board API Sync', dueDate: 'Month 4', amount: 1200000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' },
        { milestoneCode: 'FinalGate', title: 'Final Gate — Scale Approval', dueDate: 'Month 5', amount: 800000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' }
      ],
      dailyUpdates: [
        {
          title: 'Varanasi Ghat Buoy #03 Water Quality Sensor Stream',
          description: 'pH, Dissolved Oxygen, and heavy metal optical readings sending telemetry every 30 seconds to Jal Shakti cloud.',
          progressPercentage: 60,
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'AquaPure Field Lead',
          uploadedAt: new Date(Date.now() - 8 * 3600 * 1000),
          adminReviewed: false
        }
      ],
      expenditures: [
        { category: 'Cloud & Hardware', description: 'Submersible Optical pH & Heavy Metal Probes', amount: 720000, spendDate: '2026-09-08', milestoneCode: 'M1' },
        { category: 'R&D & AI APIs', description: 'LoRaWAN Cellular Gateway Module', amount: 180000, spendDate: '2026-09-22', milestoneCode: 'M2' }
      ]
    },
    {
      title: 'Autonomous Robotics for Municipal Solid Waste Segregation',
      problemStatementTitle: 'AI-Powered Dry vs Wet Waste Robotic Sorting System',
      department: 'Ministry of Environment, Forest & Climate Change',
      startupName: 'CleanWaste Robotics',
      founderName: 'Vikramaditya Rao',
      contactEmail: 'contact@cleanwasterobotics.com',
      allocatedBudget: 5500000,
      outcomeObjective: 'Sort 2 tonnes of municipal waste per hour with 92% classification accuracy.',
      baselineTargetKPIs: 'Baseline: 40% manual sorting efficiency -> Target: 92% robotic AI sorting speed.',
      scope: 'Indore Municipal Solid Waste Processing Plant.',
      durationMonths: 6,
      status: 'Sandbox_Active',
      milestones: [
        { milestoneCode: 'M1', title: 'M1 — Robotic Arm Assembly & Vision AI Training', dueDate: 'Month 1', amount: 1000000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M2', title: 'M2 — Conveyor Integration & High-Speed Trial', dueDate: 'Month 3', amount: 2000000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M3', title: 'M3 — 30-Day Continuous Facility Audit', dueDate: 'Month 5', amount: 1500000, verificationStatus: 'Pending', paymentStatus: 'Requested' },
        { milestoneCode: 'FinalGate', title: 'Final Gate — Municipal Procurement Gate', dueDate: 'Month 6', amount: 1000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' }
      ],
      dailyUpdates: [
        {
          title: 'Indore MSW Facility Robotic Delta Arm Test Video',
          description: 'Robotic arm picking recyclable PET bottles at 45 items per minute. Vision model trained on 50k waste items.',
          progressPercentage: 75,
          mediaType: 'video',
          mediaUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'CleanWaste Robotics Engineering',
          uploadedAt: new Date(Date.now() - 3 * 3600 * 1000),
          adminReviewed: true,
          adminReviewedAt: new Date(Date.now() - 1 * 3600 * 1000),
          adminComment: 'Impressive sorting speed! Madhya Pradesh Swachh Bharat team reviewed.'
        }
      ],
      expenditures: [
        { category: 'Cloud & Hardware', description: '4-Axis Pneumatic Delta Robotic Arm', amount: 1200000, spendDate: '2026-09-02', milestoneCode: 'M1' },
        { category: 'R&D & AI APIs', description: 'High-Speed RGB-Depth Industrial Cameras', amount: 480000, spendDate: '2026-09-14', milestoneCode: 'M1' },
        { category: 'Team Salaries', description: 'Robotics Control Systems Developers', amount: 800000, spendDate: '2026-09-29', milestoneCode: 'M2' }
      ]
    },
    {
      title: 'Zero-Trust Sovereign Cloud Threat Intelligence Sandbox',
      problemStatementTitle: 'AI Automated Threat Detection & Malware Isolation for Gov Portals',
      department: 'Ministry of Electronics & IT (MeitY / CERT-In)',
      startupName: 'CyberFortress Defense',
      founderName: 'Karthik Subbaraj',
      contactEmail: 'sec@cyberfortress.in',
      allocatedBudget: 7000000,
      outcomeObjective: 'Isolate zero-day government portal cyber threats in virtual sandbox within 300ms.',
      baselineTargetKPIs: 'Baseline: 4 hr manual malware analysis -> Target: 300ms automated AI containment.',
      scope: 'National Informatics Centre (NIC) Sovereign Data Center.',
      durationMonths: 6,
      status: 'Sandbox_Active',
      milestones: [
        { milestoneCode: 'M1', title: 'M1 — Sandbox Enclave Provisioning & eBPF Drivers', dueDate: 'Month 1', amount: 1500000, verificationStatus: 'Verified', paymentStatus: 'Paid' },
        { milestoneCode: 'M2', title: 'M2 — Simulated Ransomware & DDoS Attack Trials', dueDate: 'Month 3', amount: 2500000, verificationStatus: 'Pending', paymentStatus: 'Requested' },
        { milestoneCode: 'M3', title: 'M3 — CERT-In Red Team Stress Test', dueDate: 'Month 5', amount: 2000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' },
        { milestoneCode: 'FinalGate', title: 'Final Gate — Pan-Gov Security Certification', dueDate: 'Month 6', amount: 1000000, verificationStatus: 'Pending', paymentStatus: 'Unpaid' }
      ],
      dailyUpdates: [
        {
          title: 'eBPF Kernel Telemetry Sandbox Log Screen',
          description: 'Intercepted simulated zero-day buffer overflow payload. Process isolated in isolated MicroVM memory container.',
          progressPercentage: 55,
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
          uploadedBy: 'CyberFortress Security Red Team',
          uploadedAt: new Date(Date.now() - 14 * 3600 * 1000),
          adminReviewed: false
        }
      ],
      expenditures: [
        { category: 'Cloud & Hardware', description: 'Bare-Metal Isolated Security Enclave Servers', amount: 950000, spendDate: '2026-09-04', milestoneCode: 'M1' },
        { category: 'Certifications & Audits', description: 'Red Team Penetration Benchmark Services', amount: 400000, spendDate: '2026-09-20', milestoneCode: 'M1' }
      ]
    }
  ];

  const created = await PilotLifecycle.insertMany(sampleData);
  return created;
}

module.exports = router;
