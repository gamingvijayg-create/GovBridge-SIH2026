const Groq = require('groq-sdk');

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not configured');
  }
  return new Groq({ apiKey });
};

const parseJsonResponse = (content) => {
  if (!content) return {};
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
};

const PREFERRED_MODELS = [
  'qwen/qwen3.6-27b',
  'groq/compound-mini',
  'groq/compound',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile'
];

const createCompletionWithFallback = async (groq, payload) => {
  let lastError;
  for (const model of PREFERRED_MODELS) {
    try {
      return await groq.chat.completions.create({ ...payload, model });
    } catch (err) {
      lastError = err;
      if (err?.status === 404 || err?.status === 429 || err?.error?.code === 'model_not_found' || err?.error?.code === 'rate_limit_exceeded') {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

// Generate 128-dimensional Semantic Feature Embedding Vector
const generateVectorEmbedding = (text) => {
  if (!text || typeof text !== 'string') return new Array(128).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);
  
  const vector = new Array(128).fill(0);
  words.forEach((word, index) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const dim = Math.abs(hash) % 128;
    const weight = 1 + (index / words.length) * 0.1;
    vector[dim] += weight;
  });

  // L2 Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => Number((val / magnitude).toFixed(6)));
};

// Calculate Cosine Similarity between two vectors (0.0 to 1.0)
const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0.5;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0.5;
  return Math.min(1.0, Math.max(0.0, dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))));
};

