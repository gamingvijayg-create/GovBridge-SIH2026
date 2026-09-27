const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const mongoose = require('mongoose');
const multer = require('multer');
const Startup = require('../models/Startup');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Global Resumes Counter Stats Tracker
let globalStats = {
  totalAnalyzed: 0,
  selected: 0,
  rejected: 0
};

// Helper to safely get Groq SDK instance
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in environment variables');
  }
  return new Groq({ apiKey });
};

// Helper function to safely extract and parse JSON from LLM output
const parseJsonResponse = (content) => {
  if (!content) return {};
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
};

// Available candidate models in order of preference
const PREFERRED_MODELS = [
  'qwen/qwen3.6-27b',
  'groq/compound-mini',
  'groq/compound',
  'openai/gpt-oss-20b'
];

// Helper to execute completions with fallback models
const createCompletionWithFallback = async (groq, payload) => {
  let lastError;
  for (const model of PREFERRED_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        max_tokens: 1024,
        ...payload,
        model
      });
      return completion;
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed (${err?.status || err?.message}), attempting fallback...`);
      continue;
    }
  }
  throw lastError;
};

// GET /api/extraction/stats - Fetch current counts (Total, Selected, Rejected)
router.get('/stats', (req, res) => {
  res.json({ success: true, stats: globalStats });
});

// POST /api/extraction/extract
router.post('/extract', async (req, res) => {
  try {
    const { startupId, resumeText } = req.body;

    if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
      return res.status(400).json({ success: false, error: 'Resume text is required (resumeText field)' });
    }

    if (startupId && !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, error: 'Invalid startupId format' });
    }

    const groq = getGroqClient();

    const completion = await createCompletionWithFallback(groq, {
      messages: [
        {
          role: 'system',
          content: `You are a government procurement eligibility analyzer.
Extract the relevant fields from the input document text.
If a field is unknown or not mentioned, set its value to null.
Respond strictly in valid json format with no extra explanation or markdown tags:
{
  "skills": ["skill1", "skill2"],
  "turnover": "annual turnover amount if mentioned",
  "sector": "business sector/industry",
  "experience_years": 0,
  "dpiit_registered": false
}`
        },
        {
          role: 'user',
          content: `Document text for json extraction:\n${resumeText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const rawContent = completion.choices[0]?.message?.content;
    const extractedData = parseJsonResponse(rawContent);

    if (startupId) {
      await Startup.findByIdAndUpdate(startupId, {
        rawResumeText: resumeText,
        extractedData: extractedData
      });
    }

    res.json({ success: true, data: extractedData });

  } catch (error) {
    console.error('Groq Extraction Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'AI extraction failed, try again' });
  }
});

