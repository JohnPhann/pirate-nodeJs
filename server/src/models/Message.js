const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
  roomId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  senderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

MessageSchema.index({ roomId: 1, timestamp: -1 });
module.exports = mongoose.model('Message', MessageSchema); 