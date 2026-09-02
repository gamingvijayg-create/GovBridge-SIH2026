const express = require('express');
const router = express.Router();
const ProblemStatement = require('../models/ProblemStatement');
const StartupProfile = require('../models/StartupProfile');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { generateVectorEmbedding, calculateCosineSimilarity } = require('../utils/aiEngine');

// GET /api/problem-statements - Explorer route with filtering & search
router.get('/', async (req, res) => {
  try {
    const { search, category, dpiitRequired, minExp, activeOnly } = req.query;

    let query = {};
    if (activeOnly !== 'false') {
      query.active = true;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (dpiitRequired === 'true') {
      query.dpiitRequired = true;
    }

    if (minExp) {
      query.minimumExperience = { $lte: Number(minExp) };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { department: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { requiredSkills: searchRegex }
      ];
    }

    const items = await ProblemStatement.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/problem-statements/:id - Fetch single Problem Statement
router.get('/:id', async (req, res) => {
  try {
    const ps = await ProblemStatement.findById(req.params.id);
    if (!ps) {
      return res.status(404).json({ success: false, error: 'Problem Statement not found' });
    }
    res.json({ success: true, data: ps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/problem-statements/semantic-match - Atlas Vector Search & Hybrid Match Score
router.post('/semantic-match', async (req, res) => {
  try {
    const { profileId, resumeText, sector, experienceYears, dpiitRegistered } = req.body;

    let targetText = resumeText || '';
    let exp = Number(experienceYears) || 0;
    let dpiit = Boolean(dpiitRegistered);

    if (profileId) {
      const profile = await StartupProfile.findById(profileId);
      if (profile) {
        targetText = profile.rawResumeText || profile.description || '';
        exp = profile.experienceYears || 0;
        dpiit = profile.dpiitRegistered;
      }
    }

    const profileVector = generateVectorEmbedding(targetText);
    const problemStatements = await ProblemStatement.find({ active: true });

    const matches = problemStatements.map(ps => {
      const psVector = ps.vectorEmbedding && ps.vectorEmbedding.length > 0
        ? ps.vectorEmbedding
        : generateVectorEmbedding(`${ps.title} ${ps.category} ${ps.description} ${(ps.requiredSkills || []).join(' ')}`);

      // 1. Semantic Similarity (Atlas Vector Embeddings)
      const vectorSimilarity = calculateCosineSimilarity(profileVector, psVector);
      const semanticMatchPercent = Math.round(vectorSimilarity * 100);

      // 2. Hard Rule Validation
      const expPass = exp >= (ps.minimumExperience || 0);
      const dpiitPass = !ps.dpiitRequired || dpiit === true;
      const isHardRuleEligible = expPass && dpiitPass;

      // 3. Combined Hybrid Score
      let finalScore = isHardRuleEligible ? Math.max(semanticMatchPercent, 75) : Math.min(semanticMatchPercent, 40);

      const missingRequirements = [];
      if (!expPass) missingRequirements.push(`Requires minimum ${ps.minimumExperience} years experience (found ${exp} yrs)`);
      if (!dpiitPass) missingRequirements.push('Requires DPIIT registration');

      return {
        problemStatement: ps,
        semanticMatchPercent,
        finalScore,
        isHardRuleEligible,
        isEligible: isHardRuleEligible && finalScore >= 50,
        missingRequirements
      };
    });

    // Sort by final score descending
    matches.sort((a, b) => b.finalScore - a.finalScore);

    res.json({ success: true, data: matches });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/problem-statements - Create Problem Statement (Admin Only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, department, category, description, requiredSkills, minimumExperience, dpiitRequired, minimumTurnover, deadline } = req.body;

    if (!title || !department || !category || !description) {
      return res.status(400).json({ success: false, error: 'Title, department, category, and description are required.' });
    }

    const skillsArray = Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills || '').split(',').map(s => s.trim()).filter(Boolean);
    const vector = generateVectorEmbedding(`${title} ${category} ${description} ${skillsArray.join(' ')}`);

    const newPS = await ProblemStatement.create({
      title,
      department,
      category,
      description,
      requiredSkills: skillsArray,
      minimumExperience: Number(minimumExperience) || 3,
      dpiitRequired: dpiitRequired === 'true' || dpiitRequired === true,
      minimumTurnover: minimumTurnover || '40 Lakhs',
      deadline: deadline || 'Q4 2026',
      vectorEmbedding: vector
    });

    res.status(201).json({ success: true, data: newPS });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/problem-statements/:id - Update Problem Statement (Admin Only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const updated = await ProblemStatement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/problem-statements/:id - Delete Problem Statement (Admin Only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await ProblemStatement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Problem Statement deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
