import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'DOCTOR' | 'PATIENT';
  }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await authApi.getMe();
      setUser(data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem('accessToken', result.accessToken);
    setUser(result.user);
    toast.success(`Welcome back, ${result.user.firstName}!`);
  };

  const register = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'DOCTOR' | 'PATIENT';
  }) => {
    const result = await authApi.register(payload);
    localStorage.setItem('accessToken', result.accessToken);
    setUser(result.user);
    toast.success('Account created successfully!');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
