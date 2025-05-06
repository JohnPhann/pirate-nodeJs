import React from 'react';
import { Badge, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { User } from '../types';

interface ReactionProps {
  reaction: string;
  count: number;
  users: User[];
  currentUser: User | null;
  onReactionClick: () => void;
}

const Reaction: React.FC<ReactionProps> = ({
  reaction,
  count,
  users,
  currentUser,
  onReactionClick,
}) => {
  const hasReacted = users.some(user => user._id === currentUser?._id);

  return (
    <Tooltip
      title={
        <div className="flex flex-col space-y-1">
          {users.map(user => (
            <div key={user._id} className="flex items-center space-x-2">
              <UserOutlined className="text-gray-500" />
              <span className="text-sm">{user.username}</span>
            </div>
          ))}
        </div>
      }
      placement="top"
      arrow={true}
    >
      <Badge
        count={count}
        className={`cursor-pointer px-2 py-1 rounded-full transition-all duration-200 ${
          hasReacted
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        onClick={onReactionClick}
      >
        <span className="text-lg">{reaction}</span>
      </Badge>
    </Tooltip>
  );
};

export default Reaction; 