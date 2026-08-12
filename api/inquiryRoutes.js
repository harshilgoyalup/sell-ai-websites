const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { validateInquiry } = require('../lib/validation');
const { submitInquiryLimiter } = require('../lib/limiter');
const { authenticateAdmin } = require('../lib/auth');
const { sendInquiryNotification } = require('../lib/email');
const { sendDiscordNotification } = require('../lib/discord');

// POST /api/inquiries - Submit an inquiry
router.post('/inquiries', submitInquiryLimiter, async (req, res) => {
  try {
    const { isValid, errors, sanitized } = validateInquiry(req.body);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors.join(' ')
      });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // Prevent duplicate submissions: check if an inquiry with same email and description was made in last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const existing = await db.get(
      `SELECT id FROM inquiries 
       WHERE email = ? AND description = ? AND createdAt > ?`,
      [sanitized.email, sanitized.description, twoMinutesAgo]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate submission detected. You have already submitted this request recently.'
      });
    }

    const result = await db.run(`
      INSERT INTO inquiries (fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sanitized.fullName,
      sanitized.email,
      sanitized.whatsapp,
      sanitized.company,
      sanitized.projectType,
      sanitized.website,
      sanitized.budget,
      sanitized.timeline,
      sanitized.description,
      'NEW',
      now,
      now
    ]);

    // Dispatch email and Discord notifications (awaited for Vercel serverless compatibility)
    try {
      await Promise.all([
        sendInquiryNotification({ id: result.lastID, ...sanitized }),
        sendDiscordNotification({ id: result.lastID, ...sanitized })
      ]);
    } catch (dispatchErr) {
      console.error('Notification dispatch error:', dispatchErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Project request received.',
      id: result.lastID
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

// PUT /api/inquiries/:id/status - Update inquiry status (Admin only)
router.put('/inquiries/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['NEW', 'CONTACTED', 'IN DISCUSSION', 'IN PROGRESS', 'COMPLETED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.'
      });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.run(
      'UPDATE inquiries SET status = ?, updatedAt = ? WHERE id = ?',
      [status, now, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Status updated.'
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating status.'
    });
  }
});

// DELETE /api/inquiries/:id - Delete an inquiry (Admin only)
router.delete('/inquiries/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = await db.run('DELETE FROM inquiries WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Inquiry deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting inquiry.'
    });
  }
});

// PUT /api/inquiries/:id/notes - Save admin notes (Admin only)
router.put('/inquiries/:id/notes', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.run(
      'UPDATE inquiries SET adminNotes = ?, updatedAt = ? WHERE id = ?',
      [notes || '', now, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Notes saved successfully.'
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving notes.'
    });
  }
});

module.exports = router;
