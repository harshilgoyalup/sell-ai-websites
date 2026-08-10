const rateLimit = require('express-rate-limit');

const limitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
const limitMax = parseInt(process.env.RATE_LIMIT_MAX) || 5;

const submitInquiryLimiter = rateLimit({
  windowMs: limitWindow,
  max: limitMax,
  message: {
    success: false,
    message: 'Too many project inquiries submitted from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  submitInquiryLimiter
};
