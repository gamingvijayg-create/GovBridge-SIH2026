require('dotenv').config();
const Groq = require('groq-sdk');

let apiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.GROQAPIKEY;
if (apiKey) {
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
}

if (!apiKey) {
  console.error('Error: GROQ_API_KEY is missing in environment variables or .env file.');
  process.exit(1);
}

const groq = new Groq({ apiKey });

const PREFERRED_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'allam-2-7b'
];

async function createCompletionWithFallback(payload) {
  let lastError;
  for (const model of PREFERRED_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        ...payload,
        model
      });
      return completion;
    } catch (err) {
      lastError = err;
      if (err?.status === 404 || err?.status === 429 || err?.error?.code === 'model_not_found' || err?.error?.code === 'rate_limit_exceeded') {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

const parseJsonResponse = (content) => {
  if (!content) return {};
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
};

async function processInput(inputText) {
  console.log('\n==================================================');
  console.log('            GOVBRIDGE AI EXTRACTION               ');
  console.log('==================================================\n');
  console.log('Processing input document:\n', inputText);
  console.log('\nAnalyzing with Groq AI...\n');

  try {
    const extractCompletion = await createCompletionWithFallback({
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
          content: `Document text for json extraction:\n${inputText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const extractedData = parseJsonResponse(extractCompletion.choices[0]?.message?.content);
    console.log('--------------------------------------------------');
    console.log('EXTRACTED DATA:');
    console.log(JSON.stringify(extractedData, null, 2));

    console.log('\nEvaluating Eligibility Score...\n');
    const scoreCompletion = await createCompletionWithFallback({
      messages: [
        {
          role: 'system',
          content: `You are an eligibility scoring engine for government tenders and startup schemes.
Compare the startup profile with government scheme criteria.
Evaluate if the startup meets requirements (minimum 3 years experience, valid turnover, DPIIT registration).
If requirements are NOT met (e.g. 0-1 years experience, low/no turnover, not registered), set "isEligible": false, lower score, and list rejection reasons.

Respond strictly in valid json format with no extra text:
{
  "isEligible": false,
  "eligibilityScore": 20,
  "matchedSchemes": [],
  "rejectionReasons": ["Experience is less than 3 years", "Turnover not mentioned"],
  "reasoning": "Explanation of eligibility result"
}`
        },
        {
          role: 'user',
          content: `Startup Profile json: ${JSON.stringify(extractedData)}\nScheme Criteria: Standard Government Tender Criteria (Min 3 years experience, annual turnover 50 Lakhs+, DPIIT registered)`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const scoreData = parseJsonResponse(scoreCompletion.choices[0]?.message?.content);
    console.log('--------------------------------------------------');
    console.log('ELIGIBILITY EVALUATION RESULT:');
    console.log(JSON.stringify(scoreData, null, 2));
    console.log('--------------------------------------------------\n');


  } catch (error) {
    console.error('Error processing input:', error.message);
  }
}

const inputArg = process.argv.slice(2).join(' ');
const sampleInput = inputArg || 'TechNova Solutions is a software startup with 4 years experience in web and AI app development. Annual turnover is 60 Lakhs INR. Registered with DPIIT.';

processInput(sampleInput);
