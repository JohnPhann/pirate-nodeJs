import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';

// Singleton socket instance
let socket: Socket | null = null;
let connectionAttempts = 0;
let reconnectionTimer: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let lastActivity = new Date();
let pingTimer: NodeJS.Timeout | null = null;
let autoReconnect = true;
let healthCheckTimer: NodeJS.Timeout | null = null;
let consecutiveTimeouts = 0;

// Socket connection status
const connectionStatus = {
  connected: false,
  status: 'disconnected',
  lastError: null as Error | null,
  attempts: 0,
  lastActivity: new Date(),
  pingLatency: 0,
  serverAvailable: true,
  lastReconnectAttempt: null as Date | null,
  consecutiveTimeouts: 0,
  lastSuccessfulHeartbeat: null as Date | null
};

/**
 * Check if running in browser
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get token from localStorage safely
 */
const getAuthToken = (): string | null => {
  if (!isBrowser) return null;
  
  try {
    return localStorage.getItem('token');
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return null;
  }
};

/**
 * Check server availability with a simple fetch request
 */


/**
 * Initialize socket connection with improved error handling
 */
export const initSocket = async (): Promise<Socket | null> => {
  // Skip socket initialization on the server side
  if (!isBrowser) {
    console.log('Skipping socket initialization (not in browser)');
    return null;
  }
  
  try {
    // If socket exists and is connected, return it
    if (socket?.connected) {
      console.log('Reusing existing socket connection:', socket.id);
      connectionStatus.connected = true;
      connectionStatus.status = 'connected';
      return socket;
    }

    // Update connection status
    connectionStatus.attempts = ++connectionAttempts;
    connectionStatus.status = 'connecting';
    connectionStatus.lastActivity = new Date();
    connectionStatus.lastReconnectAttempt = new Date();
    
    console.log(`Initializing socket (attempt ${connectionAttempts})...`);

    // Get token from localStorage
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token found');
      connectionStatus.status = 'auth_error';
      return null;
    }

   
    // Parse URL for proper connection settings
    const urlObj = new URL(API_URL);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Using the default socket.io path to match server configuration
    const socketPath = '/socket.io/';

    console.log(`Connecting to ${baseUrl} with path ${socketPath}`);

    // Clean up existing socket if needed
    if (socket) {
      cleanupSocket();
    }

    // Create a new socket with improved options
    socket = io(baseUrl, {
      path: socketPath,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      autoConnect: false, // We'll connect manually
      reconnection: true,
      reconnectionAttempts: 8, // Limit reconnection attempts
      reconnectionDelay: 1000, // Start with 1s delay
      reconnectionDelayMax: 10000, // Max 10s delay
      timeout: 15000, // 15s connection timeout
      auth: { token }, // Send auth token
      withCredentials: true, // Send cookies
      forceNew: connectionAttempts > 5, // Force new connection after many attempts
      query: { _t: Date.now().toString() } // Cache buster
    });

    // Set up event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully:', {
        id: socket?.id,
        connected: socket?.connected
      });
      
      connectionStatus.connected = true;
      connectionStatus.status = 'connected';
      connectionStatus.lastActivity = new Date();
      connectionStatus.serverAvailable = true;
      connectionStatus.lastError = null;
      
      // Reset connection attempts on successful connection
      connectionAttempts = 0;
      
      // Start heartbeat, ping and health monitoring
      startHeartbeat();
      startPing();
      startHealthMonitor();
      
      // Dispatch connection event for app components
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('socket-connected', { 
          detail: { socketId: socket?.id }
        }));
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message, {
        url: baseUrl,
        path: socketPath,
        attempt: connectionAttempts
      });
      
      connectionStatus.connected = false;
      connectionStatus.status = 'connection_error';
      connectionStatus.lastError = error;
      
  
      
      // Dispatch error event for app components
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('socket-error', { 
          detail: { error: error.message }
        }));
      }
      
      // Schedule reconnect if auto-reconnect is enabled
      if (autoReconnect) {
        scheduleReconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      connectionStatus.connected = false;
      connectionStatus.status = 'disconnected';
      
      // Clean up intervals
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
      }
      
      // Dispatch disconnect event for app components
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('socket-disconnected', { 
          detail: { reason }
        }));
      }
      
      // Auto-reconnect on unexpected disconnects if enabled
      if (autoReconnect && (reason === 'io server disconnect' || reason === 'transport close')) {
        scheduleReconnect();
      }
    });

    // Handle server errors
    socket.on('error', (error: any) => {
      console.error('Server error:', error);
      
      // Dispatch error event for app components
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('socket-server-error', { 
          detail: { error: typeof error === 'string' ? error : error.message || 'Unknown error' }
        }));
      }
    });

    // Add pong handler for latency measurement
    socket.on('pong', (latency: number) => {
      connectionStatus.pingLatency = latency;
      connectionStatus.lastActivity = new Date();
      console.log(`Socket ping latency: ${latency}ms`);
    });

    // Connect the socket
    socket.connect();

    // Wait for connection with timeout
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!socket?.connected) {
            connectionStatus.status = 'timeout';
            reject(new Error('Socket connection timeout'));
          }
        }, 10000); // 10 seconds timeout
  
        socket?.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
  
        socket?.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      return socket;
    } catch (error) {
      console.error('Socket connection failed:', error);
      
      if (autoReconnect) {
        scheduleReconnect();
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error initializing socket:', error);
    connectionStatus.status = 'error';
    connectionStatus.lastError = error instanceof Error ? error : new Error(String(error));
    connectionStatus.connected = false;
    
    // Try to reconnect if auto-reconnect is enabled
    if (autoReconnect) {
      scheduleReconnect();
    }
    
    return null;
  }
};

