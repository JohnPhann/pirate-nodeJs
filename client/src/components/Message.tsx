import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserOutlined, ClockCircleOutlined, CheckOutlined, ExclamationCircleOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Message as MessageType, User } from '../types';
import Reaction from './Reaction';
import ReactionPicker from './ReactionPicker';
import { formatDistanceToNow } from 'date-fns';

interface MessageProps {
  message: MessageType;
  currentUser: User | null;
  onReactionAdd: (messageId: string, reaction: string) => void;
  onReactionRemove: (reactionId: string) => void;
}

const Message: React.FC<MessageProps> = ({
  message,
  currentUser,
  onReactionAdd,
  onReactionRemove,
}) => {
  const isOwnMessage = message?.senderId?._id === currentUser?._id;

  // Check message status for UI elements (extended message properties)
  const isPending = (message as any).pending === true;
  const isUnconfirmed = (message as any).unconfirmed === true;
  const hasError = (message as any).error === true;
  const isRetrying = (message as any).retrying === true;

  // Get message status icon and tooltip text
  const getStatusIndicator = () => {
    if (isPending && isRetrying) {
      return {
        icon: <LoadingOutlined className="text-yellow-500 animate-pulse" />,
        text: 'Retrying to send message...',
        color: 'text-yellow-500'
      };
    } else if (isPending) {
      return {
        icon: <ClockCircleOutlined className="text-yellow-500" />,
        text: 'Sending message...',
        color: 'text-yellow-500'
      };
    } else if (hasError) {
      return {
        icon: <ExclamationCircleOutlined className="text-red-500" />,
        text: 'Failed to send message',
        color: 'text-red-500'
      };
    } else if (isUnconfirmed) {
      return {
        icon: <QuestionCircleOutlined className="text-yellow-500" />,
        text: 'Message sent but delivery unconfirmed',
        color: 'text-yellow-500'
      };
    } else {
      return {
        icon: <CheckOutlined className="text-green-500" />,
        text: 'Message delivered',
        color: 'text-green-500'
      };
    }
  };

  console.log('message?.reactions', message?.reactions);

  // Group reactions by emoji
  const groupedReactions = (message?.reactions || []).reduce((acc, reaction) => {
    const { reaction: reactionType, userId, _id: reactionId } = reaction;
  
    // Nếu reaction type chưa có trong accumulator, thêm vào
    if (!acc[reactionType]) {
      acc[reactionType] = {
        count: 0,
        users: [],
        reactionId,
      };
    }
  
    // Thêm user vào danh sách users nếu chưa có
    if (!acc[reactionType].users.some((user) => user._id === userId._id)) {
      acc[reactionType].users.push(userId);
      acc[reactionType].count++;  // Tăng count khi có user mới
    }
  
    return acc;
  }, {} as Record<string, { count: number; users: User[]; reactionId: string }>);

  console.log('groupedReactions', groupedReactions);

  // Get status indicator for own messages
  const statusIndicator = getStatusIndicator();

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isOwnMessage && (
        <Avatar
          src={message?.senderId?.username}
          icon={<UserOutlined />}
          className="mr-2"
        />
      )}
      <div
        className={`max-w-[70%] ${
          isOwnMessage
            ? hasError
              ? 'bg-red-100 text-red-800 border border-red-200'
              : isPending || isUnconfirmed
              ? 'bg-blue-400 text-white'
              : 'bg-blue-500 text-white'
            : 'bg-gray-100'
        } rounded-lg p-3 relative`}
      >
        {!isOwnMessage && (
          <div className="font-semibold text-sm mb-1">{message?.senderId?.username}</div>
        )}
        <div className="text-sm">{message.content}</div>
        <div className="flex items-center text-xs opacity-70 mt-1">
          <span>
            {(() => {
              try {
                return message.timestamp 
                  ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
                  : 'Just now';
              } catch (error) {
                console.error('Error formatting date:', error, message);
                return 'Just now';
              }
            })()}
          </span>
          
          {/* Status indicator for own messages */}
          {isOwnMessage && (
            <Tooltip title={statusIndicator.text}>
              <span className={`ml-2 ${statusIndicator.color} flex items-center`}>
                {statusIndicator.icon}
              </span>
            </Tooltip>
          )}
        </div>
        
        {/* Reactions */}
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(groupedReactions).map(([reaction, data]) => (
            <Reaction
              key={reaction}
              reaction={reaction}
              count={data.count}
              users={data.users}
              currentUser={currentUser}
              onReactionClick={() => {
                const userReaction = (message.reactions || []).find(
                  r => r.userId._id === currentUser?._id && r.reaction === reaction
                );
                if (userReaction) {
                  onReactionRemove(userReaction._id);
                } else {
                  onReactionAdd(message._id, reaction);
                }
              }}
            />
          ))}
        </div>

        {/* Reaction Picker */}
        <div className="mt-2">
          <ReactionPicker
            onSelect={(reaction) => onReactionAdd(message._id, reaction)}
          />
        </div>
      </div>
      {isOwnMessage && (
        <Avatar
          src={message?.senderId?.username}
          icon={<UserOutlined />}
          className="ml-2"
        />
      )}
    </div>
  );
};

export default Message; 