// Analyze & evaluate startup application text
const evaluateStartupApplication = async (documentText, startupMetadata = {}) => {
  const groq = getGroqClient();

  // Step 1: Groq AI Structured Field Extraction
  const extractCompletion = await createCompletionWithFallback(groq, {
    messages: [
      {
        role: 'system',
        content: `You are a government startup evaluator. Extract technical parameters from the document text.
Respond strictly in valid json format with no extra markdown fences:
{
  "skills": ["skill1", "skill2"],
  "turnover": "annual turnover amount if mentioned",
  "sector": "business domain/industry",
  "experience_years": 0,
  "dpiit_registered": false,
  "summary": "2 sentence executive summary of capability"
}`
      },
      {
        role: 'user',
        content: `Document text:\n${documentText}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2
  });

  const extractedData = parseJsonResponse(extractCompletion.choices[0]?.message?.content);

  // Merge explicitly declared metadata if available
  const expYears = startupMetadata.experienceYears !== undefined ? Number(startupMetadata.experienceYears) : (extractedData.experience_years || 0);
  const dpiitStatus = startupMetadata.dpiitRegistered !== undefined ? Boolean(startupMetadata.dpiitRegistered) : Boolean(extractedData.dpiit_registered);
  const turnoverVal = startupMetadata.turnover || extractedData.turnover || '0 Lakhs';
  const sectorVal = startupMetadata.sector || extractedData.sector || 'General Tech';

  // Step 2: Groq AI Eligibility Evaluation Logic
  const evalCompletion = await createCompletionWithFallback(groq, {
    messages: [
      {
        role: 'system',
        content: `You are an eligibility scoring engine for government tenders.
Evaluate if the startup meets standard procurement rules:
- Minimum 3 years experience required.
- DPIIT registration mandatory.
- Valid annual turnover (minimum 40 Lakhs INR).

Rules:
- If experience < 3 years OR not DPIIT registered, set "isEligible": false, lower score (< 40), and state exact rejection reasons.
- If all criteria met, set "isEligible": true, high score (80-100), and list matched government schemes.
- Provide actionable improvement suggestions for low-scoring startups.

Respond strictly in valid json format:
{
  "isEligible": false,
  "eligibilityScore": 30,
  "matchedSchemes": [],
  "rejectionReasons": ["Insufficient experience (found 1 year, required minimum 3 years)"],
  "reasoning": "Clear explanation of scoring decision",
  "improvementGuide": {
    "summary": "Short diagnosis of why score is low",
    "actionableSteps": ["Step 1: Obtain DPIIT registration", "Step 2: Complete 2+ years of pilot operations"],
    "suggestedSchemes": ["Startup India Seed Fund Scheme", "AIM NITI Aayog Grants"]
  }
}`
      },
      {
        role: 'user',
        content: `Startup Profile: Sector=${sectorVal}, Experience=${expYears} years, Turnover=${turnoverVal}, DPIIT=${dpiitStatus}\nDocument text:\n${documentText}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2
  });

  const eligibilityResult = parseJsonResponse(evalCompletion.choices[0]?.message?.content);

  // Mismatch Detection between Register Form & Resume Text
  const mismatchWarnings = [];
  const resumeExp = extractedData.experience_years || 0;
  if (startupMetadata.experienceYears !== undefined && resumeExp > 0 && Math.abs(expYears - resumeExp) >= 2) {
    mismatchWarnings.push(`Experience Mismatch: Registered form states ${expYears} Years, but Resume text indicates ${resumeExp} Years.`);
  }

  const resumeSector = (extractedData.sector || '').toLowerCase();
  const formSector = (sectorVal || '').toLowerCase();
  if (formSector && resumeSector && !resumeSector.includes(formSector) && !formSector.includes(resumeSector) && resumeSector !== 'general tech') {
    mismatchWarnings.push(`Sector Mismatch: Registered form states '${sectorVal}', but Resume text indicates '${extractedData.sector}'.`);
  }

  if (startupMetadata.dpiitRegistered === true && extractedData.dpiit_registered === false && documentText.toLowerCase().includes('not dpiit')) {
    mismatchWarnings.push(`DPIIT Status Mismatch: Registered form claims DPIIT Recognition, but Resume text mentions non-registered status.`);
  }

  // Generate Vector Embedding for Semantic Search
  const fullContent = `${sectorVal} ${extractedData.summary || ''} ${(extractedData.skills || []).join(' ')} ${documentText}`;
  const embedding = generateVectorEmbedding(fullContent);

  const isEligible = eligibilityResult.isEligible === true;
  const score = Number(eligibilityResult.eligibilityScore) || (isEligible ? 85 : 30);

  // Default Improvement Guide if score is low
  let improvementGuide = eligibilityResult.improvementGuide || null;
  if (score < 75 || !isEligible) {
    if (!improvementGuide) {
      improvementGuide = {
        summary: `Your current eligibility score is ${score}/100. Key procurement thresholds were not fully satisfied.`,
        actionableSteps: [
          expYears < 3 ? `Experience Upgrade: Increase operational experience to minimum 3 years (currently ${expYears} yrs).` : null,
          !dpiitStatus ? "DPIIT Recognition: Register your entity on Startup India portal to unlock DPIIT exemption compliance." : null,
          "Turnover Requirement: Meet minimum ₹40 Lakhs annual turnover or partner via Joint Venture."
        ].filter(Boolean),
        suggestedSchemes: [
          "Startup India Seed Fund Scheme (SISFS)",
          "Agri Infrastructure Fund / MeitY SAMRIDH Scheme",
          "Government e-Marketplace (GeM) Startup Portal Onboarding"
        ]
      };
    }
  }

  return {
    extractedData: {
      skills: extractedData.skills || [],
      turnover: turnoverVal,
      sector: sectorVal,
      experience_years: expYears,
      dpiit_registered: dpiitStatus,
      summary: extractedData.summary || ''
    },
    eligibilityResult: {
      isEligible: isEligible,
      eligibilityScore: score,
      matchedSchemes: eligibilityResult.matchedSchemes || (isEligible ? ["Government e-Marketplace (GeM) Startup Scheme"] : []),
      rejectionReasons: eligibilityResult.rejectionReasons || [],
      reasoning: eligibilityResult.reasoning || "Evaluation completed.",
      mismatchWarnings: mismatchWarnings,
      hasMismatch: mismatchWarnings.length > 0,
      improvementGuide: improvementGuide
    },
    vectorEmbedding: embedding
  };
};

module.exports = {
  getGroqClient,
  parseJsonResponse,
  generateVectorEmbedding,
  calculateCosineSimilarity,
  evaluateStartupApplication
};
