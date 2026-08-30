import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('healthnet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('healthnet_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userData = await authAPI.getMe();
          setUser(userData);
          localStorage.setItem('healthnet_user', JSON.stringify(userData));
        } catch (e) {
          console.warn('Backend check offline or starting, retaining cached session if available');
          const saved = localStorage.getItem('healthnet_user');
          if (saved) {
            setUser(JSON.parse(saved));
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await authAPI.login(email, pass);
      setToken(data.access_token);
      localStorage.setItem('healthnet_token', data.access_token);

      const userData: User = {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role as UserRole,
        hospital_id: data.hospital_id,
        hospital_name: data.hospital_name,
        is_active: true
      };
      setUser(userData);
      localStorage.setItem('healthnet_user', JSON.stringify(userData));
    } catch (e) {
      console.error('Authentication failed:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (role: UserRole) => {
    setIsLoading(true);
    const mockNames: Record<UserRole, string> = {
      ADMIN: 'Dr. Arthur Vance (Network Admin)',
      DOCTOR: 'Dr. Sarah Jenkins (Cardiology Lead)',
      NURSE: 'Nurse Elena Rostova (Charge Nurse)'
    };
    const mockUserData: User = {
      id: role === 'ADMIN' ? 1 : role === 'DOCTOR' ? 2 : 3,
      email: `${role.toLowerCase()}@healthnet.demo`,
      full_name: mockNames[role],
      role: role,
      hospital_id: 1,
      hospital_name: 'CityCare Central Hospital',
      is_active: true
    };

    try {
      const data = await authAPI.demoLogin(role);
      setToken(data.access_token);
      localStorage.setItem('healthnet_token', data.access_token);

      const userData: User = {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role as UserRole,
        hospital_id: data.hospital_id,
        hospital_name: data.hospital_name,
        is_active: true
      };
      setUser(userData);
      localStorage.setItem('healthnet_user', JSON.stringify(userData));
    } catch (e) {
      // Direct instant fallback
      const mockToken = `demo_token_${role.toLowerCase()}`;
      setToken(mockToken);
      localStorage.setItem('healthnet_token', mockToken);
      setUser(mockUserData);
      localStorage.setItem('healthnet_user', JSON.stringify(mockUserData));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('healthnet_token');
    localStorage.removeItem('healthnet_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      demoLogin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
