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
    const parsed = JSON.parse(data || '[]');
    let modified = false;

    parsed.forEach((inquiry, idx) => {
      if (!inquiry.trackingToken) {
        inquiry.trackingToken = 'tr_' + (inquiry.id || (idx + 1)) + Math.random().toString(36).substring(2, 7);
        modified = true;
      }
      if (!inquiry.milestones || !Array.isArray(inquiry.milestones)) {
        const isDone = inquiry.status === 'COMPLETED';
        const isProg = inquiry.status === 'IN PROGRESS';
        const isDisc = inquiry.status === 'IN DISCUSSION';

        inquiry.milestones = [
          { id: 1, title: 'Inquiry Received & Under Review', status: 'completed' },
          { id: 2, title: 'Discovery & Proposal Alignment', status: (isDisc || isProg || isDone) ? 'completed' : 'in_progress' },
          { id: 3, title: 'UI/UX Design & Architecture', status: (isProg || isDone) ? 'completed' : (isDisc ? 'in_progress' : 'pending') },
          { id: 4, title: 'Development & Feature Build', status: isDone ? 'completed' : (isProg ? 'in_progress' : 'pending') },
          { id: 5, title: 'Testing, Review & Final Launch', status: isDone ? 'completed' : 'pending' }
        ];
        modified = true;
      }
    });

    if (modified) {
      writeData(parsed);
    }
    return parsed;
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
        
        const newTrackingToken = 'tr_' + newId + Math.random().toString(36).substring(2, 7);
        const newInquiry = {
          id: newId,
          trackingToken: newTrackingToken,
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
          milestones: [
            { id: 1, title: 'Inquiry Received & Under Review', status: 'completed' },
            { id: 2, title: 'Discovery & Proposal Alignment', status: 'in_progress' },
            { id: 3, title: 'UI/UX Design & Architecture', status: 'pending' },
            { id: 4, title: 'Development & Feature Build', status: 'pending' },
            { id: 5, title: 'Testing, Review & Final Launch', status: 'pending' }
          ],
          createdAt,
          updatedAt
        };

        data.push(newInquiry);
        writeData(data);
        return { lastID: newId, trackingToken: newTrackingToken };
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

const subscribersPath = process.env.VERCEL
  ? path.join('/tmp', 'subscribers.json')
  : path.join(__dirname, 'subscribers.json');

function getSubscribers() {
  try {
    if (!fs.existsSync(subscribersPath)) return [];
    const data = fs.readFileSync(subscribersPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading subscribers JSON:', err);
    return [];
  }
}

function addSubscriber(email) {
  try {
    const list = getSubscribers();
    const existing = list.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: true, alreadySubscribed: true, entry: existing };
    }
    const newEntry = {
      id: list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1,
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString()
    };
    list.push(newEntry);
    fs.writeFileSync(subscribersPath, JSON.stringify(list, null, 2), 'utf8');
    return { success: true, alreadySubscribed: false, entry: newEntry };
  } catch (err) {
    console.error('Error saving subscriber:', err);
    return { success: false, error: err.message };
  }
}

function getInquiryByToken(token) {
  try {
    const list = readData();
    const match = list.find(i => i.trackingToken === token);
    return match || null;
  } catch (err) {
    console.error('Error fetching inquiry by token:', err);
    return null;
  }
}

function updateInquiryMilestones(id, milestones) {
  try {
    const list = readData();
    const index = list.findIndex(i => i.id === parseInt(id));
    if (index !== -1) {
      list[index].milestones = milestones;
      list[index].updatedAt = new Date().toISOString();
      writeData(list);
      return { success: true, inquiry: list[index] };
    }
    return { success: false, message: 'Inquiry not found.' };
  } catch (err) {
    console.error('Error updating inquiry milestones:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getDb,
  initDb,
  getSubscribers,
  addSubscriber,
  getInquiryByToken,
  updateInquiryMilestones
};