/**
 * Clean up socket properly
 */
const cleanupSocket = (): void => {
  if (!socket) return;
  
  try {
    // Remove all listeners
    socket.offAny();
    socket.removeAllListeners();
    
    // Disconnect
    if (socket.connected) {
      socket.disconnect();
    }
  } catch (e) {
    console.error('Error cleaning up socket:', e);
  }
};

/**
 * Schedule socket reconnection with exponential backoff
 */
const scheduleReconnect = (overrideDelay?: number) => {
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
    reconnectionTimer = null;
  }

  // Use exponential backoff for reconnection
  const baseDelay = 1000; // 1 second base
  const maxDelay = 30000; // 30 seconds max
  
  // Calculate delay with jitter to prevent thundering herd problem
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(1.5, Math.min(connectionAttempts, 10)), 
    maxDelay
  );
  
  // Add random jitter (±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  const delay = overrideDelay || Math.floor(exponentialDelay + jitter);
  
  console.log(`Scheduling reconnect in ${delay}ms (attempt ${connectionAttempts})`);
  connectionStatus.lastReconnectAttempt = new Date();
  
  reconnectionTimer = setTimeout(() => {
    if (!socket?.connected) {
      console.log('Attempting reconnection...');
      initSocket();
    }
  }, delay);
};

/**
 * Start heartbeat to keep connection alive
 */
const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // Use shorter heartbeat interval (15 seconds)
  heartbeatInterval = setInterval(() => {
    if (socket?.connected) {
      lastActivity = new Date();
      
      socket.emit('heartbeat', { timestamp: Date.now() }, (response: any) => {
        if (response && response.error) {
          console.error('Heartbeat error:', response.error);
        } else {
          // Record successful heartbeat
          connectionStatus.lastSuccessfulHeartbeat = new Date();
          
          // Update server latency
          const serverTime = response?.serverTime;
          if (serverTime) {
            const latency = Date.now() - serverTime;
            connectionStatus.pingLatency = latency;
          }
        }
      });
    } else {
      console.warn('Cannot send heartbeat - socket disconnected');
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // Try to reconnect if auto-reconnect is enabled
      if (autoReconnect) {
        reconnect();
      }
    }
  }, 15000); // 15 seconds
};

/**
 * Start ping to measure latency
 */
const startPing = () => {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  
  pingTimer = setInterval(() => {
    if (socket?.connected) {
      const start = Date.now();
      
      socket.emit('ping', (response: any) => {
        const latency = Date.now() - start;
        connectionStatus.pingLatency = latency;
        connectionStatus.lastActivity = new Date();
        console.log(`Socket ping latency: ${latency}ms`);
      });
    } else {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    }
  }, 30000); // 30 seconds
};

/**
 * Get the socket instance
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Get connection status
 */
export const getConnectionStatus = () => {
  return {
    ...connectionStatus,
    lastActivity: lastActivity.toISOString(),
    lastReconnectAttempt: connectionStatus.lastReconnectAttempt?.toISOString(),
    autoReconnect
  };
};

/**
 * Enable or disable auto reconnect
 */
export const setAutoReconnect = (enabled: boolean): void => {
  autoReconnect = enabled;
  
  if (enabled && !socket?.connected && connectionStatus.status !== 'connecting') {
    reconnect(); // Attempt immediate reconnection if enabled
  }
};

/**
 * Join a room with improved error handling and timeout
 */
export const joinRoom = (roomId: string, userData?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      console.warn('Cannot join room - socket not initialized');
      reject(new Error('Socket not initialized'));
      return;
    }
    
    if (!socket.connected) {
      console.warn('Cannot join room - socket not connected');
      reject(new Error('Socket not connected'));
      return;
    }
    
    // Add acknowledgment callback
    const timeoutId = setTimeout(() => {
      reject(new Error('Room join timeout'));
    }, 5000);
    
    socket.emit('join_room', { roomId, ...userData }, (response: any) => {
      clearTimeout(timeoutId);
      
      if (response && response.error) {
        console.error('Join room error:', response.error);
        reject(new Error(response.error));
      } else {
        console.log('Successfully joined room:', roomId);
        resolve(response || { success: true });
      }
    });
  });
};

/**
 * Leave a room with improved error handling
 */
export const leaveRoom = (roomId: string, userData?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      console.warn('Cannot leave room - socket not connected');
      reject(new Error('Socket not connected'));
      return;
    }
    
    const timeoutId = setTimeout(() => {
      // Resolve anyway on timeout since it's not critical
      resolve({ success: false, timeout: true });
    }, 3000);
    
    // Add acknowledgment callback
    socket.emit('leave_room', { roomId, ...userData }, (response: any) => {
      clearTimeout(timeoutId);
      
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response || { success: true });
      }
    });
  });
};

