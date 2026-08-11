const fs = require('fs');
const path = require('path');

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'inquiries.json')
  : path.join(__dirname, 'inquiries.json');

// Ensure directories exist
if (!process.env.VERCEL) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read inquiries from JSON file
function readData() {
  try {
    if (!fs.existsSync(dbPath)) {
      return [];
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading JSON DB:', error);
    return [];
  }
}

// Write inquiries to JSON file
function writeData(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing JSON DB:', error);
    return false;
  }
}

async function initDb() {
  if (!fs.existsSync(dbPath)) {
    writeData([]);
    console.log('JSON Database Initialized empty.');
  }
}

async function getDb() {
  return {
    get: async (query, params = []) => {
      const data = readData();
      
      // Query 1: Stats calculation
      if (query.includes('COUNT(*)') && query.includes('SUM(CASE')) {
        const stats = {
          total: data.length,
          newCount: data.filter(i => i.status === 'NEW').length,
          discussionCount: data.filter(i => i.status === 'IN DISCUSSION').length,
          progressCount: data.filter(i => i.status === 'IN PROGRESS').length,
          completedCount: data.filter(i => i.status === 'COMPLETED').length
        };
        return stats;
      }

      // Query 2: Duplicate check
      if (query.includes('SELECT id FROM inquiries WHERE email = ?')) {
        const [email, description, twoMinutesAgo] = params;
        const match = data.find(i => 
          i.email === email && 
          i.description === description && 
          i.createdAt > twoMinutesAgo
        );
        return match ? { id: match.id } : null;
      }

      // Query 3: Select by ID
      if (query.includes('WHERE id = ?')) {
        const id = params[0];
        const match = data.find(i => i.id === parseInt(id));
        return match || null;
      }

      return null;
    },

    all: async (query, params = []) => {
      let data = readData();

      // Query 1: PRAGMA table_info (migrations - return dummy columns info to satisfy checks)
      if (query.includes('PRAGMA table_info')) {
        return [
          { name: 'id' },
          { name: 'adminNotes' }
        ];
      }

      // Query 2: Fetch and filter list
      if (query.includes('SELECT * FROM inquiries')) {
        // Apply status filter if present
        if (query.includes('status = ?') || query.includes('status = ?')) {
          const statusVal = params[0];
          data = data.filter(i => i.status.toUpperCase() === statusVal.toUpperCase());
        }

        // Apply search query if present
        if (query.includes('fullName LIKE ?') || query.includes('email LIKE ?')) {
          const searchVal = params[params.length - 1].replace(/%/g, '').toLowerCase();
          data = data.filter(i => 
            (i.fullName && i.fullName.toLowerCase().includes(searchVal)) ||
            (i.email && i.email.toLowerCase().includes(searchVal)) ||
            (i.company && i.company.toLowerCase().includes(searchVal)) ||
            (i.projectType && i.projectType.toLowerCase().includes(searchVal))
          );
        }

        // Apply order by (descending by createdAt)
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return data;
      }

      return [];
    },

    run: async (query, params = []) => {
      const data = readData();

      // Query 1: INSERT
      if (query.includes('INSERT INTO inquiries')) {
        const [fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt] = params;
        const newId = data.length > 0 ? Math.max(...data.map(i => i.id)) + 1 : 1;
        
        const newInquiry = {
          id: newId,
          fullName,
          email,
          whatsapp,
          company,
          projectType,
          website,
          budget,
          timeline,
          description,
          status,
          adminNotes: '',
          createdAt,
          updatedAt
        };

        data.push(newInquiry);
        writeData(data);
        return { lastID: newId };
      }

      // Query 2: UPDATE status
      if (query.includes('UPDATE inquiries SET status = ?')) {
        const [status, updatedAt, id] = params;
        const index = data.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
          data[index].status = status;
          data[index].updatedAt = updatedAt;
          writeData(data);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      // Query 3: UPDATE adminNotes
      if (query.includes('UPDATE inquiries SET adminNotes = ?')) {
        const [notes, updatedAt, id] = params;
        const index = data.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
          data[index].adminNotes = notes;
          data[index].updatedAt = updatedAt;
          writeData(data);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      // Query 4: DELETE
      if (query.includes('DELETE FROM inquiries WHERE id = ?')) {
        const id = params[0];
        const index = data.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
          data.splice(index, 1);
          writeData(data);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      // Query 5: ALTER TABLE migrations (ignore)
      if (query.includes('ALTER TABLE inquiries')) {
        return { changes: 0 };
      }

      return { changes: 0 };
    }
  };
}

module.exports = {
  getDb,
  initDb
};
