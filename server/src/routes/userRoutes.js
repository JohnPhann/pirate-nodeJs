const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Use auth middleware for all user routes
router.use(authMiddleware);

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', userController.getAllUsers);

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', userController.getCurrentUser);

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put(
  '/me',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail()
  ],
  userController.updateCurrentUser
);

// @route   PUT /api/users/password
// @desc    Update user password
// @access  Private
router.put(
  '/password',
  [
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    check('confirmPassword', 'Confirm password is required').not().isEmpty()
  ],
  userController.updatePassword
);

// @route   GET /api/users/search
// @desc    Search users by username
// @access  Private
router.get('/search', userController.searchUsers);

// @route   GET /api/users/:userId
// @desc    Get user profile
// @access  Private
router.get('/:userId', userController.getUserProfile);

// @route   POST /api/users/:userId/friend
// @desc    Add a friend
// @access  Private
router.post('/:userId/friend', userController.addFriend);

module.exports = router; 