/**
 * Send a message with optimistic updates and fallbacks
 */
export const sendMessage = (roomId: string, message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      console.warn('Cannot send message - socket not connected');
      reject(new Error('Socket not connected'));
      return;
    }
    
    lastActivity = new Date();
    const timeoutId = setTimeout(() => {
      reject(new Error('Message sending timeout'));
    }, 8000);
    
    // Use the correct event name the server is listening for
    socket.emit('private_message', { roomId, content: message.content }, (response: any) => {
      clearTimeout(timeoutId);
      
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response || { success: true });
      }
    });
  });
};

/**
 * Emit a custom event with acknowledgment and improved timeout handling
 */
export const emit = (event: string, data: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      console.warn(`Cannot emit ${event} - socket not connected`);
      reject(new Error('Socket not connected'));
      return;
    }
    
    // Get appropriate timeout based on event type
    // Messages need longer timeout as they may involve database operations
    const timeout = event === 'private_message' ? 10000 : 5000;
    
    console.log(`Emitting ${event} with ${timeout}ms timeout`);
    lastActivity = new Date();
    
    const timeoutId = setTimeout(() => {
      // For message events specifically, try to detect if message might have been sent
      if (event === 'private_message') {
        console.warn(`${event} event timed out but may have been processed by server`);
        
        // If this is a message event, add special handling
        // We'll resolve with a warning that acknowledgment timed out but message might have been sent
        resolve({
          success: true,
          warning: 'Message acknowledgment timed out but message may have been sent',
          timeoutWarning: true,
          originalData: data
        });
      } else {
        reject(new Error(`Event ${event} timeout`));
      }
    }, timeout);
    
    try {
      socket.emit(event, data, (response: any) => {
        clearTimeout(timeoutId);
        
        if (response && response.error) {
          console.error(`Error in ${event} response:`, response.error);
          reject(new Error(response.error));
        } else {
          resolve(response || { success: true });
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error emitting ${event}:`, error);
      reject(error);
    }
  });
};

/**
 * Add event listener
 */
export const on = (event: string, callback: (...args: any[]) => void): void => {
  if (!socket) {
    console.warn('Socket not initialized yet');
    return;
  }
  
  socket.on(event, callback);
};

/**
 * Remove event listener
 */
export const off = (event: string, callback?: (...args: any[]) => void): void => {
  if (!socket) return;
  
  if (callback) {
    socket.off(event, callback);
  } else {
    socket.off(event);
  }
};

/**
 * Manually reconnect socket
 */
export const reconnect = async (): Promise<Socket | null> => {
  connectionAttempts = 0; // Reset connection attempts
  
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
    reconnectionTimer = null;
  }
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  if (socket) {
    cleanupSocket();
  }
  
  return initSocket();
};

/**
 * Disconnect and clean up socket
 */
export const disconnect = (): void => {
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
    reconnectionTimer = null;
  }
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  if (socket) {
    cleanupSocket();
    socket = null;
  }
  
  connectionStatus.connected = false;
  connectionStatus.status = 'disconnected';
};

/**
 * Start health check monitor to detect problematic connections
 */
const startHealthMonitor = () => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  connectionStatus.lastSuccessfulHeartbeat = new Date();
  connectionStatus.consecutiveTimeouts = 0;
  consecutiveTimeouts = 0;
  
  healthCheckTimer = setInterval(() => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
    
    // If we haven't seen activity in more than 45 seconds, connection is likely dead
    if (timeSinceLastActivity > 45000) {
      console.warn('Socket connection appears inactive:', {
        timeSinceLastActivity: `${timeSinceLastActivity}ms`,
        lastActivity: lastActivity.toISOString(),
        consecutiveTimeouts
      });
      
      // Increment consecutive timeouts counter
      consecutiveTimeouts++;
      connectionStatus.consecutiveTimeouts = consecutiveTimeouts;
      
      // After three consecutive timeouts, force reconnection
      if (consecutiveTimeouts >= 3) {
        console.error('Detected problematic socket connection - forcing reconnect after multiple timeouts');
        
        if (socket?.connected) {
          // The socket thinks it's connected but is probably in a bad state
          socket.disconnect();
        }
        
        // Force a reconnection
        reconnect();
        
        // Reset consecutive timeouts after taking action
        consecutiveTimeouts = 0;
        connectionStatus.consecutiveTimeouts = 0;
      }
    } else {
      // If we have activity, reset the consecutive timeouts
      if (consecutiveTimeouts > 0) {
        consecutiveTimeouts = 0;
        connectionStatus.consecutiveTimeouts = 0;
      }
    }
  }, 15000); // Check every 15 seconds
};

// Initialize socket on module load - ONLY in browser context
if (isBrowser) {
  setTimeout(() => {
    initSocket().catch(err => {
      console.error('Initial socket connection failed:', err);
    });
  }, 100);
} 