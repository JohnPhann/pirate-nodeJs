const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const routes = {
  auth: require('./routes/authRoutes'),
  rooms: require('./routes/roomRoutes'),
  messages: require('./routes/messageRoutes'),
  users: require('./routes/userRoutes'),
  docs: require('./routes/docsRoutes'),
  reactions: require('./routes/reactionsRoutes'),
};

// Import middleware
const rateLimit = require('./middlewares/rateLimit');
const setupChatSocket = require('./sockets/chatSocket');

class App {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.dbConnected = false;
    this.routesRegistered = false;
  }

  initialize() {
    try {
      this.setupMiddleware();
      this.setupServer();
      this.setupSocketIO();
      this.setupDatabase();
      this.setupRoutes();
      this.setupErrorHandling();
    } catch (error) {
      logger.error('Failed to initialize app:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors(this.getCorsOptions()));
    this.app.use(express.json());

    // Pre-flight requests
    this.app.options('*', cors(this.getCorsOptions()));

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 100000
    }));
  }

  getCorsOptions() {
    return {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3001',
          config.clientUrl
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Headers'
      ],
      exposedHeaders: ['Set-Cookie'],
      maxAge: 86400
    };
  }

  setupServer() {
    try {
      if (this.shouldUseHttps()) {
        this.server = this.createHttpsServer();
        logger.info('Created HTTPS server');
      } else {
        this.server = this.createHttpServer();
        logger.info('Created HTTP server (SSL certificates not found)');
      }
    } catch (error) {
      logger.error('Failed to setup server:', error);
      throw error;
    }
  }

  shouldUseHttps() {
    return config.sslKeyPath && 
           config.sslCertPath && 
           fs.existsSync(config.sslKeyPath) && 
           fs.existsSync(config.sslCertPath);
  }

  createHttpsServer() {
    const credentials = {
      key: fs.readFileSync(config.sslKeyPath),
      cert: fs.readFileSync(config.sslCertPath)
    };
    return https.createServer(credentials, this.app);
  }

  createHttpServer() {
    return http.createServer(this.app);
  }

  setupSocketIO() {
    try {
      this.io = new Server(this.server, {
        cors: this.getCorsOptions(),
        pingTimeout: 60000,
        pingInterval: 25000
      });

      setupChatSocket(this.io);
      logger.info('Socket.IO setup completed');
    } catch (error) {
      logger.error('Failed to setup Socket.IO:', error);
      throw error;
    }
  }

  setupDatabase() {
    try {
      mongoose.connect(config.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      this.setupDatabaseEventHandlers();
    } catch (error) {
      logger.error('Failed to setup database:', error);
      throw error;
    }
  }

  setupDatabaseEventHandlers() {
    mongoose.connection.on('connected', () => {
      this.dbConnected = true;
      logger.info('MongoDB Atlas connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      this.handleDatabaseError(err);
    });

    mongoose.connection.on('disconnected', () => {
      this.dbConnected = false;
      logger.warn('Mongoose disconnected from MongoDB Atlas');
    });
  }

  handleDatabaseError(err) {
    logger.error('MongoDB connection error:', err);
    if (!this.dbConnected) {
      logger.warn('Server running in LIMITED MODE - database connection failed');
    }
  }

  setupRoutes() {
    if (this.routesRegistered) {
      logger.warn('Routes already registered, skipping...');
      return;
    }

    try {
      // Health check route
      this.app.get('/health', (req, res) => {
        res.json({ status: 'ok', dbConnected: this.dbConnected });
      });

      // API routes
      this.app.use('/api/auth', routes.auth);
      this.app.use('/api/rooms', routes.rooms);
      this.app.use('/api/messages', routes.messages);
      this.app.use('/api/users', routes.users);
      this.app.use('/api/docs', routes.docs);
      this.app.use('/api/reactions', routes.reactions);

      // 404 handler for API routes
      this.app.use('/api/*', (req, res) => {
        res.status(404).json({ error: 'API endpoint not found' });
      });

      // 404 handler for non-API routes
      this.app.use('*', (req, res) => {
        res.status(404).json({ error: 'Route not found' });
      });

      this.routesRegistered = true;
      logger.info('Routes setup completed');
    } catch (error) {
      logger.error('Failed to setup routes:', error);
      throw error;
    }
  }

  setupErrorHandling() {
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      logger.error('Error:', err);
      res.status(err.status || 500).json({
        error: {
          message: err.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
      });
    });
  }

  start() {
    try {
      const port = process.env.PORT || 3004;
      this.server.listen(port, () => {
        logger.info(`Server running on port ${port}`);
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      logger.info('Received SIGINT - Closing MongoDB connection');
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

module.exports = App; 