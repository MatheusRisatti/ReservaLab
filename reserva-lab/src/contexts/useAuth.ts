import { createContext, useContext } from 'react';
import type { User, UserStatus } from '../types';

export interface AuthContextData {
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

export const AuthContext = createContext<AuthContextData | null>(null);

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
