const { Server } = require('http');
const { Server: SocketServer } = require('socket.io');
const { Express } = require('express');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

let io = null;
let connections = 0;
let totalConnections = 0;
let disconnections = 0;
let authFailures = 0;
let lastActivity = new Date();

/**
 * Health check status
 */
const healthStatus = {
  online: true,
  startTime: new Date(),
  activeConnections: 0,
  totalConnections: 0,
  errors: 0
};

/**
 * Initialize socket.io server with improved configuration
 * @param {Express} app - Express application
 * @returns {Server} HTTP server
 */
const initSocket = (app) => {
  console.log('Initializing Socket.IO server...');
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_URL: process.env.CLIENT_URL,
    PORT: process.env.PORT
  });

  const server = new Server(app);
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*', // Allow all origins in development
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type']
    },
    pingTimeout: 60000, // 60 seconds (reduced from 120s for faster failure detection)
    pingInterval: 20000, // 20 seconds (reduced from 25s for more responsive connections)
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io/',
    connectTimeout: 20000, // 20 seconds (reduced from 30s)
    maxHttpBufferSize: 1e6, // 1MB (reduced to improve performance)
    serveClient: false,
    cookie: false
  });

  // Add middleware for authentication
  io.use(async (socket, next) => {
    lastActivity = new Date();
    
    try {
      // Log auth attempt
      console.log('Socket authentication attempt:', {
        id: socket.id,
        transport: socket.conn.transport.name,
        timestamp: new Date().toISOString()
      });

      const token = socket.handshake.auth.token;
      if (!token) {
        console.error('Authentication failed: No token provided', {
          id: socket.id,
          timestamp: new Date().toISOString()
        });
        authFailures++;
        healthStatus.errors++;
        return next(new Error('Authentication error: No token provided'));
      }
      
      // Verify JWT token
      try {
        const decoded = jwt.verify(token, jwtSecret);
        socket.data.userId = decoded.id;
        socket.data.authenticated = true;
        socket.data.authTime = Date.now();
        
        console.log('Socket authenticated successfully:', {
          id: socket.id,
          userId: decoded.id,
          timestamp: new Date().toISOString()
        });
        
        next();
      } catch (jwtError) {
        console.error('Authentication failed: Invalid token', {
          id: socket.id,
          error: jwtError.message,
          timestamp: new Date().toISOString()
        });
        authFailures++;
        healthStatus.errors++;
        return next(new Error('Authentication error: Invalid token'));
      }
    } catch (err) {
      console.error('Unexpected authentication error', {
        id: socket.id,
        error: err.message,
        timestamp: new Date().toISOString()
      });
      authFailures++;
      healthStatus.errors++;
      return next(new Error('Authentication error: Server error'));
    }
  });

  // Add connection timeout handling
  io.engine.on('connection_error', (err) => {
    lastActivity = new Date();
    healthStatus.errors++;
    console.error('Socket.IO connection error:', {
      error: err.message,
      req: err.req?.url,
      code: err.code,
      context: err.context,
      timestamp: new Date().toISOString()
    });
  });

  // Log connection events for debugging
  io.engine.on('connection', (socket) => {
    console.log('Transport connection established:', {
      id: socket.id,
      remoteAddress: socket.remoteAddress,
      timestamp: new Date().toISOString()
    });
  });

  // Main connection handler
  io.on('connection', (socket) => {
    lastActivity = new Date();
    connections++;
    totalConnections++;
    healthStatus.activeConnections = connections;
    healthStatus.totalConnections = totalConnections;
    
    console.log('Socket client connected:', {
      id: socket.id,
      transport: socket.conn.transport.name,
      userId: socket.data.userId,
      connections,
      timestamp: new Date().toISOString()
    });

    // Add timeout monitoring
    let timeoutTimer;
    const resetTimeout = () => {
      lastActivity = new Date();
      if (timeoutTimer) clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => {
        console.error('Client timeout detected:', {
          id: socket.id,
          lastActivity: lastActivity.toISOString(),
          currentTime: new Date().toISOString(),
          inactiveFor: `${(new Date().getTime() - lastActivity.getTime()) / 1000} seconds`
        });
        socket.disconnect(true);
      }, 60000); // 60 seconds timeout
    };

    resetTimeout();

    // Handle join_room with acknowledgment
    socket.on('join_room', (data, callback) => {
      lastActivity = new Date();
      try {
        const roomId = typeof data === 'object' ? data.roomId : data;
        
        if (!roomId) {
          const errorMsg = 'Invalid room ID';
          console.error(`${errorMsg}:`, { socketId: socket.id });
          if (callback) callback({ error: errorMsg });
          return;
        }
        
        console.log(`Client ${socket.id} joining room:`, {
          roomId,
          userId: socket.data.userId,
          timestamp: new Date().toISOString()
        });
        
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
        
        // Send acknowledgment to client
        if (callback) callback({ success: true, roomId });
        resetTimeout();
      } catch (err) {
        console.error('Error joining room:', {
          error: err.message,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        if (callback) callback({ error: 'Failed to join room' });
      }
    });

    // Handle leave_room with acknowledgment
    socket.on('leave_room', (data, callback) => {
      lastActivity = new Date();
      try {
        const roomId = typeof data === 'object' ? data.roomId : data;
        
        if (!roomId) {
          const errorMsg = 'Invalid room ID';
          console.error(`${errorMsg}:`, { socketId: socket.id });
          if (callback) callback({ error: errorMsg });
          return;
        }
        
        console.log(`Client ${socket.id} leaving room:`, {
          roomId,
          timestamp: new Date().toISOString()
        });
        
        socket.leave(roomId);
        console.log(`Client ${socket.id} left room ${roomId}`);
        
        // Send acknowledgment to client
        if (callback) callback({ success: true, roomId });
        resetTimeout();
      } catch (err) {
        console.error('Error leaving room:', {
          error: err.message,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        if (callback) callback({ error: 'Failed to leave room' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      lastActivity = new Date();
      connections--;
      disconnections++;
      healthStatus.activeConnections = connections;
      
      console.log('Client disconnected:', {
        id: socket.id,
        reason,
        connections,
        timestamp: new Date().toISOString()
      });
      
      if (timeoutTimer) clearTimeout(timeoutTimer);
    });

    // Handle errors
    socket.on('error', (error) => {
      lastActivity = new Date();
      healthStatus.errors++;
      
      console.error('Socket error:', {
        id: socket.id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Handle client pings
    socket.on('ping', (callback) => {
      lastActivity = new Date();
      console.log('Received ping from client:', {
        id: socket.id,
        timestamp: new Date().toISOString()
      });
      
      // Respond with server time
      if (callback) callback({ serverTime: Date.now() });
      resetTimeout();
    });

    // Handle heartbeats
    socket.on('heartbeat', (data, callback) => {
      lastActivity = new Date();
      console.log('Received heartbeat from client:', {
        id: socket.id,
        timestamp: new Date().toISOString()
      });
      
      // Respond with connection status
      if (callback) {
        callback({ 
          serverTime: Date.now(),
          status: 'connected',
          uptime: (Date.now() - healthStatus.startTime.getTime()) / 1000
        });
      }
      resetTimeout();
    });
  });

  // Add health check endpoint
  setInterval(() => {
    const now = new Date();
    const inactiveSince = (now.getTime() - lastActivity.getTime()) / 1000;
    
    healthStatus.online = true;
    healthStatus.activeConnections = connections;
    
    // Only log every minute to reduce noise
    console.log('Socket.IO server health status:', {
      timestamp: now.toISOString(),
      connections,
      totalConnections,
      disconnections,
      errors: healthStatus.errors,
      uptime: (now.getTime() - healthStatus.startTime.getTime()) / 1000,
      lastActivity: lastActivity.toISOString(),
      inactiveSince: `${inactiveSince} seconds`
    });
    
    // Detect server inactivity
    if (inactiveSince > 300) { // 5 minutes
      console.warn('Server inactive for too long:', {
        inactiveSince: `${inactiveSince} seconds`,
        lastActivity: lastActivity.toISOString()
      });
    }
  }, 60000); // Log stats every minute

  console.log('Socket.IO server initialized successfully');
  return server;
};

/**
 * Get the socket.io server instance
 */
const getSocket = () => {
  return io;
};

/**
 * Get server health status
 */
const getHealthStatus = () => {
  return {
    ...healthStatus,
    uptime: (Date.now() - healthStatus.startTime.getTime()) / 1000,
    lastActivity: lastActivity.toISOString()
  };
};

module.exports = {
  initSocket,
  getSocket,
  getHealthStatus
}; 