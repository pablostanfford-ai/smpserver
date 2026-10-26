'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { SessionUser, SiteSettings } from './types';

interface AuthContextValue {
  user: SessionUser | null;
  settings: SiteSettings | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser | null }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [meResult, settingsResult] = await Promise.allSettled([
        api.get<{ user: SessionUser | null }>('/auth/me'),
        api.get<{ settings: SiteSettings }>('/settings'),
      ]);

      if (cancelled) return;
      if (meResult.status === 'fulfilled') setUser(meResult.value.user);
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value.settings);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, settings, loading, refreshUser, logout, setUser }),
    [user, settings, loading, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}

/** Хелпер для проверки прав на клиенте (сервер всё равно перепроверяет). */
export function hasRole(user: SessionUser | null, min: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'OWNER') {
  if (!user) return false;
  const weights = { OWNER: 40, ADMIN: 30, MODERATOR: 20, PLAYER: 10 };
  return weights[user.role] >= weights[min];
}
