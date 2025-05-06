import React, { useState, useContext, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Divider, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, InfoCircleOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const { register, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const onFinish = async (values: { username: string; email: string; password: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      await register(values);
      message.success('Registration successful!');
      router.push('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Title level={1} className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </Title>
          <Text type="secondary" className="text-lg">
            Join ChatHub and start connecting
          </Text>
        </div>

        <Card
          title="Register"
          className="w-full max-w-md"
          styles={{
            body: { padding: '32px' }
          }}
        >
          <Form
            name="register"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              label={
                <Space>
                  <span>Username</span>
                  <Tooltip title="Choose a unique username that others can identify you with">
                    <InfoCircleOutlined className="text-gray-400" />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: 'Please input your username!' }]}
            >
              <Input 
                prefix={<UserOutlined className="text-gray-400" />} 
                placeholder="Choose a username"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input 
                prefix={<MailOutlined className="text-gray-400" />} 
                placeholder="Enter your email"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={
                <Space>
                  <span>Password</span>
                  <Tooltip title="Password must be at least 6 characters long">
                    <InfoCircleOutlined className="text-gray-400" />
                  </Tooltip>
                </Space>
              }
              rules={[
                { required: true, message: 'Please input your password!' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Create a password"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Confirm your password"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                block
                className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 rounded-lg"
              >
                Create Account
              </Button>
            </Form.Item>

            <Divider className="text-gray-400">Or sign up with</Divider>

            <Space direction="vertical" size="middle" className="w-full">
              <Button 
                icon={<GoogleOutlined />} 
                block
                size="large"
                className="h-12 rounded-lg flex items-center justify-center gap-2"
              >
                Continue with Google
              </Button>
              <Button 
                icon={<GithubOutlined />} 
                block
                size="large"
                className="h-12 rounded-lg flex items-center justify-center gap-2"
              >
                Continue with GitHub
              </Button>
            </Space>

            <div className="text-center mt-6">
              <Text type="secondary">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Register;

 