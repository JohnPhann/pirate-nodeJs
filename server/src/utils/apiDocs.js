/**
 * API documentation generator
 * 
 * This simple utility provides a documentation endpoint
 * that describes all available API routes and their usage.
 */

const apiRoutes = {
  auth: {
    register: {
      method: 'POST',
      path: '/api/auth/register',
      description: 'Register a new user',
      body: {
        username: 'Username for the new account',
        email: 'Email address for the new account',
        password: 'Password for the new account (min 6 characters)'
      },
      responses: {
        201: 'User created successfully with JWT token',
        400: 'Validation error or user already exists'
      }
    },
    login: {
      method: 'POST',
      path: '/api/auth/login',
      description: 'Login with existing credentials',
      body: {
        email: 'Email address',
        password: 'Account password'
      },
      responses: {
        200: 'Login successful with JWT token',
        400: 'Invalid credentials'
      }
    },
    me: {
      method: 'GET',
      path: '/api/auth/me',
      description: 'Get current user profile',
      auth: 'JWT token required in Authorization header',
      responses: {
        200: 'User profile',
        401: 'Unauthorized (missing or invalid token)'
      }
    }
  },
  users: {
    search: {
      method: 'GET',
      path: '/api/users/search?q=query',
      description: 'Search for users by username',
      auth: 'JWT token required',
      params: {
        q: 'Search query string'
      },
      responses: {
        200: 'List of matching users',
        401: 'Unauthorized'
      }
    },
    profile: {
      method: 'GET',
      path: '/api/users/:userId',
      description: 'Get a specific user profile',
      auth: 'JWT token required',
      params: {
        userId: 'ID of the user to retrieve'
      },
      responses: {
        200: 'User profile',
        401: 'Unauthorized',
        404: 'User not found'
      }
    },
    addFriend: {
      method: 'POST',
      path: '/api/users/:userId/friend',
      description: 'Add a user as friend',
      auth: 'JWT token required',
      params: {
        userId: 'ID of the user to add as friend'
      },
      responses: {
        200: 'Friend added successfully',
        400: 'Already friends',
        401: 'Unauthorized',
        404: 'User not found'
      }
    }
  },
  rooms: {
    getAll: {
      method: 'GET',
      path: '/api/rooms',
      description: 'Get all rooms for current user',
      auth: 'JWT token required',
      responses: {
        200: 'List of rooms',
        401: 'Unauthorized'
      }
    },
    getOne: {
      method: 'GET',
      path: '/api/rooms/:roomId',
      description: 'Get a specific room',
      auth: 'JWT token required',
      params: {
        roomId: 'ID of the room to retrieve'
      },
      responses: {
        200: 'Room details',
        401: 'Unauthorized',
        403: 'Not a member of the room',
        404: 'Room not found'
      }
    },
    create: {
      method: 'POST',
      path: '/api/rooms',
      description: 'Create a new room',
      auth: 'JWT token required',
      body: {
        name: 'Room name (optional for direct messages)',
        isGroup: 'Boolean indicating if this is a group chat',
        memberIds: 'Array of user IDs to add to the room'
      },
      responses: {
        201: 'Room created successfully',
        400: 'Validation error or invalid members',
        401: 'Unauthorized'
      }
    }
  },
  messages: {
    getByRoom: {
      method: 'GET',
      path: '/api/messages/:roomId',
      description: 'Get messages for a room',
      auth: 'JWT token required',
      params: {
        roomId: 'ID of the room to get messages from'
      },
      query: {
        limit: 'Number of messages to return (default: 50)',
        before: 'Timestamp to get messages before (default: now)'
      },
      responses: {
        200: 'List of messages',
        401: 'Unauthorized',
        403: 'Not a member of the room',
        404: 'Room not found'
      }
    },
    send: {
      method: 'POST',
      path: '/api/messages',
      description: 'Send a new message',
      auth: 'JWT token required',
      body: {
        roomId: 'ID of the room to send message to',
        content: 'Message content'
      },
      responses: {
        201: 'Message sent successfully',
        400: 'Validation error',
        401: 'Unauthorized',
        403: 'Not a member of the room',
        404: 'Room not found'
      }
    }
  }
};

/**
 * Get API documentation
 * @returns {Object} API documentation
 */
const getApiDocs = () => {
  return {
    title: 'Chat Application API Documentation',
    version: '1.0.0',
    baseUrl: '/api',
    authentication: 'JWT token in Authorization header (Bearer token)',
    routes: apiRoutes
  };
};

module.exports = {
  getApiDocs
}; 