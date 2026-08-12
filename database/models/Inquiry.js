const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  id: Number,
  title: String,
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
}, { _id: false });

const inquirySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  trackingToken: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  whatsapp: { type: String, default: '' },
  company: { type: String, default: '' },
  projectType: { type: String, required: true },
  website: { type: String, default: '' },
  budget: { type: String, required: true },
  timeline: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'NEW' },
  adminNotes: { type: String, default: '' },
  milestones: [milestoneSchema],
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);
