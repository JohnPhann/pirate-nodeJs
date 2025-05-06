const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const MessageReaction = require('../models/MessageReaction');

// Get messages for a room
exports.getMessagesByRoom = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    // Verify room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if user is a member of the room
    if (!room.members.some(memberId => memberId.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to access this room' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before ? new Date(req.query.before) : new Date();
    
    const messages = await Message.find({
      roomId,
      timestamp: { $lt: before }
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('senderId', 'username email')
      .lean();

    // Fetch all reactions for these messages
    const messageIds = messages.map(msg => msg._id);
    const reactions = await MessageReaction.find({ messageId: { $in: messageIds } })
      .populate('userId', 'username')
      .lean();

    // Group reactions by messageId
    const reactionsByMessage = {};
    reactions.forEach(r => {
      const key = r.messageId.toString();
      if (!reactionsByMessage[key]) reactionsByMessage[key] = [];
      reactionsByMessage[key].push(r);
    });

    // Transform messages to match client expectations
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      roomId: msg.roomId,
      senderId: {
        _id: msg.senderId._id,
        username: msg.senderId.username,
        email: msg.senderId.email
      },
      createdAt: msg.timestamp,
      reactions: reactionsByMessage[msg._id.toString()] || [],
    }));
    
    res.json(formattedMessages.reverse());
  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { roomId, content } = req.body;
    
    // Debug: Log user ID from token
    console.log('Sending message with user ID from token:', req.userId);
    
    // Verify the current user exists
    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      console.error('User not found in database:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Found user:', currentUser.username, currentUser.email);
    
    // Verify room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!room.members.some(memberId => memberId.toString() === req.userId)) {
      return res.status(403).json({ error: 'Not authorized to send messages in this room' });
    }
    
    // Ensure we're using the authenticated user's ID for the message
    const newMessage = new Message({
      roomId,
      senderId: req.userId,
      content,
      timestamp: Date.now()
    });
    
    await newMessage.save();
    
    // We need to populate the sender info for the socket event
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'username email')
      .lean();
    
    // Double-check that the populated sender is correct
    if (populatedMessage.senderId._id.toString() !== req.userId) {
      console.error('Sender ID mismatch:', {
        expectedId: req.userId,
        actualId: populatedMessage.senderId._id.toString()
      });
    }
    
    // Format the message to match client expectations
    const formattedMessage = {
      _id: populatedMessage._id,
      content: populatedMessage.content,
      room: populatedMessage.roomId,
      sender: {
        _id: populatedMessage.senderId._id,
        username: populatedMessage.senderId.username,
        email: populatedMessage.senderId.email
      },
      createdAt: populatedMessage.timestamp
    };
    
    // Emit to all room members via Socket.IO if available
    if (req.io) {
      req.io.to(roomId.toString()).emit('new_message', formattedMessage);
    }
    
    res.status(201).json(formattedMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Server error' });
  }
}; 