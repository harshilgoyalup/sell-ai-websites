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
  }
}

module.exports = {
  getDb,
  initDb
};
