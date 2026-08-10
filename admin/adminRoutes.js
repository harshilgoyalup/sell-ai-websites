const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { authenticateAdmin } = require('../lib/auth');

// GET /admin/login - Show login page
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('pages/login', { error: null });
});

// POST /admin/login - Authenticate admin
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  res.render('pages/login', { error: 'Invalid username or password.' });
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

    res.render('pages/admin', {
      stats: statsFormatted,
      inquiries,
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
