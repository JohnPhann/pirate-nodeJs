import React, { useEffect, useState, useContext } from 'react';
import { List, Card, Typography, Button, Modal, Form, Input, Spin, Switch, Select, message, Space, Avatar, Tag, Badge, Tooltip } from 'antd';
import { PlusOutlined, UserOutlined, TeamOutlined, MessageOutlined, ClockCircleOutlined, StarOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { Room, User } from '../types';

const { Title, Text } = Typography;

const Home: React.FC = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isGroup, setIsGroup] = useState(true);
  const [form] = Form.useForm();
  const router = useRouter();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }

    const fetchRooms = async () => {
      try {
        const res = await api.get('/rooms');
        setRooms(res.data);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchInitialUsers = async () => {
      try {
        setSearchingUsers(true);
        // Fetch initial list of users for the dropdown
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setSearchingUsers(false);
      }
    };

    if (user) {
      fetchRooms();
      fetchInitialUsers();
    }
  }, [user, authLoading, router]);

  const fetchUsers = async (query: string) => {
    if (!query) return;
    
    setSearchingUsers(true);
    try {
      const res = await api.get(`/users/search?q=${query}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleCreateRoom = async (values: { name: string; isGroup: boolean; memberIds: string | string[] }) => {
    try {
      console.log('Creating room with initial values:', values);

      console.log(values.memberIds);
      
      // Convert memberIds to array and filter out null/undefined values
      const memberIdsArray = Array.isArray(values.memberIds) 
        ? values.memberIds.filter(id => id && id.trim() !== '')
        : [values.memberIds].filter(id => id && id.trim() !== '');

      // Validate memberIds
      if (memberIdsArray.length === 0) {
        message.error('Please select at least one member');
        return;
      }

      // For direct chat, ensure only one member is selected
      if (!values.isGroup && memberIdsArray.length > 1) {
        message.error('Direct chat can only have one member');
        return;
      }

      // For direct chat, use the selected user's name as the room name if not provided
      if (!values.isGroup && !values.name) {
        const selectedUser = users.find(u => u._id === memberIdsArray[0]);
        if (selectedUser) {
          values.name = `${user?.username} and ${selectedUser.username}`;
        }
      }

      // Ensure the current user is included in the members list
      if (user && !memberIdsArray.includes(user._id)) {
        memberIdsArray.push(user._id);
      }

    
      console.log('Filtered Member IDs:', memberIdsArray);
      const roomData = {
        name: values.name,
        isGroup: values.isGroup,
        memberIds: memberIdsArray
      };

      console.log('Sending room creation request with:', roomData);
      const res = await api.post('/rooms', roomData);
      console.log('Room created successfully:', res.data);
      
      setRooms(prev => [...prev, res.data]);
      setIsModalVisible(false);
      form.resetFields();
      // Navigate to the new room
      router.push(`/rooms/${res.data._id}`);
    } catch (err: any) {
      console.error('Error creating room:', err);
      message.error(err.response?.data?.error || 'Failed to create room. Please check your inputs.');
    }
  };

  const handleIsGroupChange = (checked: boolean) => {
    console.log('Group chat mode changed:', checked);
    setIsGroup(checked);
    // Reset member selection when switching between group and direct chat
    form.setFieldsValue({ memberIds: [] });
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <Title level={1} className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to ChatHub
        </Title>
        <Text type="secondary" className="text-lg">
          Connect, collaborate, and communicate with your team
        </Text>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Title level={2} className="mb-1">Your Chat Rooms</Title>
            <Text type="secondary">Manage your conversations and create new ones</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
            size="large"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
          >
            Create Room
          </Button>
        </div>

        <List
          grid={{ 
            gutter: 24, 
            xs: 1, 
            sm: 2, 
            md: 3, 
            lg: 4 
          }}
          dataSource={rooms}
          renderItem={(room) => (
            <List.Item>
              <Card 
                hoverable
                className="h-56 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                onClick={() => router.push(`/rooms/${room._id}`)}
                cover={
                  <div className="h-24 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-center">
                    <Avatar 
                      size={64}
                      icon={room.isGroup ? <TeamOutlined /> : <UserOutlined />}
                      className={room.isGroup ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}
                    />
                  </div>
                }
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <Title level={4} className="mb-0 line-clamp-1">{room.name}</Title>
                    <Space>
                      {room.owner === user?._id && (
                        <Tooltip title="You own this room">
                          <Badge dot color="blue" />
                        </Tooltip>
                      )}
                      {!room.isGroup && (
                        <Tooltip title="Direct Message">
                          <LockOutlined className="text-gray-400" />
                        </Tooltip>
                      )}
                    </Space>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <MessageOutlined className="text-gray-400" />
                    <Text type="secondary" className="text-sm">
                      {(room.members?.length || 0)} participants
                    </Text>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-gray-400" />
                        <Text type="secondary" className="text-xs">
                          {new Date(room.createdAt).toLocaleDateString()}
                        </Text>
                      </div>
                      {room.owner === user?._id && (
                        <Tag color="blue" className="m-0">Your Room</Tag>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <PlusOutlined className="text-white" />
            </div>
            <span className="text-lg font-medium">Create New Room</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
        centered
        className="rounded-lg"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRoom}
          initialValues={{ isGroup: true }}
          className="mt-6"
        >
          <Form.Item
            name="name"
            label="Room Name"
            rules={[{ required: isGroup, message: 'Please enter a room name' }]}
          >
            <Input 
              placeholder={isGroup ? "Enter room name" : "Leave empty to use participants' names"} 
              size="large"
              className="rounded-lg"
              prefix={<MessageOutlined className="text-gray-400" />}
            />
          </Form.Item>
          
          <Form.Item
            name="isGroup"
            label="Chat Type"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren={<TeamOutlined />} 
              unCheckedChildren={<UserOutlined />} 
              onChange={handleIsGroupChange}
              className="bg-gray-300"
            />
          </Form.Item>
          
          <Form.Item
            name="memberIds"
            label={isGroup ? "Members" : "Select a person to chat with"}
            rules={[{ required: true, message: isGroup ? 'Please select at least one member' : 'Please select a person to chat with' }]}
          >
            <Select
              mode={isGroup ? "multiple" : undefined}
              placeholder={isGroup ? "Search and select members" : "Search and select a person"}
              notFoundContent={searchingUsers ? <Spin size="small" /> : null}
              filterOption={false}
              onSearch={fetchUsers}
              loading={searchingUsers}
              showSearch
              size="large"
              className="rounded-lg"
              optionLabelProp="label"
              dropdownStyle={{ borderRadius: '8px' }}
            >
              {users.map(user => (
                <Select.Option 
                  key={user._id} 
                  value={user._id}
                  label={user.username}
                >
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <div>{user.username}</div>
                      <Text type="secondary" className="text-xs">{user.email}</Text>
                    </div>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button 
                onClick={() => setIsModalVisible(false)}
                size="large"
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 rounded-lg"
              >
                Create Room
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Home;
