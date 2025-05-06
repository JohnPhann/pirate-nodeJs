import React, { useState, useContext, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const { login, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success('Login successful!');
      router.push('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Title level={1} className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </Title>
          <Text type="secondary" className="text-lg">
            Sign in to continue to ChatHub
          </Text>
        </div>

        <Card
          title="Login"
          className="w-full max-w-md"
          styles={{
            body: { padding: '32px' }
          }}
        >
          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email address' }
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
              label="Password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Enter your password"
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
                Sign In
              </Button>
            </Form.Item>

            <div className="text-center mb-6">
              <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>

            <Divider className="text-gray-400">Or continue with</Divider>

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
                Don't have an account?{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign up
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login; 