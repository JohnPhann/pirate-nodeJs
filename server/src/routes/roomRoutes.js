const express = require('express');
const { check } = require('express-validator');
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Use auth middleware for all room routes
router.use(authMiddleware);

// @route   GET /api/rooms
// @desc    Get all rooms for current user
// @access  Private
router.get('/', roomController.getUserRooms);

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post(
  '/',
  [
    check('memberIds', 'Member IDs are required').isArray().notEmpty(),
    check('isGroup', 'isGroup must be a boolean').isBoolean()
  ],
  roomController.createRoom
);

// @route   GET /api/rooms/:roomId
// @desc    Get a specific room
// @access  Private
router.get('/:roomId([0-9a-fA-F]{24})', roomController.getRoomById);

// @route   POST /api/rooms/:roomId/participants
// @desc    Add users to a group room
// @access  Private
router.post(
  '/:roomId([0-9a-fA-F]{24})/participants',
  [
    check('userId', 'User ID is required').notEmpty(),
    check('userId', 'User ID must be a valid MongoDB ID').isMongoId()
  ],
  roomController.addUserToRoom
);

// @route   DELETE /api/rooms/:roomId/participants/:userId
// @desc    Remove a user from a group room
// @access  Private
router.delete(
  '/:roomId([0-9a-fA-F]{24})/participants/:userId([0-9a-fA-F]{24})',
  [
    check('userId', 'User ID must be a valid MongoDB ID').isMongoId()
  ],
  roomController.removeUserFromRoom
);

// @route   DELETE /api/rooms/:roomId
// @desc    Delete a room
// @access  Private
router.delete(
  '/:roomId([0-9a-fA-F]{24})',
  [
    check('roomId', 'Room ID is required').notEmpty(),
    check('roomId', 'Invalid room ID').isMongoId()
  ],
  roomController.deleteRoom
);

module.exports = router; 