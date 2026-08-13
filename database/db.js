const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const InquiryModel = require('./models/Inquiry');
const SubscriberModel = require('./models/Subscriber');

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'inquiries.json')
  : path.join(__dirname, 'inquiries.json');

const subscribersPath = process.env.VERCEL
  ? path.join('/tmp', 'subscribers.json')
  : path.join(__dirname, 'subscribers.json');

// Ensure local directories exist in non-Vercel environment
if (!process.env.VERCEL) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ----------------------------------------------------
// FIREBASE CLOUD REST SYNC LAYER (Zero-config for user)
// ----------------------------------------------------
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

function getFirebaseUrl(collectionName) {
  if (!FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID.includes('main-important') || FIREBASE_PROJECT_ID.includes('dummy')) return null;
  let baseUrl = `https://${FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/${collectionName}.json`;
  return FIREBASE_API_KEY ? `${baseUrl}?auth=${FIREBASE_API_KEY}` : baseUrl;
}

async function fetchFromFirebase(collectionName) {
  try {
    const url = getFirebaseUrl(collectionName);
    if (!url) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
  } catch (err) {
    return null;
  }
}

async function saveToFirebase(collectionName, data) {
  try {
    const url = getFirebaseUrl(collectionName);
    if (!url) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timer);
    return true;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------
// MONGODB ATLAS CLOUD LAYER
// ----------------------------------------------------
const DEFAULT_MONGO_URI = "mongodb+srv://arveharshil_db_user:MACa7WCpf0wYzJdW@cluster0.hjkukxq.mongodb.net/sell-ai-websites?retryWrites=true&w=majority";
// Register global Mongoose error listener to prevent process crashes
mongoose.connection.on('error', (err) => {
  console.warn('Mongoose connection notice:', err.message);
});

// Guard against uncaught Mongo SRV DNS errors
process.on('unhandledRejection', (reason) => {
  if (reason && reason.message && (reason.message.includes('querySrv') || reason.message.includes('ECONNREFUSED'))) {
    console.warn('Handled Mongo DNS notice:', reason.message);
    return;
  }
});

let isMongoConnected = false;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  if (isMongoConnected && mongoose.connection.readyState === 1) return true;

  try {
    await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log('MongoDB Atlas Connected Successfully.');
    return true;
  } catch (err) {
    console.warn('MongoDB Atlas Connection Notice (Using Cloud Fallback):', err.message);
    isMongoConnected = false;
    return false;
  }
}

// ----------------------------------------------------
// READ & WRITE DATA HELPERS WITH HYBRID CLOUD SYNC
// ----------------------------------------------------
async function readDataAsync() {
  // 1. Try Firebase Cloud first if available
  if (FIREBASE_PROJECT_ID) {
    const fbData = await fetchFromFirebase('inquiries');
    if (fbData && Array.isArray(fbData)) {
      // Sync local /tmp cache
      try { fs.writeFileSync(dbPath, JSON.stringify(fbData, null, 2), 'utf8'); } catch (e) {}
      return fbData;
    }
  }

  // 2. Read local /tmp JSON file
  try {
    if (!fs.existsSync(dbPath)) return [];
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

    if (modified) writeDataAsync(parsed);
    return parsed;
  } catch (error) {
    console.error('Error reading JSON DB:', error);
    return [];
  }
}

function readData() {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    return [];
  }
}

async function writeDataAsync(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing local JSON DB:', error);
  }
  // Sync to Firebase Cloud asynchronously
  if (FIREBASE_PROJECT_ID) {
    await saveToFirebase('inquiries', data);
  }
  return true;
}

function writeData(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {}
  if (FIREBASE_PROJECT_ID) {
    saveToFirebase('inquiries', data).catch(() => {});
  }
  return true;
}

async function initDb() {
  const mongoOk = await connectMongo();
  if (!mongoOk) {
    await readDataAsync();
  }
}

