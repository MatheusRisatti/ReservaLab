import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserStatus } from '../types';
import { api } from '../services/api';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userStatus: UserStatus;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUserStatus: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('@ReservaLab:user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('@ReservaLab:token');
  });

  const [loading, setLoading] = useState<boolean>(true);

  const refreshUserStatus = async () => {
    if (!token) return;
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
      localStorage.setItem('@ReservaLab:user', JSON.stringify(response.data.user));
    } catch {
      // Ignora erro se rota não existir ainda
    }
  };

  useEffect(() => {
    if (token) {
      refreshUserStatus().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('@ReservaLab:token', newToken);
    localStorage.setItem('@ReservaLab:user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('@ReservaLab:token');
    localStorage.removeItem('@ReservaLab:user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';
  const userStatus: UserStatus = user?.status || 'LIBERADO';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        userStatus,
        login,
        logout,
        refreshUserStatus,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
