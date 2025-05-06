const mongoose = require('mongoose');

const MessageReactionSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reaction: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Add compound index to prevent duplicate reactions
MessageReactionSchema.index({ messageId: 1, userId: 1, reaction: 1 }, { unique: true });

module.exports = mongoose.model('MessageReaction', MessageReactionSchema); 