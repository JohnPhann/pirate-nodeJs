import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Typography, Result, Button, List, Avatar, message, Modal, Tabs, Space, Input, Spin } from 'antd';
import { UserOutlined, DeleteOutlined, SettingOutlined, PlusOutlined, SearchOutlined, ExclamationCircleOutlined, CrownOutlined } from '@ant-design/icons';
import ChatWindow from '../../components/ChatWindow';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import { initSocket } from '../../utils/socket';
import { handleError } from '../../utils/errorHandler';
import { showSuccess, showError, showWarning, showInfo } from '../../utils/messageHandler';
import type { Socket } from 'socket.io-client';
import { Reaction } from '../../types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

interface RoomMember {
  _id: string;
  username: string;
}

interface Room {
  _id: string;
  name: string;
  isGroup: boolean;
  members: RoomMember[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  joinedRooms?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface ErrorResponse {
  message: string;
  status?: number;
  code?: string;
}

interface Message {
  _id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

const RoomPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useContext(AuthContext);
  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string; timestamp: number }[]>([]);
  const [roomJoined, setRoomJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Validate MongoDB ID format
  const isValidMongoId = (id: string) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Fetch room details
  const fetchRoom = async () => {
    if (!id || Array.isArray(id)) return;
    
    try {
      setLoadingRoom(true);
      const response = await api.get(`/rooms/${id}`);
      setRoom(response.data);
    } catch (error) {
      console.error('Error fetching room:', error);
      message.error('Failed to load room details');
    } finally {
      setLoadingRoom(false);
    }
  };

  // Fetch initial list of users
  const fetchInitialUsers = async () => {
    try {
      setSearching(true);
      const res = await api.get('/users');
      console.log('All users fetched:', res.data);
      
      // Filter out users who are already in the room
      const filteredUsers = res.data.filter((u: User) => 
        !room?.members.some(member => member._id === u._id)
      );
      console.log('Filtered users (excluding room members):', filteredUsers);
      setUsers(filteredUsers);
    } catch (error: any) {
      handleError(error, 'fetching users');
    } finally {
      setSearching(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    fetchRoom();
  }, [id]);

  // Fetch users when modal opens
  useEffect(() => {
    if (isMembersModalVisible) {
      fetchInitialUsers();
    }
  }, [isMembersModalVisible]);

  useEffect(() => {
    const setupSocket = async () => {
      try {
        console.log('Initializing socket connection for room page...');
        
        // Initialize or get existing socket
        const socket = await initSocket();
        if (!socket) {
          console.error('Failed to initialize socket');
          return;
        }
  
        console.log('Socket initialized:', {
          connected: socket.connected,
          id: socket.id
        });
  
        setSocket(socket);
  
        // Kiểm tra xem socket đã kết nối và chưa tham gia phòng hay chưa
        if (socket.connected && !roomJoined) {
          joinRoom(socket);
        }
  
        // Lắng nghe sự kiện 'connect' chỉ một lần khi socket kết nối
        socket.once('connect', () => {
          console.log('Socket connected, checking room join status:', id);
          if (!roomJoined) {
            joinRoom(socket);
          }
        });
  
       if (!roomJoined) { // Lắng nghe sự kiện 'room_joined' chỉ một lần
        socket.once('room_joined', (data) => {
          console.log('Successfully joined room:', data);
          setRoomJoined(true); // Đảm bảo chỉ đánh dấu là đã tham gia khi thành công
        });
      }
        socket.on('room_join_error', (error) => {
          console.error('Failed to join room:', error);
          message.error('Failed to join room');
          setRoomJoined(false); // Reset nếu có lỗi
        });
  
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          message.error('Connection error');
        });
  
        socket.on('disconnect', () => {
          console.log('Socket disconnected, resetting room join status');
          setRoomJoined(false); // Reset room join status khi socket ngắt kết nối
        });
  
        socket.on('user_typing', (data: { userId: string; roomId: string; username: string; isTyping: boolean }) => {
          if (data.roomId === id && data.userId !== user?._id) {
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
          }
        });
  
        socket.on('user_joined', (data: { userId: string; roomId: string; username: string }) => {
          if (data.roomId === id) {
            showInfo({ content: `${data.username} joined the room` });
            fetchRoom();
          }
        });
  
        socket.on('user_left', (data: { userId: string; roomId: string; username: string }) => {
          if (data.roomId === id) {
            showInfo({ content: `${data.username} left the room` });
            fetchRoom();
          }
        });
      } catch (error) {
        console.error('Error setting up socket:', error);
        message.error('Failed to setup socket connection');
      }
    };
  
    // Helper function to join room
    const joinRoom = (socketInstance: Socket) => {
      if (!socketInstance || !id || Array.isArray(id) || !user) return;
      
      console.log('Joining room:', {
        roomId: id,
        userId: user._id,
        username: user.username
      });
  
      socketInstance.emit('join_room', { 
        roomId: id,
        userId: user._id,
        username: user.username
      });
    };
  
    if (user && id && !Array.isArray(id) && !roomJoined) {
      setupSocket();
    }
  
    return () => {
      if (socket && id && !Array.isArray(id) && user) {
        console.log('Leaving room:', id);
        
        socket.emit('leave_room', { 
          roomId: id,
          userId: user._id,
          username: user.username
        });
        
        // Tắt tất cả các sự kiện đã đăng ký
        socket.off('room_joined');
        socket.off('room_join_error');
        socket.off('error');
        socket.off('user_typing');
        socket.off('user_joined');
        socket.off('user_left');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        
        // Reset room join status khi unmount
        setRoomJoined(false);
      }
    };
  }, [id, user , roomJoined]);

  // Handle typing state
  const handleTyping = (isTyping: boolean) => {
    if (!socket || !id || Array.isArray(id)) return;
    
    console.log('Sending typing event:', {
      roomId: id,
      isTyping,
      userId: user?._id,
      username: user?.username
    }); // Debug log
    
    socket.emit('typing', {
      roomId: id,
      isTyping,
      userId: user?._id,
      username: user?.username
    });
  };

  // Simple function to remove user
  const removeUser = async (member: RoomMember) => {
    if (!id || Array.isArray(id)) {
      showError({ content: 'Invalid room ID' });
      return;
    }

    if (!isValidMongoId(member._id)) {
      showError({ content: 'Invalid user ID format' });
      return;
    }

    try {
      setRemoving(prev => ({ ...prev, [member._id]: true }));
      
      // Log request details for debugging
      console.log('Removing user:', {
        roomId: id,
        userId: member._id,
        username: member.username
      });

      const response = await api.delete(`/rooms/${id}/participants/${member._id}`, {
        data: { userId: member._id }
      });

      // Log successful response
      console.log('User removed successfully:', response.data);
      
      // Update room state by removing the user
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.filter(m => m._id !== member._id)
        };
      });

