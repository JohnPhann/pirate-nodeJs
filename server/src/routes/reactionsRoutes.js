const express = require('express');
const { addReaction, getMessageReactions, removeReaction } = require('../controllers/reactionController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Use auth middleware for all reaction routes
router.use(authMiddleware);

// Add reaction to message
router.post('/messages/:messageId/reactions', addReaction);

// Get reactions for a message
router.get('/messages/:messageId/reactions', getMessageReactions);

// Remove reaction
router.delete('/messages/:messageId/reactions/:reactionId', removeReaction);

module.exports = router; 