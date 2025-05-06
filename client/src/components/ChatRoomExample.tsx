import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface ChatRoomExampleProps {
  roomId: string;
  userId: string;
  username: string;
}

const ChatRoomExample: React.FC<ChatRoomExampleProps> = ({ 
  roomId, 
  userId, 
  username 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Initialize socket with auto-connect
  const { 
    connected, 
    status, 
    error, 
    joinRoom, 
    leaveRoom, 
    sendMessage, 
    on, 
    off, 
    emit,
    reconnect,
    getStatus
  } = useSocket(true);

  // Join the room when connected
  useEffect(() => {
    if (connected) {
      // Join the room with user data
      joinRoom(roomId, { userId, username });
      
      // Listen for messages
      on('message', (data: Message) => {
        setMessages(prev => [...prev, data]);
      });
      
      // Listen for typing events
      on('typing', (data: { username: string, isTyping: boolean }) => {
        setTypingUsers(prev => {
          if (data.isTyping && !prev.includes(data.username)) {
            return [...prev, data.username];
          } else if (!data.isTyping) {
            return prev.filter(user => user !== data.username);
          }
          return prev;
        });
      });
      
      console.log('Connected to room:', roomId, 'Status:', getStatus());
    }
    
    // Clean up when component unmounts
    return () => {
      if (connected) {
        leaveRoom(roomId, { userId, username });
        off('message');
        off('typing');
      }
    };
  }, [connected, roomId, userId, username, joinRoom, leaveRoom, on, off, getStatus]);

  // Handle input change and typing events
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Send typing event
    if (!isTyping) {
      setIsTyping(true);
      emit('typing', { roomId, username, isTyping: true });
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emit('typing', { roomId, username, isTyping: false });
    }, 2000);
  };

  // Handle message sending
  const handleSendMessage = () => {
    if (messageInput.trim() && connected) {
      const message = {
        content: messageInput.trim(),
        sender: username,
        timestamp: new Date().toISOString()
      };
      
      // Send message
      sendMessage(roomId, message);
      setMessageInput('');
      
      // Reset typing
      setIsTyping(false);
      emit('typing', { roomId, username, isTyping: false });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Handle manual reconnection
  const handleReconnect = () => {
    reconnect();
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <h2>Chat Room: {roomId}</h2>
        <div className="status-indicator">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">{status}</span>
          {!connected && (
            <button onClick={handleReconnect} className="reconnect-button">
              Reconnect
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          Error: {error.message}
        </div>
      )}
      
      <div className="message-container">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet</div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.sender === username ? 'own-message' : 'other-message'}`}
            >
              <div className="message-header">
                <span className="sender">{message.sender}</span>
                <span className="timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
      </div>
      
      {typingUsers.length > 0 && typingUsers.filter(user => user !== username).length > 0 && (
        <div className="typing-indicator">
          {typingUsers.filter(user => user !== username).join(', ')} is typing...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={!connected}
          className="message-input"
        />
        <button 
          type="submit" 
          disabled={!connected || !messageInput.trim()}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatRoomExample; 