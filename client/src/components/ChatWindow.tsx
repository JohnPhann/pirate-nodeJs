import React, { useEffect, useState, useContext, useRef } from 'react';
import { Card, Typography, Spin, Button, Modal, List, Avatar, message as antMessage, Badge, Tooltip, Input, Result } from 'antd';
import { UserOutlined, TeamOutlined, LoadingOutlined, SendOutlined, PaperClipOutlined, SmileOutlined, MoreOutlined, CheckOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import MessageList from './MessageList';
import { Message, Room, User, Reaction, TempMessage } from '../types';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { initSocket, getSocket, emit, joinRoom, leaveRoom } from '../utils/socket';
import type { Socket } from 'socket.io-client';
import { API_URL } from '../config';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

const { Title, Text } = Typography;

interface ChatWindowProps {
  roomId: string;
  onReactionAdd: (messageId: string, reaction: string) => void;
  onReactionRemove: (reactionId: string, messageId: string) => void;
  onTyping: (isTyping: boolean) => void;
}

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

// MessageInput component
const MessageInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  onTyping: (isTyping: boolean) => void;
}> = ({ value, onChange, onSend, disabled, onTyping }) => {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Emit typing event
    if (newValue.trim()) {
      console.log('Emitting typing event: true');
      onTyping(true);
      
      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        console.log('Emitting typing event: false (timeout)');
        onTyping(false);
      }, 3000);
    } else {
      console.log('Emitting typing event: false (empty input)');
      onTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col p-4 border-t border-gray-200 bg-white">
      <div className="flex items-center space-x-2">
        <Input.TextArea
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="flex-1"
          disabled={disabled}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSend}
          loading={disabled}
          disabled={!value.trim() || disabled}
        >
          Send
        </Button>
      </div>
      <div className="flex items-center justify-end mt-2 text-xs text-gray-500">
        <span>Press Enter to send, Shift + Enter for new line</span>
      </div>
    </div>
  );
};

// TypingIndicator component
const TypingIndicator: React.FC<{ typingUsers: TypingUser[] }> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;
  
  if (typingUsers.length === 1) {
    return (
      <div className="flex items-center text-gray-500 text-sm py-1">
        <LoadingOutlined className="mr-2 text-blue-500" />
        <Text italic>{typingUsers[0].username} is typing...</Text>
      </div>
    );
  } else if (typingUsers.length === 2) {
    return (
      <div className="flex items-center text-gray-500 text-sm py-1">
        <LoadingOutlined className="mr-2 text-blue-500" />
        <Text italic>{typingUsers[0].username} and {typingUsers[1].username} are typing...</Text>
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-gray-500 text-sm py-1">
        <LoadingOutlined className="mr-2 text-blue-500" />
        <Text italic>Several people are typing...</Text>
      </div>
    );
  }
};

