const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

/**
 * Setup socket.io event handlers and authentication
 * @param {SocketIO.Server} io - The socket.io server instance
 */
module.exports = (io) => {
  // =============== MIDDLEWARE ===============

  /**
   * Authentication middleware for socket connections
   */
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        logger.warn('Socket authentication failed: No token provided', { socketId: socket.id });
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, jwtSecret);
      if (!decoded || !decoded.id) {
        logger.warn('Socket authentication failed: Invalid token', { socketId: socket.id });
        return next(new Error('Authentication error'));
      }
      
      socket.userId = decoded.id;
      
      // Check if user exists
      const user = await User.findById(decoded.id);
      if (!user) {
        logger.warn('Socket authentication failed: User not found', { socketId: socket.id, userId: decoded.id });
        return next(new Error('User not found'));
      }
      
      // Store basic user info for quick access
      socket.user = {
        _id: user._id,
        username: user.username
      };
      
      logger.info('Socket authenticated successfully', { socketId: socket.id, userId: user._id });
      next();
    } catch (err) {
      logger.error('Socket authentication error', { 
        error: err.message, 
        stack: err.stack,
        socketId: socket.id
      });
      next(new Error('Authentication error'));
    }
  });
  
  // =============== CONNECTION HANDLER ===============
  
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const socketId = socket.id;
    
    logger.info('User connected', { userId, socketId });
    
    try {
      // Join user-specific notification channel
      socket.join(`user:${userId}`);
      
      // Auto-join all rooms the user is a member of
      // await autoJoinUserRooms(socket);
      
      // =============== EVENT HANDLERS ===============
      
      /**
       * Handle room joining
       */
      socket.on('join_room', async (data, callback) => {
        try {
          const result = await handleJoinRoom(socket, data);
          if (callback) {
            callback(result);
          }
        } catch (err) {
          handleError(socket, 'join_room', err);
          if (callback) {
            callback({ error: err.message || 'Failed to join room' });
          }
        }
      });
      
      /**
       * Handle typing events
       */
      socket.on('typing', async (data, callback) => {
        try {
          await handleTyping(socket, data);
          if (callback) {
            callback({ success: true });
          }
        } catch (err) {
          handleError(socket, 'typing', err);
          if (callback) {
            callback({ error: err.message || 'Error processing typing event' });
          }
        }
      });
      
      /**
       * Handle message sending
       */
      socket.on('private_message', async (data, callback) => {
        try {
          const result = await handlePrivateMessage(socket, data, io);
          if (callback) {
            callback(result);
          }
        } catch (err) {
          handleError(socket, 'private_message', err);
          if (callback) {
            callback({ error: err.message || 'Error processing message' });
          }
        }
      });
      
      /**
       * Handle read receipts
       */
      socket.on('read_messages', async (data) => {
        try {
          await handleReadMessages(socket, data);
        } catch (err) {
          handleError(socket, 'read_messages', err);
        }
      });
      
      /**
       * Handle reaction added
       */
      socket.on('reaction_added', (reaction) => {
        console.log('reaction_added', reaction);
        try {
          // Broadcast to all users in the room
          if (reaction && reaction.messageId) {
            // You may need to resolve roomId from the message if not present
            const roomId = reaction.roomId || reaction.messageId.roomId;
            logger.info('Broadcasting reaction_added', { roomId, reaction });
            
            io.to(roomId).emit('reaction_added', reaction);
          }
        } catch (err) {
          logger.error('Error handling reaction_added', { error: err.message, stack: err.stack });
        }
      });

      /**
       * Handle reaction removed
       */
      socket.on('reaction_removed', (data) => {
        try {
          // Broadcast to all users in the room
          console.log('reaction_removed', data);
          if (data && data.roomId) {
            const roomId = data.roomId;
            logger.info('Broadcasting reaction_removed', { roomId, data });
            io.to(roomId).emit('reaction_removed', data);
          }
        } catch (err) {
          logger.error('Error handling reaction_removed', { error: err.message, stack: err.stack });
        }
      });
      
      /**
       * Handle disconnection
       */
      socket.on('disconnect', () => {
        logger.info('User disconnected', { userId, socketId });
      });
      
    } catch (err) {
      logger.error('Socket connection setup error', { 
        error: err.message, 
        stack: err.stack,
        userId,
        socketId
      });
    }
  });
  
  // =============== HELPER FUNCTIONS ===============
  
  /**
   * Auto-join all rooms the user is a member of
   * @param {Socket} socket - Socket instance
   */
  async function autoJoinUserRooms(socket) {
    try {
      const userId = socket.userId;
      const rooms = await Room.find({ members: userId });
      
      if (rooms.length > 0) {
        const roomIds = rooms.map(room => room._id.toString());
        
        // Join all rooms at once
        roomIds.forEach(roomId => {
          socket.join(roomId);
        });
        
        logger.debug('User auto-joined rooms', { 
          userId, 
          socketId: socket.id,
          roomCount: roomIds.length,
          roomIds
        });
      }
    } catch (err) {
      logger.error('Error auto-joining rooms', {
        error: err.message,
        userId: socket.userId,
        socketId: socket.id
      });
    }
  }
  
 /**
 * Handle join room event
 * @param {Socket} socket - Socket instance
 * @param {Object|string} data - Room data or roomId string
 * @returns {Object} Result for acknowledgment
 */
