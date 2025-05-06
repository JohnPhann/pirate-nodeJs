/**
 * Simple in-memory rate limiting middleware
 */

// Store IP addresses and their request timestamps
const requests = new Map();

// Default rate limit settings
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10000;

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests || DEFAULT_MAX_REQUESTS;

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Clean up old requests
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const ipRequests = requests.get(ip);
    
    // Filter out requests older than our window
    const recentRequests = ipRequests.filter(timestamp => now - timestamp < windowMs);
    
    // Update recent requests for this IP
    requests.set(ip, [...recentRequests, now]);
    
    // Check if rate limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
    
    next();
  };
};

module.exports = rateLimit; 