async function getDb() {
  const mongoOk = await connectMongo();

  return {
    get: async (query, params = []) => {
      if (mongoOk) {
        try {
          if (query.includes('COUNT(*)') && query.includes('SUM(CASE')) {
            const all = await InquiryModel.find().lean();
            return {
              total: all.length,
              newCount: all.filter(i => i.status === 'NEW').length,
              discussionCount: all.filter(i => i.status === 'IN DISCUSSION').length,
              progressCount: all.filter(i => i.status === 'IN PROGRESS').length,
              completedCount: all.filter(i => i.status === 'COMPLETED').length
            };
          }

          if (query.includes('SELECT id FROM inquiries WHERE email = ?')) {
            const [email, description, twoMinutesAgo] = params;
            const match = await InquiryModel.findOne({
              email,
              description,
              createdAt: { $gte: twoMinutesAgo }
            }).lean();
            return match ? { id: match.id } : null;
          }

          if (query.includes('WHERE id = ?')) {
            const id = parseInt(params[0]);
            const match = await InquiryModel.findOne({ id }).lean();
            return match || null;
          }
        } catch (err) {
          console.error('MongoDB query error, falling back to Firebase/JSON:', err);
        }
      }

      // Firebase / JSON Fallback
      const data = await readDataAsync();
      if (query.includes('COUNT(*)') && query.includes('SUM(CASE')) {
        return {
          total: data.length,
          newCount: data.filter(i => i.status === 'NEW').length,
          discussionCount: data.filter(i => i.status === 'IN DISCUSSION').length,
          progressCount: data.filter(i => i.status === 'IN PROGRESS').length,
          completedCount: data.filter(i => i.status === 'COMPLETED').length
        };
      }
      if (query.includes('SELECT id FROM inquiries WHERE email = ?')) {
        const [email, description, twoMinutesAgo] = params;
        const match = data.find(i => i.email === email && i.description === description && i.createdAt >= twoMinutesAgo);
        return match ? { id: match.id } : null;
      }
      if (query.includes('WHERE id = ?')) {
        const match = data.find(i => i.id === parseInt(params[0]));
        return match || null;
      }
      return null;
    },

    all: async (query, params = []) => {
      if (mongoOk) {
        try {
          if (query.includes('PRAGMA table_info')) {
            return [{ name: 'id' }, { name: 'adminNotes' }];
          }

          if (query.includes('SELECT * FROM inquiries')) {
            let filter = {};
            if (query.includes('status = ?')) {
              filter.status = new RegExp('^' + params[0] + '$', 'i');
            }

            let results = await InquiryModel.find(filter).sort({ createdAt: -1 }).lean();

            if (query.includes('fullName LIKE ?')) {
              const searchVal = params[params.length - 1].replace(/%/g, '').toLowerCase();
              results = results.filter(i =>
                (i.fullName && i.fullName.toLowerCase().includes(searchVal)) ||
                (i.email && i.email.toLowerCase().includes(searchVal)) ||
                (i.company && i.company.toLowerCase().includes(searchVal)) ||
                (i.projectType && i.projectType.toLowerCase().includes(searchVal))
              );
            }
            return results;
          }
        } catch (err) {
          console.error('MongoDB query error in all(), falling back to Firebase/JSON:', err);
        }
      }

      // Firebase / JSON Fallback
      let data = await readDataAsync();
      if (query.includes('PRAGMA table_info')) {
        return [{ name: 'id' }, { name: 'adminNotes' }];
      }
      if (query.includes('SELECT * FROM inquiries')) {
        if (query.includes('status = ?')) {
          const statusVal = params[0];
          data = data.filter(i => i.status.toUpperCase() === statusVal.toUpperCase());
        }
        if (query.includes('fullName LIKE ?')) {
          const searchVal = params[params.length - 1].replace(/%/g, '').toLowerCase();
          data = data.filter(i =>
            (i.fullName && i.fullName.toLowerCase().includes(searchVal)) ||
            (i.email && i.email.toLowerCase().includes(searchVal)) ||
            (i.company && i.company.toLowerCase().includes(searchVal)) ||
            (i.projectType && i.projectType.toLowerCase().includes(searchVal))
          );
        }
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return data;
      }
      return [];
    },

    run: async (query, params = []) => {
      if (mongoOk) {
        try {
          if (query.includes('INSERT INTO inquiries')) {
            const [fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt] = params;
            const lastDoc = await InquiryModel.findOne().sort({ id: -1 }).lean();
            const newId = lastDoc ? lastDoc.id + 1 : 1;
            const newTrackingToken = 'tr_' + newId + Math.random().toString(36).substring(2, 7);

            const newDoc = new InquiryModel({
              id: newId,
              trackingToken: newTrackingToken,
              fullName,
              email,
              whatsapp: whatsapp || '',
              company: company || '',
              projectType,
              website: website || '',
              budget,
              timeline,
              description,
              status: status || 'NEW',
              adminNotes: '',
              milestones: [
                { id: 1, title: 'Inquiry Received & Under Review', status: 'completed' },
                { id: 2, title: 'Discovery & Proposal Alignment', status: 'in_progress' },
                { id: 3, title: 'UI/UX Design & Architecture', status: 'pending' },
                { id: 4, title: 'Development & Feature Build', status: 'pending' },
                { id: 5, title: 'Testing, Review & Final Launch', status: 'pending' }
              ],
              createdAt: createdAt || new Date().toISOString(),
              updatedAt: updatedAt || new Date().toISOString()
            });

            await newDoc.save();
            return { lastID: newId, trackingToken: newTrackingToken };
          }

          if (query.includes('UPDATE inquiries SET status = ?')) {
            const [status, updatedAt, id] = params;
            const res = await InquiryModel.updateOne({ id: parseInt(id) }, { status, updatedAt });
            return { changes: res.modifiedCount };
          }

          if (query.includes('UPDATE inquiries SET adminNotes = ?')) {
            const [notes, updatedAt, id] = params;
            const res = await InquiryModel.updateOne({ id: parseInt(id) }, { adminNotes: notes, updatedAt });
            return { changes: res.modifiedCount };
          }

          if (query.includes('DELETE FROM inquiries WHERE id = ?')) {
            const id = parseInt(params[0]);
            const res = await InquiryModel.deleteOne({ id });
            return { changes: res.deletedCount };
          }
        } catch (err) {
          console.error('MongoDB mutation error, falling back to Firebase/JSON:', err);
        }
      }

      // Firebase / JSON Fallback
      const data = await readDataAsync();
      if (query.includes('INSERT INTO inquiries')) {
        const [fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status, createdAt, updatedAt] = params;
        const newId = data.length > 0 ? Math.max(...data.map(i => i.id)) + 1 : 1;
        const newTrackingToken = 'tr_' + newId + Math.random().toString(36).substring(2, 7);
        const newInquiry = {
          id: newId,
          trackingToken: newTrackingToken,
          fullName, email, whatsapp, company, projectType, website, budget, timeline, description, status,
          adminNotes: '',
          milestones: [
            { id: 1, title: 'Inquiry Received & Under Review', status: 'completed' },
            { id: 2, title: 'Discovery & Proposal Alignment', status: 'in_progress' },
            { id: 3, title: 'UI/UX Design & Architecture', status: 'pending' },
            { id: 4, title: 'Development & Feature Build', status: 'pending' },
            { id: 5, title: 'Testing, Review & Final Launch', status: 'pending' }
          ],
          createdAt, updatedAt
        };
        data.push(newInquiry);
        await writeDataAsync(data);
        return { lastID: newId, trackingToken: newTrackingToken };
      }

      if (query.includes('UPDATE inquiries SET status = ?')) {
        const [status, updatedAt, id] = params;
        const idx = data.findIndex(i => i.id === parseInt(id));
        if (idx !== -1) {
          data[idx].status = status;
          data[idx].updatedAt = updatedAt;
          await writeDataAsync(data);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      if (query.includes('UPDATE inquiries SET adminNotes = ?')) {
        const [notes, updatedAt, id] = params;
        const idx = data.findIndex(i => i.id === parseInt(id));
        if (idx !== -1) {
          data[idx].adminNotes = notes;
          data[idx].updatedAt = updatedAt;
          await writeDataAsync(data);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      if (query.includes('DELETE FROM inquiries WHERE id = ?')) {
        const id = parseInt(params[0]);
        const idx = data.findIndex(i => i.id === id);
        if (idx !== -1) {
          data.splice(idx, 1);
          await writeDataAsync(data);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      return { changes: 0 };
    }
  };
}

async function getSubscribers() {
  const mongoOk = await connectMongo();
  if (mongoOk) {
    try {
      return await SubscriberModel.find().lean();
    } catch (err) {
      console.error('Error fetching subscribers from Mongo:', err);
    }
  }

  // Firebase Fallback
  if (FIREBASE_PROJECT_ID) {
    const fbSubs = await fetchFromFirebase('subscribers');
    if (fbSubs && Array.isArray(fbSubs)) return fbSubs;
  }

  // JSON Fallback
  try {
    if (!fs.existsSync(subscribersPath)) return [];
    const data = fs.readFileSync(subscribersPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading subscribers JSON:', err);
    return [];
  }
}

async function addSubscriber(email) {
  const mongoOk = await connectMongo();
  const cleanEmail = email.toLowerCase().trim();

  if (mongoOk) {
    try {
      const existing = await SubscriberModel.findOne({ email: cleanEmail }).lean();
      if (existing) {
        return { success: true, alreadySubscribed: true, entry: existing };
      }
      const lastSub = await SubscriberModel.findOne().sort({ id: -1 }).lean();
      const newId = lastSub ? lastSub.id + 1 : 1;
      const newDoc = new SubscriberModel({
        id: newId,
        email: cleanEmail,
        subscribedAt: new Date().toISOString()
      });
      await newDoc.save();
      return { success: true, alreadySubscribed: false, entry: newDoc.toObject() };
    } catch (err) {
      console.error('Error adding subscriber to Mongo:', err);
    }
  }

  // Firebase / JSON Fallback
  try {
    const list = await getSubscribers();
    const existing = list.find(s => s.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: true, alreadySubscribed: true, entry: existing };
    }
    const newEntry = {
      id: list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1,
      email: cleanEmail,
      subscribedAt: new Date().toISOString()
    };
    list.push(newEntry);
    fs.writeFileSync(subscribersPath, JSON.stringify(list, null, 2), 'utf8');
    if (FIREBASE_PROJECT_ID) {
      await saveToFirebase('subscribers', list);
    }
    return { success: true, alreadySubscribed: false, entry: newEntry };
  } catch (err) {
    console.error('Error saving subscriber:', err);
    return { success: false, error: err.message };
  }
}

async function getInquiryByToken(token) {
  const mongoOk = await connectMongo();
  if (mongoOk) {
    try {
      const match = await InquiryModel.findOne({ trackingToken: token }).lean();
      if (match) return match;
    } catch (err) {
      console.error('Error fetching inquiry by token from Mongo:', err);
    }
  }

  // Firebase / JSON Fallback
  try {
    const list = await readDataAsync();
    return list.find(i => i.trackingToken === token) || null;
  } catch (err) {
    console.error('Error fetching inquiry by token:', err);
    return null;
  }
}

async function updateInquiryMilestones(id, milestones) {
  const mongoOk = await connectMongo();
  const numId = parseInt(id);

  if (mongoOk) {
    try {
      const updated = await InquiryModel.findOneAndUpdate(
        { id: numId },
        { milestones, updatedAt: new Date().toISOString() },
        { new: true }
      ).lean();
      if (updated) {
        return { success: true, inquiry: updated };
      }
    } catch (err) {
      console.error('Error updating milestones in Mongo:', err);
    }
  }

  // Firebase / JSON Fallback
  try {
    const list = await readDataAsync();
    const idx = list.findIndex(i => i.id === numId);
    if (idx !== -1) {
      list[idx].milestones = milestones;
      list[idx].updatedAt = new Date().toISOString();
      await writeDataAsync(list);
      return { success: true, inquiry: list[idx] };
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