async function handleJoinRoom(socket, data) {
  const userId = socket.userId;
  const socketId = socket.id;

  try {
    // Extract roomId from data object (or use direct parameter if string)
    const roomId = typeof data === 'object' ? data.roomId : data;
    
    if (!roomId) {
      socket.emit('error', { message: 'Invalid room data - roomId is required' });
      return { error: 'Invalid room data - roomId is required' };
    }
    
    // Verify room exists and user is a member
    const room = await Room.findById(roomId);
    
    if (!room) {
      logger.warn('Room not found', { roomId, userId, socketId });
      socket.emit('error', { message: 'Room not found' });
      return { error: 'Room not found' };
    }

    if (!room.members.includes(userId)) {
      logger.warn('User not authorized to join room', { roomId, userId, socketId });
      socket.emit('error', { message: 'Not authorized to join this room' });
      return { error: 'Not authorized to join this room' };
    }

    // Check if user is already in the room (Avoid joining the same room twice)
    if (socket.rooms.has(roomId)) {
      logger.warn('User already joined the room', { roomId, userId, socketId });
      return { success: true, message: 'Already in the room' };
    }
    
    // Join the room
    socket.join(roomId);
    logger.debug('User joined room', { userId, roomId, socketId });

    // Emit room_joined event
    socket.emit('room_joined', { success: true, roomId, userId });

    // Notify other room members
    socket.to(roomId).emit('user_joined', { 
      userId, 
      roomId,
      username: socket.user?.username || 'Unknown user'
    });

    // Send a notification to other members
    await notificationService.notifyUserJoined(io, roomId, userId, room.members);

    // Return success for acknowledgment
    return { 
      success: true, 
      roomId, 
      userId,
      roomName: room.name,
      memberCount: room.members.length
    };
  } catch (err) {
    logger.error('Error handling join room', {
      error: err.message,
      stack: err.stack,
      userId,
      data,
      socketId
    });

    return { error: 'Server error while joining room' };
  }
}
  
  /**
   * Handle typing event
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Typing data
   */
  async function handleTyping(socket, data) {
    const userId = socket.userId;
    
    if (!data || !data.roomId || typeof data.isTyping !== 'boolean') {
      return; // Silently ignore invalid data
    }
    
    const { roomId, isTyping } = data;
    
    // Verify room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room || !room.members.some(memberId => memberId.toString() === userId)) {
      return; // Silently ignore if user is not in the room
    }
    
    // Get user info to send with typing status
    const user = await User.findById(userId).select('username').lean();
    if (!user) return;
    
    // Emit typing status to all other users in the room
    socket.to(roomId).emit('user_typing', { 
      userId, 
      roomId,
      username: user.username,
      isTyping 
    });
    
    logger.debug('Typing event processed', { 
      userId, 
      roomId, 
      isTyping,
      socketId: socket.id
    });
  }
  
  /**
   * Handle private message
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Message data
   * @param {SocketIO.Server} io - Socket.io server
   */
  async function handlePrivateMessage(socket, data, io) {
    const userId = socket.userId;
    
    if (!data || !data.roomId || !data.content) {
      socket.emit('error', { message: 'Invalid message data - roomId and content are required' });
      return { error: 'Invalid message data - roomId and content are required' };
    }
    
    const { roomId, content } = data;
    
    try {
      // Verify room exists and user is a member
      const room = await Room.findById(roomId);
      
      if (!room) {
        logger.warn('Room not found', { roomId, userId });
        socket.emit('error', { message: 'Room not found' });
        return { error: 'Room not found' };
      }
      
      if (!room.members.includes(userId)) {
        logger.warn('User not authorized to send messages in this room', { roomId, userId });
        socket.emit('error', { message: 'Not authorized to send messages in this room' });
        return { error: 'Not authorized to send messages in this room' };
      }
      
      // Save message to database
      const newMessage = new Message({
        roomId,
        senderId: userId,
        content,
        timestamp: Date.now()
      });
      
      await newMessage.save();
      
      // Populate sender info
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'username')
        .lean();
      
      // Emit to all room members including sender
      io.to(roomId).emit('new_message', populatedMessage);
      
      // Send notifications to other members
      const otherMembers = room.members
        .filter(memberId => memberId.toString() !== userId)
        .map(memberId => memberId.toString());
        
      await notificationService.notifyNewMessage(io, populatedMessage, otherMembers);
      
      logger.debug('Message sent', { 
        userId, 
        roomId, 
        messageId: newMessage._id,
        socketId: socket.id
      });
      
      // Return the saved message for client acknowledgment
      return populatedMessage;
    } catch (err) {
      logger.error('Error handling private message', {
        error: err.message,
        stack: err.stack,
        userId,
        roomId,
        socketId: socket.id
      });
      
      return { error: 'Server error while processing message' };
    }
  }
  
  /**
   * Handle read receipts
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Read receipt data
   */
  async function handleReadMessages(socket, data) {
    const userId = socket.userId;
    
    if (!data || !data.roomId || !Array.isArray(data.messageIds) || data.messageIds.length === 0) {
      return; // Silently ignore invalid data
    }
    
    const { roomId, messageIds } = data;
    
    // Verify room exists and user is a member
    const room = await Room.findById(roomId);
    if (!room || !room.members.includes(userId)) {
      return; // Silently ignore if user is not in the room
    }
    
    // Broadcast to other room members that user has read messages
    socket.to(roomId).emit('messages_read', {
      userId,
      roomId,
      messageIds
    });
    
    logger.debug('Messages marked as read', { 
      userId, 
      roomId, 
      messageCount: messageIds.length,
      socketId: socket.id
    });
  }
  
  /**
   * Handle errors in event handlers
   * @param {Socket} socket - Socket instance
   * @param {string} eventName - Name of the event
   * @param {Error} error - Error object
   */
  function handleError(socket, eventName, error) {
    logger.error(`Error handling ${eventName} event:`, {
      error: error.message,
      stack: error.stack,
      userId: socket.userId,
      socketId: socket.id
    });
    
    if (eventName === 'join_room') {
      socket.emit('error', { message: 'Failed to join room' });
    } else if (eventName === 'private_message') {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }
}; 