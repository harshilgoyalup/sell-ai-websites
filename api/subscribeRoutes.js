const express = require('express');
const router = express.Router();
const { addSubscriber, getSubscribers } = require('../database/db');
const { sendSubscriptionWelcomeEmail } = require('../lib/email');

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/subscribe - Subscribe customer email
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = addSubscriber(cleanEmail);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process subscription.'
      });
    }

    // Trigger welcome email in background
    sendSubscriptionWelcomeEmail(cleanEmail).catch(err => {
      console.error('Background welcome email dispatch error:', err);
    });

    return res.status(200).json({
      success: true,
      alreadySubscribed: result.alreadySubscribed,
      message: result.alreadySubscribed 
        ? 'You are already subscribed to Harshil Goyal Web Services!'
        : 'Thank you for subscribing! A welcome email has been sent to your inbox.'
    });
  } catch (error) {
    console.error('Subscribe endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing subscription.'
    });
  }
});

// GET /api/subscribers - Admin list of subscribers
router.get('/subscribers', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const list = getSubscribers();
  return res.json({ success: true, subscribers: list });
});

module.exports = router;
