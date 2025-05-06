import React, { useState, useEffect } from 'react';
import { Input, List, Avatar, Button, message, Spin } from 'antd';
import { UserOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { User } from '../types';
import api from '../utils/api';

interface UserSearchProps {
  roomId: string;
  onUserAdded?: () => void;
  currentParticipants?: User[];
}

interface AddUserToRoomPayload {
  userId: string;
}

interface RoomResponse {
  _id: string;
  name: string;
  isGroup: boolean;
  members: Array<{
    _id: string;
    username: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const UserSearch: React.FC<UserSearchProps> = ({ 
  roomId, 
  onUserAdded,
  currentParticipants = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [initialLoading, setInitialLoading] = useState(true);

  // Filter out users who are already in the room
  const filterExistingParticipants = (users: User[]): User[] => {
    const participantIds = currentParticipants.map(p => p._id);
    return users.filter(user => !participantIds.includes(user._id));
  };

  // Fetch initial list of users
  const fetchInitialUsers = async () => {
    try {
      setInitialLoading(true);
      const res = await api.get('/users');
      const filteredUsers = filterExistingParticipants(res.data);
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      message.error('Failed to load users');
    } finally {
      setInitialLoading(false);
    }
  };

  // Fetch users when component mounts
  useEffect(() => {
    fetchInitialUsers();
  }, [roomId]);

  // Update filtered users when currentParticipants changes
  useEffect(() => {
    if (users.length > 0) {
      const filteredUsers = filterExistingParticipants(users);
      setUsers(filteredUsers);
    }
  }, [currentParticipants]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search term is empty, show all available users
      fetchInitialUsers();
      return;
    }
    
    setSearching(true);
    try {
      const res = await api.get(`/users/search?query=${searchTerm}`);
      // Filter out users who are already in the room
      const filteredUsers = filterExistingParticipants(res.data);
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Error searching users:', err);
      message.error('Failed to search for users');
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = async (userId: string) => {
    setAdding(prev => ({ ...prev, [userId]: true }));
    try {
      // Prepare the payload
      const payload: AddUserToRoomPayload = { userId };
      
      // Log the request details for debugging
      console.log('Adding user to room:', {
        roomId,
        userId,
        payload
      });
      
      // Make the API call with the correct endpoint
      const response = await api.post<RoomResponse>(`/rooms/${roomId}/participants`, payload);
      
      // Log successful response
      console.log('User added successfully:', response.data);
      
      // Handle success
      message.success('User added to room successfully');
      
      // Update UI
      setUsers(prev => prev.filter(user => user._id !== userId));
      
      // Call the callback if provided
      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Error adding user to room:', {
        error,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Handle specific error cases
      if (error.response) {
        const errorMessage = error.response.data.error;
        switch (errorMessage) {
          case 'Cannot add users to a personal chat':
            message.error('Cannot add users to a personal chat');
            break;
          case 'User is already in the room':
            message.error('This user is already in the room');
            break;
          case 'Not authorized to add users to this room':
            message.error('You are not authorized to add users to this room');
            break;
          case 'Room not found':
            message.error('Room not found');
            break;
          case 'User not found':
            message.error('User not found');
            break;
          default:
            message.error(errorMessage || 'Failed to add user to room');
        }
      } else if (error.request) {
        // The request was made but no response was received
        message.error('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        message.error('Error setting up the request: ' + error.message);
      }
    } finally {
      setAdding(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex mb-4">
        <Input
          placeholder="Search for users by username or email"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-grow"
          prefix={<SearchOutlined />}
        />
        <Button 
          type="primary" 
          onClick={handleSearch} 
          loading={searching}
          className="ml-2"
        >
          Search
        </Button>
      </div>

      {searching ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : users.length > 0 ? (
        <List
          className="max-h-80 overflow-auto"
          itemLayout="horizontal"
          dataSource={users}
          renderItem={user => (
            <List.Item
              actions={[
                <Button
                  key="add-user"
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => handleAddUser(user._id)}
                  loading={adding[user._id]}
                >
                  Add
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar icon={<UserOutlined />}>
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                }
                title={user.username}
                description={user.email}
              />
            </List.Item>
          )}
        />
      ) : searchTerm && !searching ? (
        <div className="text-center py-4 text-gray-500">
          {currentParticipants.length > 0 
            ? "No new users found matching your search"
            : "No users found matching your search"}
        </div>
      ) : null}
    </div>
  );
};

export default UserSearch; 