import React, { useState, useEffect, useRef } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { getSocket } from '../utils/socket';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
  roomId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  loading = false,
  roomId
}) => {
  const [message, setMessage] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<any>(null);
  
  // Function to emit typing status
  const emitTypingStatus = (isTyping: boolean) => {
    const socket = getSocket();
    if (socket && roomId) {
      socket.emit('typing', { roomId, isTyping });
    }
  };
  
  // Handle input change with debounce for typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // Only emit typing events if there's actual content
    if (newMessage.trim().length > 0) {
      // Send typing = true event
      emitTypingStatus(true);
      
      // Clear existing timeout if any
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to send typing = false after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        emitTypingStatus(false);
      }, 2000);
      
      setTypingTimeout(timeout);
    } else {
      // If message is empty, immediately send typing = false
      emitTypingStatus(false);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  };
  
  // Clear typing status when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      emitTypingStatus(false);
    };
  }, [roomId]);

  const handleSend = () => {
    if (message.trim() && !disabled && !loading) {
      onSendMessage(message);
      setMessage('');
      
      // Stop typing indicator when message is sent
      emitTypingStatus(false);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }

      // Reset textarea height
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.resizableTextArea.textArea.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center w-full space-x-2">
      <Input.TextArea
        ref={textAreaRef}
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder="Type your message..."
        autoSize={{ minRows: 1, maxRows: 4 }}
        className="flex-1"
        disabled={disabled}
        style={{ 
          resize: 'none',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #d9d9d9',
          transition: 'all 0.3s',
          fontSize: '14px',
          lineHeight: '1.5',
          maxHeight: '120px',
          overflowY: 'auto'
        }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSend}
        loading={loading}
        disabled={disabled || !message.trim()}
        className="h-10 w-10 flex items-center justify-center"
        style={{
          borderRadius: '8px',
          padding: '0',
          flexShrink: 0
        }}
      />
    </div>
  );
};

export default MessageInput; 