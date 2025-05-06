import React from 'react';
import { List, Typography, Spin } from 'antd';
import Message from './Message';
import { Message as MessageType, User } from '../types';

interface MessageListProps {
  messages: MessageType[];
  currentUser: User | null;
  onReactionAdd: (messageId: string, reaction: string) => void;
  onReactionRemove: (reactionId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onReactionAdd,
  onReactionRemove,
}) => {


  if (!currentUser) {
    console.log('No current user, rendering loading state'); // Debug log
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

 

  return (
    <List
      className="message-list"
      itemLayout="vertical"
      dataSource={messages}
      renderItem={(message) => {
        return (
          <List.Item key={message._id} className="message-item">
            <Message
              message={message}
              currentUser={currentUser}
              onReactionAdd={onReactionAdd}
              onReactionRemove={onReactionRemove}
            />
          </List.Item>
        );
      }}
    />
  );
};

export default MessageList; 