// utils/otpSender.js
// Provider-agnostic OTP sender. Selects provider based on SMS_PROVIDER env var.
// Default provider: 'email' (console only permitted in development).
// Supported providers: email (default), console (dev only), msg91.

const nodemailer = require('nodemailer');
const dns = require('dns');
const fetch = (typeof global.fetch !== 'undefined') ? global.fetch : require('node-fetch');

// Helper to create a Nodemailer transporter
function createTransporter() {
  // Strict IPv4 lookup to prevent ENETUNREACH on cloud platforms (Render, Heroku, etc.)
  const customLookup = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback);
  };

  const host = (process.env.SMTP_HOST || '').toLowerCase();
  const isGmail = host.includes('gmail') || !process.env.SMTP_HOST;

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      lookup: customLookup,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    lookup: customLookup,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Normalise Indian mobile number to 91XXXXXXXXXX format.
 * Returns null if the number is invalid.
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return null;
  }
  return '91' + digits;
}

/**
 * Send OTP using the configured provider.
 * @param {string} recipient Destination email (or phone if msg91 is used)
 * @param {string} otp       6-digit OTP string
 * @param {string} purpose   e.g., 'verification', 'reset', 'login'
 */
async function sendOtp(recipient, otp, purpose) {
  // Default provider is 'email'
  const provider = (process.env.SMS_PROVIDER || 'email').toLowerCase();

  // 1. Console provider (Development ONLY)
  if (provider === 'console') {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      console.error('❌ FATAL: SMS_PROVIDER=console cannot be used in production! Refusing to execute.');
      throw new Error('Console OTP provider is disabled in production. Please configure email.');
    }
    console.log(`[OTP][${purpose}] Code: ${otp} (Recipient: ${recipient || 'N/A'})`);
    return { success: true, provider: 'console' };
  }

  // 2. Email provider (Default)
  if (provider === 'email') {
    const to = (recipient || '').toLowerCase().trim();
    if (!to || !to.includes('@')) {
      const errMsg = `Invalid email destination (${to || 'empty'}). Cannot send OTP via email provider.`;
      console.error(`[OTP][email] Error: ${errMsg}`);
      throw new Error('Invalid email address for verification code.');
    }

    const transporter = createTransporter();
    try {
      const mailFrom = process.env.MAIL_FROM || (process.env.SMTP_USER ? `"GovBridge" <${process.env.SMTP_USER}>` : '"GovBridge" <no-reply@govbridge.gov.in>');
      const subjectPurpose = purpose === 'reset' ? 'Password Reset Verification' : 'Verification Security Code';

      await transporter.sendMail({
        from: mailFrom,
        to,
        subject: `GovBridge — ${subjectPurpose}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; background-color: #f8fafc; color: #0f172a;">
            <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <span style="font-size: 24px;">🏛️</span>
                <span style="font-size: 20px; font-weight: 800; color: #0f172a;">GovBridge</span>
              </div>
              <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 12px;">Security Verification Code</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px;">
                Please use the following 6-digit one-time passcode to complete your ${purpose === 'reset' ? 'GovBridge password reset' : 'account verification'}:
              </p>
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
                  ${otp}
                </span>
              </div>
              <p style="font-size: 13px; font-weight: 600; color: #b45309; margin: 0 0 12px;">
                ⏱️ This code is valid for 5 minutes.
              </p>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 24px;">
                If you did not request this, ignore this email. Your account remains completely secure.
              </p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px;" />
              <div style="font-size: 11px; color: #94a3b8; text-align: center;">
                GovBridge — NextGen Government & Startup Procurement Platform
              </div>
            </div>
          </div>
        `
      });

      // Never log the OTP when not console
      console.log(`[OTP][email] Verification email successfully sent to ${to}`);
      return { success: true, provider: 'email' };
    } catch (err) {
      console.error('[OTP][email] SMTP dispatch failed (sanitized):', err.message);
      throw new Error('Unable to send verification email. Please check your email configuration.');
    }
  }

  // 3. MSG91 provider (Optional)
  if (provider === 'msg91') {
    const normalized = normalizePhone(recipient);
    if (!normalized) {
      console.error('[OTP][msg91] Invalid mobile number:', recipient);
      throw new Error('Invalid mobile number for SMS dispatch');
    }
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID;
    const dltEntityId = process.env.MSG91_DLT_ENTITY_ID;

    const url = new URL('https://api.msg91.com/api/v5/otp');
    url.searchParams.append('template_id', templateId);
    url.searchParams.append('mobile', normalized);
    url.searchParams.append('otp', otp);
    if (senderId) url.searchParams.append('sender', senderId);
    if (dltEntityId) url.searchParams.append('entity_id', dltEntityId);

    try {
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json'
        }
      });
      const data = await resp.json().catch(() => ({}));
      console.log('[OTP][msg91] Response status:', resp.status);
      if (!resp.ok || data.type === 'error') {
        const msg = data.message || `MSG91 failed with status ${resp.status}`;
        console.error('[OTP][msg91] Provider error:', msg);
        throw new Error('SMS delivery failed');
      }
      return { success: true, provider: 'msg91' };
    } catch (err) {
      console.error('[OTP][msg91] API error:', err.message);
      throw new Error('SMS service is temporarily unavailable');
    }
  }

  console.error(`Unsupported SMS_PROVIDER value: ${provider}`);
  throw new Error('Unsupported OTP provider configured');
}

module.exports = { sendOtp };
