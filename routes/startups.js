const express = require('express');
const router = express.Router();
const multer = require('multer');
const StartupProfile = require('../models/StartupProfile');
const ProblemStatement = require('../models/ProblemStatement');
const { verifyToken } = require('../middleware/authMiddleware');
const { evaluateStartupApplication } = require('../utils/aiEngine');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// POST /api/startups/evaluate - Multi-step registration evaluation API
router.post('/evaluate', upload.single('file'), async (req, res) => {
  try {
    let documentText = req.body.resumeText || '';
    
    if (req.file) {
      documentText = req.file.buffer.toString('utf-8') + '\n' + documentText;
    }

    if (!documentText.trim()) {
      documentText = `${req.body.startupName || 'Startup'} operating in ${req.body.sector || 'Tech'} with ${req.body.experienceYears || 0} years experience. Annual turnover ${req.body.turnover || '0 Lakhs'}. DPIIT status: ${req.body.dpiitRegistered ? 'Yes' : 'No'}. ${req.body.description || ''}`;
    }

    let teamMembers = [];
    if (req.body.teamMembers) {
      try {
        teamMembers = typeof req.body.teamMembers === 'string' ? JSON.parse(req.body.teamMembers) : req.body.teamMembers;
      } catch (e) {
        teamMembers = [];
      }
    }

    const metadata = {
      startupName: req.body.startupName,
      founderName: req.body.founderName,
      sector: req.body.sector,
      experienceYears: req.body.experienceYears,
      dpiitRegistered: req.body.dpiitRegistered === 'true' || req.body.dpiitRegistered === true,
      turnover: req.body.turnover
    };

    // Run Groq AI LLM Extraction & Multi-factor Evaluation
    const evaluation = await evaluateStartupApplication(documentText, metadata);

    const isEligible = evaluation.eligibilityResult.isEligible;
    const status = isEligible ? 'eligible' : 'rejected';

    // Find recommended problem statements
    const activePS = await ProblemStatement.find({ active: true });

    let newProfile = null;
    let userId = req.body.userId || (req.user ? req.user._id : null);

    // Save to Database (or update if profile exists)
    newProfile = await StartupProfile.create({
      userId: userId,
      startupName: req.body.startupName || 'Innovative Startup',
      founderName: req.body.founderName || 'Founder',
      phone: req.body.phone || '',
      location: req.body.location || 'India',
      sector: metadata.sector || 'General',
      description: req.body.description || '',
      dpiitRegistered: metadata.dpiitRegistered,
      dpiitNumber: req.body.dpiitNumber || '',
      turnover: metadata.turnover,
      experienceYears: metadata.experienceYears,
      teamMembers: teamMembers,
      rawResumeText: documentText,
      eligibilityScore: evaluation.eligibilityResult.eligibilityScore,
      eligibilityResult: evaluation.eligibilityResult,
      matchedProblemStatements: activePS.slice(0, 3).map(p => ({ id: p._id, title: p.title, department: p.department })),
      status: status,
      vectorEmbedding: evaluation.vectorEmbedding
    });

    res.json({
      success: true,
      profileId: newProfile._id,
      extractedData: evaluation.extractedData,
      eligibilityResult: evaluation.eligibilityResult,
      status: status,
      recommendedProblemStatements: activePS.map(ps => ({
        id: ps._id,
        title: ps.title,
        department: ps.department,
        category: ps.category,
        minimumExperience: ps.minimumExperience
      }))
    });

  } catch (err) {
    console.error('Evaluation Route Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Evaluation failed' });
  }
});

// GET /api/startups/my-profile - Fetch profile of logged-in user
router.get('/my-profile', verifyToken, async (req, res) => {
  try {
    const profile = await StartupProfile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'No profile found for this user.' });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/startups/my-applications - Get user applications history
router.get('/my-applications', verifyToken, async (req, res) => {
  try {
    const profiles = await StartupProfile.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: profiles.length, data: profiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
