import React from 'react';
import { useContext } from 'react';
import { Layout as AntLayout, Button, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AuthContext } from '../context/AuthContext';

const { Header, Content, Footer } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => router.push('/profile'),
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout className="min-h-screen">
      <Header className="flex items-center justify-between">
        <div className="text-white text-xl font-bold">
          <Link href="/">Chat App</Link>
        </div>
        <div>
          {user ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div className="flex items-center space-x-2 cursor-pointer">
                <span className="text-white">Hi, {user.username}</span>
                <Button 
                  type="text" 
                  icon={<UserOutlined />} 
                  className="text-white" 
                />
              </div>
            </Dropdown>
          ) : (
            <div className="space-x-2">
              <Button onClick={() => router.push('/login')}>Login</Button>
              <Button onClick={() => router.push('/register')}>Register</Button>
            </div>
          )}
        </div>
      </Header>
      <Content className="p-6">
        <div className="bg-white p-6 rounded shadow">
          {children}
        </div>
      </Content>
      <Footer className="text-center">Chat App ©{new Date().getFullYear()}</Footer>
    </AntLayout>
  );
};

export default Layout; 