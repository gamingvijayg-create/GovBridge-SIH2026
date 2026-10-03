# GovBridge Backend — NextGenTenders SIH26136

This repository contains the complete, debugged backend for **GovBridge** powered by Node.js, Express, MongoDB, and Groq AI.

---

## 🚀 Quick Start

### 1. Check `.env` Configuration
Ensure your `.env` file in the root directory contains your API keys:
```env
GROQ_API_KEY=your_groq_api_key
MONGO_URI=mongodb+srv://...  # Strictly required in production (or RENDER). In local dev, falls back to in-memory MongoDB if empty.
JWT_SECRET=govbridge_secret_2026
PORT=5000
SMS_PROVIDER=console  # Options: console (dev only), email, msg91
```

### 2. Start the Server
```bash
npm start
```
Or for development mode (with auto-restart on changes):
```bash
npm run dev
```
The server will run on `http://localhost:5000`.

---

## 📥 How to Give Inputs

You can test and pass inputs to the backend in two easy ways:

### Option A: Using the CLI Script (Quickest Test)
Pass your document/resume text directly in the command line:
```bash
node test-input.js "CleanEnergy Ltd has 6 years experience in solar power solutions, turnover is 1.5 Crores INR, DPIIT registered."
```

---

### Option B: Via HTTP API Endpoints

#### 1. AI Data Extraction
- **Endpoint**: `POST http://localhost:5000/api/extraction/extract`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "resumeText": "TechNova Solutions is a software startup with 4 years experience in web and AI development. Annual turnover 60 Lakhs INR. DPIIT registered."
  }
  ```

#### 2. AI Eligibility Scoring
- **Endpoint**: `POST http://localhost:5000/api/extraction/eligibility-score`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "extractedData": {
      "sector": "Software & AI",
      "experience_years": 4,
      "turnover": "60 Lakhs INR",
      "dpiit_registered": true
    },
    "schemeCriteria": "Software sector, min 3 years experience, DPIIT registered"
  }
  ```

#### 3. Startup Registration & Login
- **Register**: `POST http://localhost:5000/api/startup/register` (`{ "name": "...", "email": "...", "password": "..." }`)
- **Login**: `POST http://localhost:5000/api/startup/login` (`{ "email": "...", "password": "..." }`)
- **Get Profile**: `GET http://localhost:5000/api/startup/:id`

---

## 📁 Directory Structure
```
STARTUP/
├── server.js              # Main Express server entry point
├── test-input.js          # CLI helper script for direct input testing
├── routes/
│   ├── startup.js         # Authentication & startup profile management
│   └── extraction.js      # Groq AI extraction & eligibility scoring
├── models/
│   └── Startup.js         # Mongoose schema for startups
├── package.json
└── .env                   # Environment variables & API keys
```

