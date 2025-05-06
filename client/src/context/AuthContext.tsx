import { createContext, ReactNode, useState, useEffect } from 'react';
import api from '../utils/api';
import { User } from '../types';


interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (creds: { email: string; password: string }) => Promise<void>;
  register: (info: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await api.get('/users/me');
          setUser(res.data);
        }
      } catch (err) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  const login = async (creds: { email: string; password: string }) => {
    try {
      // Clear any existing token
      localStorage.removeItem('token');
      // Perform login
      const res = await api.post('/auth/login', creds);
      
      // Save the new token and user data
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      
      // Log the user info for debugging
      console.log('Logged in as:', res.data.user);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const register = async (info: { username: string; email: string; password: string }) => {
    try {
      // Clear any existing token
      localStorage.removeItem('token');
      // Perform registration
      const res = await api.post('/auth/register', info);
      
      // Save the new token and user data
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
    } catch (err) {
      console.error('Registration error:', err);
      throw err;
    }
  };
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 