import React, { useState, useContext, useEffect } from 'react';
import { Form, Input, Button, Card, message, Avatar, Spin, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const Profile: React.FC = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const router = useRouter();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
    }
    
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email
      });
    }
  }, [user, authLoading, router, profileForm]);

  const handleUpdateProfile = async (values: { username: string; email: string }) => {
    setUpdatingProfile(true);
    try {
      await api.put('/users/me', values);
      message.success('Profile updated successfully');
      // We need to reload the page or revalidate the user context
      window.location.reload();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setUpdatingPassword(true);
    try {
      await api.put('/users/password', values);
      message.success('Password updated successfully');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <Avatar size={80} icon={<UserOutlined />}>
          {user.username.charAt(0).toUpperCase()}
        </Avatar>
        <h1 className="mt-4 text-2xl font-bold">{user.username}</h1>
        <p className="text-gray-500">{user.email}</p>
      </div>

      <Card title="Update Profile" className="mb-8">
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={updatingProfile}
              block
            >
              Update Profile
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Change Password">
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleUpdatePassword}
        >
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter your new password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={updatingPassword}
              block
            >
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile; 