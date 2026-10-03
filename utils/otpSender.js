// utils/otpSender.js
// Provider-agnostic OTP sender. Selects provider based on SMS_PROVIDER env var.
// Supported providers: console (dev only), email, msg91.
// Environment variables needed:
//   SMS_PROVIDER (default: email in prod, console in dev)
//   For email: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
//   For msg91: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID, MSG91_DLT_ENTITY_ID

const nodemailer = require('nodemailer');
const fetch = (typeof global.fetch !== 'undefined') ? global.fetch : require('node-fetch');

// Helper to create a Nodemailer transporter (same logic as in auth routes)
function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  // Fallback to Gmail (requires GMAIL_USER/PASS or use MAIL_FROM as dummy)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'govbridge.otp@gmail.com',
      pass: process.env.GMAIL_PASS || 'demo_pass'
    }
  });
}

/**
 * Normalise Indian mobile number to 91XXXXXXXXXX format.
 * Returns null if the number is invalid.
 * @param {string} phone raw phone input
 */
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return null;
  }
  return '91' + digits; // MSG91 expects country code without '+'.
}

/**
 * Send OTP using the configured provider.
 * @param {string} phone   Phone number (required for sms providers)
 * @param {string} otp    6‑digit OTP string
 * @param {string} purpose e.g., 'login', 'reset'
 */
async function sendOtp(phone, otp, purpose) {
  const provider = (process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' ? 'email' : 'console')).toLowerCase();

  // Strict check: Console must never run in production
  if (provider === 'console') {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      console.error('❌ FATAL: SMS_PROVIDER=console cannot be used in production! Refusing to execute.');
      throw new Error('Console OTP provider is disabled in production. Please configure email or msg91.');
    }
    console.log(`[OTP][${purpose}] Code: ${otp} (Destination: ${phone || 'N/A'})`);
    return { success: true, provider: 'console' };
  }

  if (provider === 'email') {
    const to = (phone || '').trim();
    // Validate if the destination looks like an email
    if (!to || !to.includes('@')) {
      const errMsg = `User has no valid email address associated (${to || 'empty'}). Cannot send OTP via email provider.`;
      console.error(`[OTP][email] Error: ${errMsg}`);
      throw new Error('No valid email linked to this account for OTP verification. Please contact support.');
    }

    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'GovBridge <no-reply@govbridge.gov.in>',
        to,
        subject: `GovBridge OTP Verification - ${purpose === 'reset' ? 'Password Reset' : 'Authentication'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin-top: 0;">GovBridge Security Code</h2>
              <p style="color: #475569; font-size: 14px;">Your verification OTP for <b>${purpose}</b> is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 6px; padding: 14px; background: #eff6ff; text-align: center; border-radius: 8px; margin: 16px 0;">
                ${otp}
              </div>
              <p style="color: #64748b; font-size: 12px;">Valid for 5 minutes. If you did not request this code, ignore this message.</p>
            </div>
          </div>
        `
      });
      console.log(`[OTP][email] Successfully dispatched OTP to ${to}`);
      return { success: true, provider: 'email' };
    } catch (err) {
      console.error('[OTP][email] Dispatch failed:', err.message);
      throw new Error('Failed to send verification email. Please check SMTP settings or try again.');
    }
  }

  if (provider === 'msg91') {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      const err = new Error('Invalid Indian mobile number');
      console.error('[OTP][msg91] Invalid phone:', phone);
      throw err;
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
      // Log response safely without authkey
      console.log('[OTP][msg91] Response status:', resp.status, 'Body:', JSON.stringify(data));
      if (!resp.ok || data.type === 'error') {
        const msg = data.message || `MSG91 failed with status ${resp.status}`;
        console.error('[OTP][msg91] Provider Error (check wallet, DLT template, sender ID):', msg);
        throw new Error(msg);
      }
      return { success: true, provider: 'msg91' };
    } catch (err) {
      console.error('[OTP][msg91] Network / API Error:', err.message);
      throw err;
    }
  }

  console.error(`Unsupported SMS_PROVIDER value: ${provider}`);
  throw new Error('Unsupported OTP provider');
}

module.exports = { sendOtp };
