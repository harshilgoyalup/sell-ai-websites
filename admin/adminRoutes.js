const express = require('express');
const router = express.Router();
const { getDb, getSubscribers } = require('../database/db');
const { authenticateAdmin } = require('../lib/auth');

// GET /admin/login - Show login page
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('pages/login', { error: null });
});

// POST /admin/login - Authenticate admin with Firebase ID Token
router.post('/login', async (req, res) => {
  const { idToken } = req.body;
  const apiKey = process.env.FIREBASE_API_KEY;
  const allowedEmailsStr = process.env.ALLOWED_ADMIN_EMAILS || 'arveharshil@gmail.com,harshil1536dcmy@gmail.com';
  const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID Token is required.' });
  }

  try {
    // Call Firebase REST endpoint to verify the client's ID Token
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();

    if (!response.ok || !data.users || data.users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
    }

    const firebaseUser = data.users[0];
    const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : '';

    if (allowedEmails.includes(email)) {
      req.session.isAdmin = true;
      req.session.adminEmail = email;
      return res.json({ success: true });
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Only authorized administrators are permitted.`
    });
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res.status(500).json({ success: false, message: 'Internal authentication server error.' });
  }
});

// GET /admin/logout - Logout admin
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Error on logout session destroy:', err);
    res.redirect('/admin/login');
  });
});

// GET /admin - Show admin dashboard with leads
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    
    // 1. Get statistics
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as newCount,
        SUM(CASE WHEN status = 'IN DISCUSSION' THEN 1 ELSE 0 END) as discussionCount,
        SUM(CASE WHEN status = 'IN PROGRESS' THEN 1 ELSE 0 END) as progressCount,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completedCount
      FROM inquiries
    `);

    // Ensure stats are numeric and not null
    const statsFormatted = {
      total: stats.total || 0,
      newCount: stats.newCount || 0,
      discussionCount: stats.discussionCount || 0,
      progressCount: stats.progressCount || 0,
      completedCount: stats.completedCount || 0
    };

    // 2. Fetch leads with search and filter
    const activeFilter = req.query.filter || 'All'; // All, New, Contacted, In Discussion, In Progress, Completed, Rejected
    const searchQuery = req.query.search || '';

    let query = 'SELECT * FROM inquiries WHERE 1=1';
    const params = [];

    if (activeFilter !== 'All') {
      query += ' AND UPPER(status) = ?';
      params.push(activeFilter.toUpperCase());
    }

    if (searchQuery) {
      query += ' AND (fullName LIKE ? OR email LIKE ? OR company LIKE ? OR projectType LIKE ?)';
      const likeQuery = `%${searchQuery}%`;
      params.push(likeQuery, likeQuery, likeQuery, likeQuery);
    }

    query += ' ORDER BY createdAt DESC';
    const inquiries = await db.all(query, params);
    const subscribersList = getSubscribers();

    res.render('pages/admin', {
      stats: statsFormatted,
      inquiries,
      subscribers: subscribersList,
      subscribersCount: subscribersList.length,
      activeFilter,
      searchQuery
    });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    res.status(500).send('Server Error. Please try again.');
  }
});

// GET /admin/inquiries/:id - Detail view for a specific inquiry
router.get('/inquiries/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const inquiry = await db.get('SELECT * FROM inquiries WHERE id = ?', [id]);

    if (!inquiry) {
      return res.status(404).send('Inquiry not found.');
    }

    res.render('pages/inquiry-detail', { inquiry });
  } catch (error) {
    console.error('Error fetching inquiry details:', error);
    res.status(500).send('Server error.');
  }
});

// GET /admin/export - Export inquiries data to JSON file (Admin only)
router.get('/export', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const inquiries = await db.all('SELECT * FROM inquiries ORDER BY createdAt DESC');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=inquiries_export.json');
    res.send(JSON.stringify(inquiries, null, 2));
  } catch (error) {
    console.error('Error exporting inquiries:', error);
    res.status(500).send('Server error while exporting.');
  }
});

module.exports = router;
