const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  subscribedAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);
