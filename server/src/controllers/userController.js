const User = require('../models/User');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    // Find all users except the current user
    // Only return necessary fields
    const users = await User.find({
      _id: { $ne: req.userId }
    })
      .select('username email')
      .limit(20)
      .lean();

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user's profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('username email')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update current user's profile
exports.updateCurrentUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;

    // Check if email or username is already taken by another user
    const existingUser = await User.findOne({
      $or: [
        { email, _id: { $ne: req.userId } },
        { username, _id: { $ne: req.userId } }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email or username is already taken by another user' 
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { username, email },
      { new: true, runValidators: true }
    ).select('username email');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user password
exports.updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    // Get user with password hash
    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    user.passwordHash = passwordHash;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search users by username
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Find users with username containing the query string
    // Exclude the current user and only return necessary fields
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.userId }
    })
      .select('username email')
      .limit(10)
      .lean();

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId)
      .select('username email')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add friend
exports.addFriend = async (req, res) => {
  try {
    const friendId = req.params.userId;
    
    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    const user = await User.findById(req.userId);
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Add friend to both users
    await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { friends: friendId } }
    );

    await User.findByIdAndUpdate(
      friendId,
      { $addToSet: { friends: req.userId } }
    );

    res.json({ message: 'Friend added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}; 