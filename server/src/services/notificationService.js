/**
 * Notification Service
 * 
 * Handles sending notifications for new messages and other events
 */

const logger = require('../utils/logger');
const { User } = require('../models');

/**
 * Notify users of a new message
 * @param {Object} io - Socket.IO instance
 * @param {Object} message - The message object
 * @param {Array} userIds - Array of user IDs to notify
 */
const notifyNewMessage = async (io, message, userIds) => {
  try {
    // Get user information
    const sender = await User.findById(message.senderId).select('username').lean();
    
    if (!sender) {
      logger.error('Sender not found for notification', { messageId: message._id });
      return;
    }
    
    // Prepare notification data
    const notification = {
      type: 'NEW_MESSAGE',
      title: `New message from ${sender.username}`,
      body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      data: {
        messageId: message._id,
        roomId: message.roomId,
        senderId: message.senderId,
        timestamp: message.timestamp
      }
    };
    
    // Emit to all specified users who are online
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('notification', notification);
    });
    
    logger.debug('Notification sent for new message', { 
      messageId: message._id, 
      recipients: userIds.length 
    });
  } catch (error) {
    logger.error('Error sending notification', { error: error.message });
  }
};

/**
 * Notify users when someone joins a room
 * @param {Object} io - Socket.IO instance
 * @param {String} roomId - Room ID
 * @param {String} userId - ID of user who joined
 * @param {Array} memberIds - IDs of room members to notify
 */
const notifyUserJoined = async (io, roomId, userId, memberIds) => {
  try {
    // Get user information
    const user = await User.findById(userId).select('username').lean();
    
    if (!user) {
      logger.error('User not found for join notification', { userId });
      return;
    }
    
    // Prepare notification data
    const notification = {
      type: 'USER_JOINED',
      title: `${user.username} joined the chat`,
      data: {
        roomId,
        userId
      }
    };
    
    // Emit to all other members who are online
    memberIds
      .filter(memberId => memberId.toString() !== userId.toString())
      .forEach(memberId => {
        io.to(`user:${memberId}`).emit('notification', notification);
      });
      
  } catch (error) {
    logger.error('Error sending user joined notification', { error: error.message });
  }
};

module.exports = {
  notifyNewMessage,
  notifyUserJoined
}; 