const express = require('express');
const router = express.Router();
const { getInquiryByToken, updateInquiryMilestones } = require('../database/db');
const siteConfig = require('../data/siteConfig');

// GET /track/:token - Public client live progress tracking page
router.get('/track/:token', (req, res) => {
  const { token } = req.params;
  const inquiry = getInquiryByToken(token);

  if (!inquiry) {
    return res.status(404).render('pages/error', {
      status: 404,
      message: 'Invalid or Expired Tracking Link',
      description: 'The project tracking link you entered does not exist or has expired. Please contact Harshil Goyal for an updated link.'
    });
  }

  res.render('pages/track', {
    inquiry,
    siteConfig,
    baseUrl: process.env.BASE_URL || 'https://dev-harshil.vercel.app'
  });
});

// PUT /api/inquiries/:id/milestones - Admin endpoint to update milestone checklist
router.put('/api/inquiries/:id/milestones', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { id } = req.params;
  const { milestones } = req.body;

  if (!milestones || !Array.isArray(milestones)) {
    return res.status(400).json({ success: false, message: 'Invalid milestones array.' });
  }

  const result = updateInquiryMilestones(id, milestones);

  if (result.success) {
    return res.json({ success: true, inquiry: result.inquiry });
  } else {
    return res.status(500).json({ success: false, message: result.message || 'Failed to update milestones.' });
  }
});

module.exports = router;
