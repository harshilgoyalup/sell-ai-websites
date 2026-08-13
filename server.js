const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./database/db');
const siteConfig = require('./data/siteConfig');
const services = require('./data/services');
const portfolio = require('./data/portfolio');
const pricing = require('./data/pricing');
const faqs = require('./data/faqs');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initDb()
  .then(() => console.log('SQLite Database Initialized.'))
  .catch((err) => console.error('Database Initialization Failed:', err));

let sessionStore;
if (process.env.MONGODB_URI) {
  try {
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60
    });
  } catch (e) {
    console.warn('MongoStore init fallback:', e.message);
  }
}

// Express Session Setup with Persistent Session Cookie
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'harshil_goyal_session_fallback_secret_xyz',
    resave: false,
    saveUninitialized: false,
    ...(sessionStore ? { store: sessionStore } : {}),
    cookie: {
      secure: false,
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days persistent cookie
    }
  })
);

// Global Variables in templates
app.locals.siteConfig = siteConfig;

// Home Page Route
app.get('/', (req, res) => {
  res.render('pages/index', {
    services,
    portfolio,
    pricing,
    faqs
  });
});

// Import and Register Routes
const inquiryApi = require('./api/inquiryRoutes');
const subscribeApi = require('./api/subscribeRoutes');
const trackerRoutes = require('./api/trackerRoutes');
const adminRoutes = require('./admin/adminRoutes');

app.use('/', trackerRoutes);
app.use('/api', inquiryApi);
app.use('/api', subscribeApi);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/error', {
    status: 404,
    message: 'Page not found.',
    description: 'The page you are looking for does not exist or has been moved.'
  });
});

// 500 handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', {
    status: 500,
    message: 'Server error.',
    description: 'Something went wrong on our end. Please try again later.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