// POST /api/extraction/eligibility-score
router.post('/eligibility-score', async (req, res) => {
  try {
    const { startupId, extractedData, schemeCriteria } = req.body;

    if (!extractedData && !startupId) {
      return res.status(400).json({ success: false, error: 'extractedData or startupId is required' });
    }

    if (startupId && !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, error: 'Invalid startupId format' });
    }

    let profileData = extractedData;
    if (startupId && !profileData) {
      const startup = await Startup.findById(startupId);
      if (startup && startup.extractedData) {
        profileData = startup.extractedData;
      }
    }

    if (!profileData) {
      return res.status(400).json({ success: false, error: 'No profile data found for scoring' });
    }

    const groq = getGroqClient();

    const completion = await createCompletionWithFallback(groq, {
      messages: [
        {
          role: 'system',
          content: `You are an eligibility scoring engine for government tenders and startup schemes.
Compare the startup profile with the government scheme criteria.
Evaluate if the startup meets the requirements (e.g. minimum experience years, required turnover, DPIIT registration, domain sector).
If requirements are NOT met (e.g. experience is too low, no turnover, or not registered), set "isEligible": false, lower the score, and list the exact rejection reasons.

Respond strictly in valid json format with no extra text:
{
  "isEligible": false,
  "eligibilityScore": 25,
  "matchedSchemes": [],
  "rejectionReasons": ["Insufficient experience (found 0 years, required minimum 3 years)", "Annual turnover is not specified"],
  "reasoning": "The startup is not eligible because it lacks required experience and annual turnover threshold."
}`
        },
        {
          role: 'user',
          content: `Startup Profile json: ${JSON.stringify(profileData)}\nScheme Criteria: ${JSON.stringify(schemeCriteria || 'Standard Government Tender Criteria: Minimum 3 years experience, valid annual turnover, DPIIT registered')}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const rawContent = completion.choices[0]?.message?.content;
    const result = parseJsonResponse(rawContent);

    if (startupId) {
      await Startup.findByIdAndUpdate(startupId, {
        eligibilityScore: result.eligibilityScore || 0,
        matchedSchemes: result.matchedSchemes || []
      });
    }

    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Scoring Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Scoring failed, try again' });
  }
});

// POST /api/extraction/upload-extract
// Main Endpoint: Extract AI Data, Evaluate Eligibility, Update Stats, and ONLY Save ELIGIBLE Resumes to DB
router.post('/upload-extract', upload.single('file'), async (req, res) => {
  try {
    let documentText = req.body.resumeText;

    if (req.file) {
      documentText = req.file.buffer.toString('utf-8');
    }

    if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
      return res.status(400).json({ success: false, error: 'Please upload a valid document or provide text' });
    }

    globalStats.totalAnalyzed++;

    const groq = getGroqClient();

    // 1. AI Extraction
    const extractCompletion = await createCompletionWithFallback(groq, {
      messages: [
        {
          role: 'system',
          content: `You are a government procurement eligibility analyzer.
Extract the relevant fields from the input document text.
If a field is unknown or not mentioned, set its value to null.
Respond strictly in valid json format with no extra explanation or markdown tags:
{
  "skills": ["skill1", "skill2"],
  "turnover": "annual turnover amount if mentioned",
  "sector": "business sector/industry",
  "experience_years": 0,
  "dpiit_registered": false
}`
        },
        {
          role: 'user',
          content: `Document text for json extraction:\n${documentText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const extractedData = parseJsonResponse(extractCompletion.choices[0]?.message?.content);

    // 2. AI Eligibility Scoring
    const scoreCompletion = await createCompletionWithFallback(groq, {
      messages: [
        {
          role: 'system',
          content: `You are an eligibility scoring engine for government tenders and startup schemes.
Compare the startup profile with the government scheme criteria (Minimum 3 years experience, valid annual turnover, DPIIT registered).
Evaluate if requirements are met.
If experience is less than 3 years, turnover is zero/missing, or not DPIIT registered, set "isEligible": false, lower score (< 40), and list exact rejection reasons.
If all criteria are met, set "isEligible": true and score (80-100).

Respond strictly in valid json format with no extra text:
{
  "isEligible": false,
  "eligibilityScore": 25,
  "matchedSchemes": [],
  "rejectionReasons": ["Insufficient experience (found 1 year, required minimum 3 years)"],
  "reasoning": "Explanation of evaluation"
}`
        },
        {
          role: 'user',
          content: `Startup Profile json: ${JSON.stringify(extractedData)}\nScheme Criteria: Minimum 3 years experience required, valid annual turnover, DPIIT registered`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const eligibilityResult = parseJsonResponse(scoreCompletion.choices[0]?.message?.content);
    const isEligible = eligibilityResult.isEligible === true;

    let savedRecordId = null;

    if (isEligible) {
      globalStats.selected++;
      // ✅ ONLY SAVE TO MONGODB IF ELIGIBLE
      if (mongoose.connection.readyState === 1) {
        try {
          const timestamp = Date.now();
          const companyName = extractedData.sector ? `${extractedData.sector} Applicant #${timestamp.toString().slice(-4)}` : `Eligible Resume #${timestamp.toString().slice(-4)}`;
          
          const newStartup = await Startup.create({
            name: companyName,
            email: `eligible_${timestamp}@govbridge.app`,
            password: 'auto_generated_pass',
            rawResumeText: documentText,
            extractedData: extractedData,
            eligibilityScore: eligibilityResult.eligibilityScore || 85,
            matchedSchemes: eligibilityResult.matchedSchemes || ["Standard Procurement Scheme"],
            status: 'shortlisted'
          });
          savedRecordId = newStartup._id;
          console.log(`✅ Saved ELIGIBLE startup to MongoDB: ${savedRecordId}`);
        } catch (dbErr) {
          console.warn('MongoDB Save Warning:', dbErr.message);
        }
      }
    } else {
      globalStats.rejected++;
      console.log(`❌ INELIGIBLE startup filtered out (NOT saved to DB)`);
    }

    res.json({
      success: true,
      mongoSaved: !!savedRecordId,
      savedRecordId,
      extractedData,
      eligibilityResult,
      stats: globalStats
    });

  } catch (error) {
    console.error('File Upload Extraction Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'File extraction failed' });
  }
});

module.exports = router;
