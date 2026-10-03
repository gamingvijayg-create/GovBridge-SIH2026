# GovBridge Backend — NextGenTenders SIH26136

This repository contains the complete, hardened backend for **GovBridge** powered by Node.js, Express, MongoDB, and Groq AI.

---

## 🚀 Quick Start

### 1. Check `.env` Configuration
Ensure your `.env` file in the root directory contains your environment variables:
```env
GROQ_API_KEY=your_groq_api_key
MONGO_URI=mongodb+srv://...  # Strictly required in production (or RENDER). In local dev, falls back to in-memory MongoDB if empty.
JWT_SECRET=govbridge_secret_2026
PORT=5000

# OTP & Authentication Gateway
SMS_PROVIDER=email  # Options: email (default), console (dev only), msg91

# SMTP Credentials (Required when SMS_PROVIDER=email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
MAIL_FROM=GovBridge Security <no-reply@govbridge.gov.in>
```

### 2. Run Database Migration (if upgrading existing database)
To drop legacy unique indexes on `phone` and ensure clean email-based indexing:
```bash
node scripts/migrateToEmailAuth.js
```

### 3. Start the Server
```bash
npm start
```
Or for development mode (with auto-restart on changes):
```bash
npm run dev
```
The server will run on `http://localhost:5000`.

---

## 🔐 Authentication & Email OTP Flows

Authentication and identity verification in GovBridge are **strictly email-based**. Mobile phone numbers are optional.

### 1. Registration Flow
1. **Request Verification OTP**:
   `POST /api/auth/send-otp`  
   Body: `{ "email": "founder@startup.com", "purpose": "registration" }`
2. **Verify OTP**:
   `POST /api/auth/verify-otp`  
   Body: `{ "email": "founder@startup.com", "otp": "123456", "purpose": "registration" }`
3. **Register Startup**:
   `POST /api/auth/signup`  
   Body: `{ "name": "Aura AI", "email": "founder@startup.com", "password": "SecurePassword123" }`

### 2. Login Flow
- **Startup / Portal Login**:
  `POST /api/auth/login`  
  Body: `{ "email": "founder@startup.com", "password": "SecurePassword123" }`
- **Selected Startup Portal Login**:
  `POST /api/selected/login`  
  Body: `{ "email": "founder@startup.com", "password": "SecurePassword123" }`

### 3. Forgot Password Flow
1. **Request Reset OTP**:
   `POST /api/auth/forgot-password-otp`  
   Body: `{ "email": "founder@startup.com" }`  
   *(Returns generic anti-enumeration response; sends OTP if email is registered)*
2. **Verify Reset OTP**:
   `POST /api/auth/verify-reset-otp`  
   Body: `{ "email": "founder@startup.com", "otp": "123456" }`  
   *(Returns temporary 10-minute JWT `resetToken`)*
3. **Set New Password**:
   `POST /api/auth/reset-password`  
   Body: `{ "resetToken": "...", "newPassword": "NewSecurePassword123" }`

---

## 📥 How to Test Groq AI Features

### Option A: Using the CLI Script
```bash
node test-input.js "CleanEnergy Ltd has 6 years experience in solar power solutions, turnover is 1.5 Crores INR, DPIIT registered."
```

### Option B: Via HTTP API Endpoints
- **AI Data Extraction**: `POST /api/extraction/extract` (`{ "resumeText": "..." }`)
- **AI Eligibility Scoring**: `POST /api/extraction/eligibility-score` (`{ "extractedData": { ... }, "schemeCriteria": "..." }`)

---

## 📁 Directory Structure
```
STARTUP/
├── server.js                   # Main Express server entry point
├── test-input.js               # CLI helper script for direct input testing
├── routes/
│   ├── auth.js                 # Email OTP, registration, login & password reset
│   ├── selected.js             # Selected startup onboarding & portal APIs
│   ├── startup.js              # Startup profile management
│   ├── extraction.js           # Groq AI extraction & eligibility scoring
│   ├── admin.js                # Administrator management endpoints
│   ├── pilots.js               # Pilot lifecycle tracker
│   └── procurement.js          # Procurement and tender listings
├── models/
│   ├── Otp.js                  # Hashed OTP schema with TTL and rate limiting
│   ├── User.js                 # User schema (email-first, optional phone)
│   ├── Startup.js              # Startup schema (email-first, optional phone)
│   ├── Tender.js               # Public procurement tenders
│   └── Pilot.js                # Pilot milestones & progress
├── utils/
│   └── otpSender.js            # OTP delivery provider switch (email, console, msg91)
├── scripts/
│   ├── migrateToEmailAuth.js   # DB migration to drop phone index and normalize emails
│   ├── seed.js                 # Database seeder
│   └── view-database.js        # DB inspect script
├── public/                     # Static frontend (SPA with Tailwind & React)
│   ├── index.html              # Main GovBridge SPA
│   ├── selected.html           # Dedicated Selected Startup Portal
│   ├── dashboard.html          # Dashboard view
│   └── profile.html            # Profile view
├── package.json
└── .env.example
```
