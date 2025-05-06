const express = require('express');
const { check } = require('express-validator');
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Use auth middleware for all message routes
router.use(authMiddleware);

// @route   GET /api/messages/room/:roomId
// @desc    Get messages for a room
// @access  Private
router.get('/room/:roomId', messageController.getMessagesByRoom);

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post(
  '/',
  [
    check('roomId', 'Room ID is required').not().isEmpty(),
    check('content', 'Message content is required').not().isEmpty()
  ],
  messageController.sendMessage
);

module.exports = router; 