import { useCallback, useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { User, UserStatus } from '../types';
import { api } from '../services/api';
import { AuthContext } from './useAuth';

const STATUS_MAP: Record<string, UserStatus> = {
  AVAILABLE: 'LIBERADO',
  BLOCKED: 'BLOQUEADO',
  LIMIT_REACHED: 'LIMITE_ATINGIDO',
};

async function fetchCurrentUser(): Promise<User> {
  const response = await api.get('/api/auth/me');
  return {
    ...response.data.user,
    status: STATUS_MAP[response.data.status] ?? 'LIBERADO',
  };
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('@ReservaLab:user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('@ReservaLab:token');
  });

  const [loading, setLoading] = useState<boolean>(() => !!localStorage.getItem('@ReservaLab:token'));

  const storeUser = useCallback((refreshedUser: User) => {
    setUser(refreshedUser);
    localStorage.setItem('@ReservaLab:user', JSON.stringify(refreshedUser));
  }, []);

  const refreshUserStatus = useCallback(async () => {
    if (!token) return;
    try {
      storeUser(await fetchCurrentUser());
    } catch {
      // Falha de rede ou 5xx: mantém a sessão. O 401 chega pelo evento 'auth:unauthorized'.
    }
  }, [token, storeUser]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchCurrentUser()
      .then((currentUser) => {
        if (active) storeUser(currentUser);
      })
      .catch(() => {
        // Mantém a sessão em falhas de rede ou 5xx; o 401 chega pelo evento 'auth:unauthorized'.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, storeUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

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
