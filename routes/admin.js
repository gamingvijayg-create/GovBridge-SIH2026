const express = require('express');
const router = express.Router();
const StartupProfile = require('../models/StartupProfile');
const AdminShortlisted = require('../models/AdminShortlisted');
const ProblemStatement = require('../models/ProblemStatement');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// All admin routes require valid Admin JWT Token
router.use(verifyToken, requireAdmin);

// GET /api/admin/applications - Filtered view of startup submissions
router.get('/applications', async (req, res) => {
  try {
    const { sector, minScore, dpiitOnly, status, search, eligibleOnly } = req.query;

    let query = {};

    // Default to showing only eligible or relevant applications to prevent exposing all raw data
    if (eligibleOnly !== 'false') {
      query.status = { $in: ['eligible', 'shortlisted'] };
    }

    if (sector && sector !== 'All') {
      query.sector = sector;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (dpiitOnly === 'true') {
      query.dpiitRegistered = true;
    }

    if (minScore) {
      query.eligibilityScore = { $gte: Number(minScore) };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { startupName: searchRegex },
        { founderName: searchRegex },
        { sector: searchRegex },
        { location: searchRegex },
        { rawResumeText: searchRegex }
      ];
    }

    const totalApplicationsCount = await StartupProfile.countDocuments();
    const eligibleCount = await StartupProfile.countDocuments({ status: { $in: ['eligible', 'shortlisted'] } });
    const shortlistedCount = await AdminShortlisted.countDocuments();
    const rejectedCount = await StartupProfile.countDocuments({ status: 'rejected' });

    const applications = await StartupProfile.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      stats: {
        totalApplicationsCount,
        eligibleCount,
        shortlistedCount,
        rejectedCount
      },
      count: applications.length,
      data: applications
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/shortlist/:applicationId - Shortlist a candidate profile into adminShortlistedResumes
router.post('/shortlist/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { adminNotes, selectedProblemStatementId, reasonForShortlisting } = req.body;

    const startupProfile = await StartupProfile.findById(applicationId);
    if (!startupProfile) {
      return res.status(404).json({ success: false, error: 'Startup profile not found' });
    }

    // Check if already shortlisted
    let existingShortlist = await AdminShortlisted.findOne({ applicationId });

    if (existingShortlist) {
      existingShortlist.adminNotes = adminNotes || existingShortlist.adminNotes;
      existingShortlist.selectedProblemStatementId = selectedProblemStatementId || existingShortlist.selectedProblemStatementId;
      existingShortlist.reasonForShortlisting = reasonForShortlisting || existingShortlist.reasonForShortlisting;
      existingShortlist.savedAt = Date.now();
      await existingShortlist.save();
    } else {
      existingShortlist = await AdminShortlisted.create({
        applicationId: startupProfile._id,
        startupSnapshot: {
          startupName: startupProfile.startupName,
          founderName: startupProfile.founderName,
          sector: startupProfile.sector,
          experienceYears: startupProfile.experienceYears,
          turnover: startupProfile.turnover,
          dpiitRegistered: startupProfile.dpiitRegistered,
          phone: startupProfile.phone,
          location: startupProfile.location
        },
        selectedProblemStatementId: selectedProblemStatementId || null,
        eligibilityScore: startupProfile.eligibilityScore,
        reasonForShortlisting: reasonForShortlisting || 'Strong alignment with government procurement standards.',
        adminNotes: adminNotes || '',
        status: 'shortlisted'
      });
    }

    // Update status in startupProfile
    startupProfile.status = 'shortlisted';
    await startupProfile.save();

    res.json({
      success: true,
      message: 'Candidate shortlisted successfully into Admin collection.',
      data: existingShortlist
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/shortlisted - View all curated admin shortlisted candidates
router.get('/shortlisted', async (req, res) => {
  try {
    const items = await AdminShortlisted.find().populate('applicationId').populate('selectedProblemStatementId').sort({ savedAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/shortlisted/:id - Update admin notes or shortlist status
router.put('/shortlisted/:id', async (req, res) => {
  try {
    const updated = await AdminShortlisted.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/shortlisted/:id - Remove candidate from shortlisted collection
router.delete('/shortlisted/:id', async (req, res) => {
  try {
    const item = await AdminShortlisted.findById(req.params.id);
    if (item) {
      await StartupProfile.findByIdAndUpdate(item.applicationId, { status: 'eligible' });
      await AdminShortlisted.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'Removed from shortlisted database.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
