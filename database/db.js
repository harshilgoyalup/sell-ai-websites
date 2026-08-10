const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = process.env.VERCEL 
  ? path.join('/tmp', 'database.sqlite')
  : path.join(__dirname, 'database.sqlite');

async function getDb() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  return db;
}

async function initDb() {
  const db = await getDb();

  // Create inquiries table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      company TEXT,
      projectType TEXT NOT NULL,
      website TEXT,
      budget TEXT NOT NULL,
      timeline TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      adminNotes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Dynamically migrate table if adminNotes column is missing
  const tableInfo = await db.all("PRAGMA table_info(inquiries)");
  const hasNotes = tableInfo.some(column => column.name === 'adminNotes');
  if (!hasNotes) {
    await db.exec("ALTER TABLE inquiries ADD COLUMN adminNotes TEXT");
    console.log("Database Migration: Added 'adminNotes' column to inquiries table.");
  }

  // Check if we already have inquiries. If not, seed a few records for illustration.
  const count = await db.get('SELECT COUNT(*) as count FROM inquiries');
  if (count.count === 0) {
    const now = new Date().toISOString();
    
    // Seed 1: New inquiry
    await db.run(`
      INSERT INTO inquiries (fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'John Doe',
      'john@example.com',
      '+1234567890',
      'Acme Corp',
      'Web Application',
      'https://acme.com',
      '$3,500 - $5,000',
      '1–2 months',
      'We need a secure client portal web application to let our partners upload monthly PDF reports, view dashboards, and message our support staff.',
      'NEW',
      now,
      now
    ]);

    // Seed 2: Contacted inquiry
    await db.run(`
      INSERT INTO inquiries (fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Jane Smith',
      'jane@designco.com',
      '+447911123456',
      'DesignCo',
      'Website Redesign',
      'https://designco.com',
      '$1,000 - $2,000',
      'ASAP',
      'Our current business site is slow and does not render well on mobile. We need a modern, minimalist design that loads in under 1 second.',
      'CONTACTED',
      now,
      now
    ]);

    // Seed 3: In Progress inquiry
    await db.run(`
      INSERT INTO inquiries (fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Carlos Miller',
      'carlos@millerstore.com',
      '+34600123456',
      'Miller Store',
      'E-commerce',
      '',
      '$2,000 - $3,500',
      '2–4 weeks',
      'We want to start selling curated leather bags online. Need clean, high-performance checkout with Stripe integration and inventory management.',
      'IN PROGRESS',
      now,
      now
    ]);
  }
}

module.exports = {
  getDb,
  initDb
};
