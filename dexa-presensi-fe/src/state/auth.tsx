import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { configureTimezone } from '../lib/date';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const expire = () => {
      sessionStorage.removeItem('dexa_token');
      sessionStorage.setItem(
        'dexa_session_message',
        'Your session has expired. Please sign in again.',
      );
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener('dexa:session-expired', expire);
    return () => window.removeEventListener('dexa:session-expired', expire);
  }, [queryClient]);
  useEffect(() => {
    let active = true;
    const initialToken = sessionStorage.getItem('dexa_token');
    if (!initialToken) {
      setLoading(false);
      return;
    }
    api
      .get<User>('/auth/me')
      .then(({ data }) => {
        configureTimezone(data.timezone);
        if (active && sessionStorage.getItem('dexa_token') === initialToken) setUser(data);
      })
      .catch(() => {
        if (sessionStorage.getItem('dexa_token') === initialToken)
          sessionStorage.removeItem('dexa_token');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function login(email: string, password: string) {
    const { data } = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    queryClient.clear();
    configureTimezone(data.user.timezone);
    sessionStorage.removeItem('dexa_session_message');
    sessionStorage.setItem('dexa_token', data.accessToken);
    setUser(data.user);
    return data.user;
  }
  function logout() {
    sessionStorage.removeItem('dexa_token');
    queryClient.clear();
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
