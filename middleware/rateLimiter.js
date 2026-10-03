// In-memory sliding-window rate limit store for security sensitive endpoints
const hitStore = new Map();

/**
 * Creates an Express rate-limiting middleware
 * @param {object} options
 * @param {number} options.windowMs Window time in milliseconds
 * @param {number} options.max Maximum requests per window
 * @param {string} options.message Error message returned when limit reached
 * @param {function} [options.keyGenerator] Function returning key from req
 */
function rateLimiter({ windowMs, max, message, keyGenerator }) {
  return (req, res, next) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.ip || req.connection.remoteAddress || 'unknown_ip');

    const now = Date.now();
    const timestamps = hitStore.get(key) || [];
    // Filter hits within the active window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= max) {
      return res.status(429).json({
        success: false,
        error: message || 'Too many requests. Please try again later.'
      });
    }

    validTimestamps.push(now);
    hitStore.set(key, validTimestamps);
    next();
  };
}

module.exports = { rateLimiter };