      showSuccess({ 
        content: `${member.username} has been removed from the room`,
        duration: 2,
      });
    } catch (error: any) {
      console.error('Error removing user:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        showError({ content: 'User or room not found' });
      } else if (error.response?.status === 403) {
        showError({ content: 'You do not have permission to remove this user' });
      } else {
        handleError(error, 'removing user');
      }
    } finally {
      setRemoving(prev => ({ ...prev, [member._id]: false }));
    }
  };

  // Search users with debounce
  const searchUsers = async (value: string) => {
    if (!value.trim()) {
      fetchInitialUsers();
      return;
    }
    
    setSearching(true);
    try {
      const res = await api.get(`/users/search?query=${value}`);
      const filteredUsers = res.data.filter((u: User) => 
        !room?.members.some(member => member._id === u._id)
      );
      setUsers(filteredUsers);
    } catch (error: any) {
      showError({ content: 'Failed to search users' });
      handleError(error, 'searching users');
    } finally {
      setSearching(false);
    }
  };

  // Add user to room
  const addUser = async (userId: string, userToAdd: User) => {
    if (!id || Array.isArray(id)) {
      showError({ content: 'Invalid room ID' });
      return;
    }

    if (!isValidMongoId(userId)) {
      showError({ content: 'Invalid user ID format' });
      return;
    }

    try {
      setAdding(prev => ({ ...prev, [userId]: true }));
      
      const response = await api.post(`rooms/${id}/participants`, { 
        userId: userId
      });
      
      // Update room state by adding the new user
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          members: [...prev.members, {
            _id: userToAdd._id,
            username: userToAdd.username
          }]
        };
      });

      // Update users list by removing the added user
      setUsers(prev => prev.filter(user => user._id !== userId));

      showSuccess({ 
        content: `${userToAdd.username} has been added to the room`,
        duration: 2,
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      
      if (error.response?.status === 404) {
        showError({ content: 'User or room not found' });
      } else if (error.response?.status === 403) {
        showError({ content: 'You do not have permission to add users' });
      } else if (error.response?.status === 409) {
        showError({ content: 'User is already in the room' });
      } else {
        handleError(error, 'adding user');
      }
    } finally {
      setAdding(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteRoom = async () => {
    if (!id || Array.isArray(id)) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/rooms/${id}`);
      message.success('Room deleted successfully');
      router.push('/');
    } catch (error) {
      console.error('Error deleting room:', error);
      message.error('Failed to delete room');
    } finally {
      setIsDeleting(false);
    }
  };

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: 'Delete Room',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to delete this room? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: handleDeleteRoom,
      maskClosable: true,
      centered: true,
      styles: {
        mask: { backdropFilter: 'blur(4px)' }
      }
    });
  };

  // Fetch reactions for all messages
  const fetchReactionsForMessages = async (messages: Message[]) => {
    const reactionsMap: { [messageId: string]: Reaction[] } = {};
    await Promise.all(messages.map(async (msg) => {
      try {
        const res = await api.get(`/reactions/messages/${msg._id}/reactions`);
        reactionsMap[msg._id] = res.data;
      } catch {
        reactionsMap[msg._id] = [];
      }
    }));
    // setReactions(reactionsMap);
  };

 

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (messages.length > 0) {
      fetchReactionsForMessages(messages);
    }
  }, [messages]);

  // Add reaction to a message
  const handleAddReaction = async (messageId: string, reaction: string) => {
    try {
      const response = await api.post(`/reactions/messages/${messageId}/reactions`, { reaction });
      if (response.data) {
        const newObj = { ...response.data, roomId: room?._id };
        socket?.emit('reaction_added', newObj);
      }
      showSuccess({ 
        content: `Reaction added successfully`,
        duration: 2,
      });
    } catch (error) {
      showError({ 
        content: `Failed to add reaction`,
        duration: 2,
      });
    }
  };

  // Remove reaction from a message
  const handleRemoveReaction = async (reactionId: string, messageId: string) => {
    try {
      const response = await api.delete(`/reactions/messages/${messageId}/reactions/${reactionId}`);
      if (response.data) {
        const newObj = { ...response.data, roomId: room?._id };
        socket?.emit('reaction_removed', newObj);
      }
      showSuccess({ 
        content: `Reaction removed successfully`,
        duration: 2,
      });
    } catch (error) {
      showError({ 
        content: `Failed to remove reaction`,
        duration: 2,
      });
    }
  };

  if (loading || loadingRoom) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Result
        status="403"
        title="Not Logged In"
        subTitle="Sorry, you need to be logged in to view this chat room."
        extra={
          <Button type="primary" onClick={() => router.push('/login')}>
            Login Now
          </Button>
        }
      />
    );
  }

  if (!id || Array.isArray(id)) {
    return (
      <Result
        status="404"
        title="Room Not Found"
        subTitle="Sorry, the chat room you visited does not exist."
        extra={
          <Button type="primary" onClick={() => router.push('/')}>
            Back Home
          </Button>
        }
      />
    );
  }

  if (!room) {
    return (
      <Result
        status="404"
        title="Room Not Found"
        subTitle="Sorry, the chat room you visited does not exist."
        extra={
          <Button type="primary" onClick={() => router.push('/')}>
            Back Home
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm backdrop-blur-sm bg-opacity-80">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="relative">
              <Avatar 
                size="large" 
                icon={<UserOutlined />}
                className="bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg"
              >
                {room?.name?.charAt(0).toUpperCase()}
              </Avatar>
              {room?.owner === user._id && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
                  <CrownOutlined className="text-white text-xs" />
                </div>
              )}
            </div>
            <div className="ml-3">
              <Title level={4} className="mb-0 text-gray-800 font-semibold">
                {room?.name || 'Loading...'}
              </Title>
              <Typography.Text type="secondary" className="text-sm flex items-center space-x-2">
                <span>{room?.isGroup ? `${room.members.length} members` : 'Direct message'}</span>
                {room?.isGroup && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    Group Chat
                  </span>
                )}
              </Typography.Text>
            </div>
          </div>
          {room?.owner === user._id && (
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={showDeleteConfirm}
              loading={isDeleting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              Delete Room
            </Button>
          )}
        </div>
        <Space>
          {room?.isGroup && (
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setIsMembersModalVisible(true)}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              Room Settings
            </Button>
          )}
        </Space>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white bg-opacity-80 backdrop-blur-sm">
            <Typography.Text type="secondary" className="text-sm flex items-center space-x-2">
              <span>Room ID:</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded-md">{id}</span>
            </Typography.Text>
          </div>
          <div className="flex-1">
            <ChatWindow 
              roomId={id as string}
              onReactionAdd={handleAddReaction}
              onReactionRemove={handleRemoveReaction}
              onTyping={handleTyping}
            />
          </div>
        </div>
      </div>

      {/* Members Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <SettingOutlined className="text-blue-500 text-xl" />
            <span className="font-semibold">Room Settings</span>
          </div>
        }
        open={isMembersModalVisible}
        onCancel={() => setIsMembersModalVisible(false)}
        width={600}
        footer={null}
        className="rounded-lg"
        styles={{
          mask: { backdropFilter: 'blur(8px)' }
        }}
      >
        <Tabs defaultActiveKey="1" onChange={() => {}}>
          <TabPane tab="Members" key="1">
            <List
              size="large"
              dataSource={room?.members}
              renderItem={member => (
                <List.Item
                  className="hover:bg-gray-50 rounded-lg transition-all duration-200"
                  actions={[
                    member._id !== user._id && room?.isGroup && (
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => removeUser(member)}
                        loading={removing[member._id]}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      />
                    )
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="relative">
                        <Avatar 
                          size="large" 
                          icon={<UserOutlined />}
                          className="bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md"
                        >
                          {member.username.charAt(0).toUpperCase()}
                        </Avatar>
                        {member._id === room?.owner && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
                            <CrownOutlined className="text-white text-xs" />
                          </div>
                        )}
                      </div>
                    }
                    title={
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{member.username}</span>
                        {member._id === user._id && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                    }
                    description={
                      <Typography.Text type="secondary" className="text-sm">
                        {member._id === room?.owner ? 'Room Owner' : 'Member'}
                      </Typography.Text>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>
          {room?.isGroup && (
            <TabPane tab="Add Members" key="2">
              <div className="mb-6">
                <Search
                  placeholder="Search users by username or email"
                  onSearch={searchUsers}
                  onChange={e => setSearchTerm(e.target.value)}
                  loading={searching}
                  enterButton
                  allowClear
                  className="rounded-lg"
                />
              </div>
              <List
                size="large"
                loading={searching}
                dataSource={users}
                renderItem={user => (
                  <List.Item
                    className="hover:bg-gray-50 rounded-lg transition-all duration-200"
                    actions={[
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => addUser(user._id, user)}
                        loading={adding[user._id]}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 rounded-lg"
                      >
                        Add
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="large" 
                          icon={<UserOutlined />}
                          className="bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md"
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                      title={
                        <span className="font-medium">{user.username}</span>
                      }
                      description={
                        <Typography.Text type="secondary" className="text-sm">
                          {user.email}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </TabPane>
          )}
          {room?.owner === user?._id && (
            <TabPane tab="Danger Zone" key="3">
              <div className="p-6 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center space-x-2 mb-4">
                  <ExclamationCircleOutlined className="text-red-500 text-xl" />
                  <Title level={4} className="mb-0 text-red-600">
                    Danger Zone
                  </Title>
                </div>
                <Typography.Text type="secondary" className="block mb-6">
                  Once you delete a room, there is no going back. Please be certain.
                </Typography.Text>
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={showDeleteConfirm}
                  loading={isDeleting}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0 rounded-lg"
                >
                  Delete Room
                </Button>
              </div>
            </TabPane>
          )}
        </Tabs>
      </Modal>
    </div>
  );
};

export default RoomPage; 