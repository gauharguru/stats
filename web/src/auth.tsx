import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';

export interface Me {
  userId: number;
  userName: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  sessionTimeoutMinutes: number;
  unreadNotifications: number;
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: (reason?: string) => void;
  refresh: () => Promise<void>;
  can: (...perms: string[]) => boolean;
  notice: string | null;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const lastActivity = useRef(Date.now());

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      setMe(await api.get<Me>('/auth/me'));
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((reason?: string) => {
    if (getToken()) api.post('/auth/logout').catch(() => undefined);
    setToken(null);
    setMe(null);
    setNotice(reason ?? null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMe(null);
      setNotice('Your session has expired. Please log in again.');
    });
    refresh();
  }, [refresh]);

  /* Idle session timeout (SRS 60) */
  useEffect(() => {
    if (!me) return;
    const bump = () => (lastActivity.current = Date.now());
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > (me.sessionTimeoutMinutes || 30) * 60000) logout('You were logged out after a period of inactivity.');
    }, 30000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [me, logout]);

  const login = async (userName: string, password: string) => {
    const r = await api.post<{ token: string }>('/auth/login', { userName, password });
    setToken(r.token);
    setNotice(null);
    lastActivity.current = Date.now();
    await refresh();
  };

  const can = (...perms: string[]) => !!me && perms.some((p) => me.permissions.includes(p));

  return <Ctx.Provider value={{ me, loading, login, logout, refresh, can, notice }}>{children}</Ctx.Provider>;
}
