import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import socketManager from '../utils/socketManager';

/**
 * Hook to manage socket.io connection and events in components
 */
export function useSocket(autoConnect = true) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(socketManager.status);
  const [error, setError] = useState<Error | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const eventListeners = useRef(new Map<string, Array<(...args: any[]) => void>>());
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection with timeout handling
  const connect = useCallback(async () => {
    try {
      setError(null);
      setConnectionAttempts(prev => prev + 1);
      
      // Set up timeout for connection attempt
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
      
      // If we've had many failed attempts, let the user know
      if (connectionAttempts > 5) {
        console.warn(`Multiple connection attempts (${connectionAttempts}), may be server issue`);
      }
      
      const newSocket = await socketManager.initialize();
      setSocket(newSocket);
      setConnected(!!newSocket?.connected);
      setStatus(socketManager.status);
      return newSocket;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('Error connecting socket in hook:', err);
      
      // Schedule auto-retry if not too many attempts
      if (connectionAttempts < 5) {
        connectTimeoutRef.current = setTimeout(() => {
          console.log(`Auto-retrying connection (attempt ${connectionAttempts + 1})`);
          connect();
        }, 3000 + (connectionAttempts * 1000)); // Increasing backoff
      }
      
      return null;
    }
  }, [connectionAttempts]);

  // Reconnect socket with explicit reset of connection attempts
  const reconnect = useCallback(() => {
    // Reset connection attempts on manual reconnect
    setConnectionAttempts(0);
    socketManager.reconnect();
  }, []);

  // Join a room
  const joinRoom = useCallback((roomId: string, userData?: any) => {
    socketManager.joinRoom(roomId, userData);
  }, []);

  // Leave a room
  const leaveRoom = useCallback((roomId: string, userData?: any) => {
    socketManager.leaveRoom(roomId, userData);
  }, []);

  // Send a message to a room
  const sendMessage = useCallback((roomId: string, message: any) => {
    socketManager.sendMessage(roomId, message);
  }, []);

  // Emit an event
  const emit = useCallback((event: string, ...args: any[]) => {
    socketManager.emit(event, ...args);
  }, []);

  // Register event listener
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketManager.on(event, callback);
    
    // Keep track of listeners for cleanup
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, []);
    }
    eventListeners.current.get(event)?.push(callback);
  }, []);

  // Remove event listener
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    socketManager.off(event, callback);
    
    // Clean up from our tracking
    if (callback && eventListeners.current.has(event)) {
      const listeners = eventListeners.current.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else if (!callback) {
      eventListeners.current.delete(event);
    }
  }, []);

  // Get current connection status
  const getStatus = useCallback(() => {
    return socketManager.getStats();
  }, []);

  // Disconnect and clean up
  const disconnect = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    
    socketManager.dispose();
    setSocket(null);
    setConnected(false);
    setStatus('disconnected');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // Set up status monitor
    const statusInterval = setInterval(() => {
      const stats = socketManager.getStats();
      setConnected(stats.connected);
      setStatus(stats.status);
      
      // If we're not connected and not in an error state,
      // and it's been more than 3 minutes since we started,
      // try reconnecting automatically
      if (!stats.connected && 
          !['error', 'connection_error', 'initialization_error'].includes(stats.status) &&
          connectionAttempts > 0 && 
          Date.now() - new Date(stats.lastActivity).getTime() > 180000) {
        console.log('Long period of inactivity detected, reconnecting socket');
        reconnect();
      }
    }, 3000);
    
    return () => {
      clearInterval(statusInterval);
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, [autoConnect, connect, reconnect, connectionAttempts]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      // Remove all registered listeners when component unmounts
      eventListeners.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          socketManager.off(event, callback);
        });
      });
      eventListeners.current.clear();
      
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    connected,
    status,
    error,
    connectionAttempts,
    connect,
    reconnect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    emit,
    on,
    off,
    getStatus
  };
} 