// ChatWindow component
const ChatWindow: React.FC<ChatWindowProps> = ({ 
  roomId, 
  onReactionAdd, 
  onReactionRemove,
  onTyping,
}) => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get('/users/me');
        if (response.data && typeof response.data === 'object') {
          setCurrentUser(response.data);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch room and messages
  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;

      try {
        setLoading(true);
        const [roomResponse, messagesResponse] = await Promise.all([
          api.get(`/rooms/${roomId}`),
          api.get(`/messages/room/${roomId}`)
        ]);
        
        if (roomResponse.data && typeof roomResponse.data === 'object') {
          setRoom(roomResponse.data);
        }
        
        if (Array.isArray(messagesResponse.data)) {
          setMessages(messagesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = async () => {
      if (!roomId || !currentUser) {
        console.log('Cannot initialize socket: missing roomId or currentUser');
        return;
      }

      try {
        console.log('Initializing socket for room:', roomId);
        
        // Get existing socket or initialize a new one
        let newSocket = getSocket();
        
        if (!newSocket) {
          console.log('No existing socket found, initializing a new one');
          newSocket = await initSocket();
        } else {
          console.log('Using existing socket:', newSocket.id);
        }
        
        if (!newSocket) {
          console.error('Failed to initialize socket');
          antMessage.error('Failed to connect to chat. Please login again.');
          return;
        }

        setSocket(newSocket);
        setSocketConnected(newSocket.connected);

        // Set up socket event listeners
        newSocket.on('connect', () => {
          console.log('Socket connected to room:', roomId);
          setSocketConnected(true);
          
          // Join room after connection (with acknowledgment)
          joinRoom(roomId, {
            userId: currentUser._id,
            username: currentUser.username
          }).then(() => {
            console.log('Room joined successfully:', roomId);
          }).catch(err => {
            console.error('Failed to join room:', err);
            antMessage.error('Failed to join chat room. Please try again.');
          });
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setSocketConnected(false);
          
          // Show notification for unexpected disconnects
          if (reason !== 'io client disconnect') {
            antMessage.warning('Connection lost. Attempting to reconnect...');
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setSocketConnected(false);
          
          // Show appropriate error message
          if (error.message === 'Authentication error') {
            antMessage.error('Authentication failed. Please login again.');
          } else {
            antMessage.error('Connection error. Trying to reconnect...');
          }
        });
        
        // Add handler for server error events
        newSocket.on('error', (data) => {
          console.error('Server error:', data);
          antMessage.error(data.message || 'Server error occurred');
        });
        
        // Handle room joining
        newSocket.on('room_joined', (data) => {
          console.log('Successfully joined room:', data);
          // Fetch latest messages after joining room
          fetchLatestMessages();
        });

        newSocket.on('room_join_error', (error) => {
          console.error('Failed to join room:', error);
          antMessage.error('Failed to join chat room. Please try again.');
        });

        // If we have a valid socket and room ID, make sure we're joined to the room
        if (newSocket.connected && roomId) {
          console.log('Ensuring room is joined:', roomId);
          joinRoom(roomId, {
            userId: currentUser._id,
            username: currentUser.username
          }).catch(err => {
            console.error('Failed to join room:', err);
          });
        }

        // Handle typing events
        newSocket.on('user_typing', (data) => {
          if (data.roomId !== roomId || data.userId === user?._id) return;
          
          if (data.isTyping) {
            setTypingUsers(prev => {
              const filtered = prev.filter(u => u.userId !== data.userId);
              return [...filtered, { 
                userId: data.userId, 
                username: data.username,
                timestamp: Date.now() 
              }];
            });
          } else {
            setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
          }
        });
        
        // Handle new messages
        newSocket.on('new_message', (message: Message) => {
          if (message.roomId !== roomId) return;
          
          console.log('New message received:', message);
          
          setMessages(prev => {
            if (!Array.isArray(prev)) return [message];
            
            // If we already have this message (by ID), don't add it
            const messageExists = prev.some(m => m._id === message._id);
            if (messageExists) {
              // But update existing temp messages if they match
              return prev.map(m => {
                // If this is a temp message that matches the content/sender, replace it
                if ((m as any).pending && 
                    m.content === message.content && 
                    m?.senderId?._id === message?.senderId?._id) {
                  return message;
                }
                return m;
              });
            }
            
            return [...prev, message];
          });
          
          // Clear typing indicator for the sender
          setTypingUsers(prev => prev.filter(u => u.userId !== message.senderId?._id));
          
          // Scroll to bottom
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        });

        // Handle reconnection events
        if (isBrowser) {
          window.addEventListener('socket-connected', () => {
            console.log('Socket reconnected, joining room:', roomId);
            setSocketConnected(true);
            
            // Re-join room after reconnection
            if (roomId && currentUser) {
              joinRoom(roomId, {
                userId: currentUser._id,
                username: currentUser.username
              }).then(() => {
                // Fetch latest messages after reconnection
                fetchLatestMessages();
              }).catch(err => {
                console.error('Failed to join room after reconnection:', err);
              });
            }
          });
          
          window.addEventListener('socket-disconnected', () => {
            setSocketConnected(false);
          });
          
          window.addEventListener('socket-error', () => {
            setSocketConnected(false);
          });
        }

        // Handle message reactions
        newSocket.on('reaction_added', (reaction: Reaction) => {
          setMessages(prev => {
            if (!Array.isArray(prev)) return prev;
            return prev.map(msg => {
              if (msg._id === (reaction.messageId && typeof reaction.messageId === 'object' ? reaction.messageId._id : reaction.messageId)) {
                const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
                return {
                  ...msg,
                  reactions: [...reactions, reaction]
                };
              }
              return msg;
            });
          });
        });

        newSocket.on('reaction_removed', (data) => {
          setMessages(prevMessages =>
            prevMessages.map(message =>
              message._id === data.messageId
                ? {
                    ...message,
                    reactions: message.reactions.filter(
                      r => !(r.userId._id === data.userId && r.reaction === data.reaction)
                    )
                  }
                : message
            )
          );
        });
        
      } catch (error) {
        console.error('Error initializing socket:', error);
        antMessage.error('Failed to connect to chat. Please try again.');
      }
    };

    if (roomId && currentUser) {
      initializeSocket();
    }

    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('room_joined');
        socket.off('room_join_error');
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('reaction_added');
        socket.off('reaction_removed');
        socket.off('error');
        
        // Remove window event listeners
        if (isBrowser) {
          window.removeEventListener('socket-connected', () => {});
          window.removeEventListener('socket-disconnected', () => {});
          window.removeEventListener('socket-error', () => {});
        }
        
        // Leave the room, but don't disconnect the socket
        if (roomId) {
          leaveRoom(roomId, {
            userId: currentUser?._id,
            username: currentUser?.username
          }).catch(err => {
            console.error('Error leaving room:', err);
          });
        }
      }
    };
  }, [roomId, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket || !currentUser) return;
  
    // Save message content and clear input immediately
    const content = newMessage.trim();
    setNewMessage('');
    handleTypingEvent(false);
  
    try {
      // Create message object
      const messageData = {
        content,
        roomId,
        userId: currentUser._id,
        username: currentUser.username,
        timestamp: Date.now()
      };
  
      // Add to UI immediately for responsiveness with pending status
      const tempId = `temp-${Date.now()}`;
      const now = new Date();
      const tempMessage: TempMessage = {
        _id: tempId,
        content,
        roomId,
        userId: {
          _id: currentUser._id,
          username: currentUser.username,
          email: currentUser.email || ''
        },
        createdAt: now.toISOString(),
        pending: true // Mark as pending for UI indicator
      };
  
      // // Add the temporary message to the UI
      // setMessages(prev => [...prev, tempMessage as unknown as Message]);
  
      // Scroll to new message
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  
      // Direct socket.emit - most reliable approach
      console.log('Sending message to server:', messageData);
  
      // Set sending state
      setSendingMessage(true);
  
      // Use the private_message event with acknowledgment
      socket.emit('private_message', {
        roomId,
        content: messageData.content
      }, (response) => {
        setSendingMessage(false);
  
        if (response && response.error) {
          console.error('Error sending message:', response.error);
          antMessage.error('Failed to send message: ' + response.error);
  
          // Update the UI to show the message failed
          setMessages(prev => 
            prev.map(msg => 
              (msg._id === tempId) 
                ? { ...msg, error: true, pending: false } 
                : msg
            )
          );
        } else {
          console.log('Message sent successfully:', response);
  
          // If the server sent back the saved message, update our temp message
          if (response && response._id) {
            setMessages(prev => 
              prev.map(msg => 
                (msg._id === tempId) 
                  ? {
                      ...msg,
                      _id: response._id, 
                      createdAt: response.createdAt, 
                      updatedAt: response.updatedAt, 
                      content: response.content, 
                      sender: response.sender, 
                      pending: false, // Mark as sent
                      delivered: true
                    } 
                  : msg
              )
            );
  
            // Scroll to the new message after update
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setSendingMessage(false);
      antMessage.error('Error sending message');
    }
  };
  // Fetch latest messages from server
  const fetchLatestMessages = async () => {
    if (!roomId) return;
    
    try {
      const response = await api.get(`/messages/room/${roomId}`);
      
      if (Array.isArray(response.data)) {
        // Replace any unconfirmed messages that match confirmed ones from server
        const serverMessages = response.data;
        
        setMessages(prev => {
          // Create a new array with confirmed messages from server
          // and only keep local messages that don't exist on the server
          const updatedMessages = prev.map(localMsg => {
            // Skip messages that aren't unconfirmed
            if (!(localMsg as any).unconfirmed) return localMsg;
            
            // Look for a matching message on server (by content and sender)
            const serverMatch = serverMessages.find(serverMsg => 
              serverMsg.content === localMsg.content && 
              serverMsg.sender._id === localMsg.senderId._id
            );
            
            // If we found a match, use the server version
            return serverMatch || localMsg;
          });
          
          return updatedMessages as Message[];
        });
      }
    } catch (error) {
      console.error('Error fetching latest messages:', error);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle typing events
  const handleTypingEvent = (isTyping: boolean) => {
    console.log('Handling typing event:', isTyping);
    
    if (!socket?.connected || !currentUser || !roomId) {
      console.warn('Cannot send typing event - not properly connected');
      return;
    }
    
    console.log('Sending typing event:', {
      roomId,
      isTyping
    });
    
    // Send typing event to server - server will use socket.userId to identify the user
    socket.emit('typing', {
      roomId,
      isTyping
    });
    
    // Also call the onTyping prop for parent components
    onTyping(isTyping);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full">
        <Result
          status="404"
          title="Room Not Found"
          subTitle="Sorry, the chat room you visited does not exist."
        />
      </div>
    );
  }

  console.log("sd",messages);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <MessageList
            messages={Array.isArray(messages) ? messages : []}
            currentUser={currentUser}
            onReactionAdd={onReactionAdd}
            onReactionRemove={(reactionId: string) => {
              // Find the message that contains this reaction
              const msg = messages.find(m => (m.reactions || []).some(r => r._id === reactionId));
              if (msg) {
                onReactionRemove(reactionId, msg._id);
              }
            }}
          />
          <TypingIndicator typingUsers={Array.isArray(typingUsers) ? typingUsers : []} />
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <MessageInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          disabled={sendingMessage}
          onTyping={handleTypingEvent}
        />
      </div>
    </div>
  );
};

export default ChatWindow; 