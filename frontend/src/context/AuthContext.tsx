import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function annotateError(error: unknown): Error {
  if (error && isAuthRetryableFetchError(error as Error)) {
    const e = new Error('NETWORK_ERROR');
    (e as unknown as Record<string, unknown>).code = 'NETWORK_ERROR';
    (e as unknown as Record<string, unknown>).cause = error;
    return e;
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function mapSupabaseUser(session: Session | null): User | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata as Record<string, unknown> | undefined;
  const username =
    (meta?.username as string | undefined) ??
    (meta?.name as string | undefined) ??
    (meta?.full_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'user';
  return {
    id: session.user.id,
    username,
    email: session.user.email ?? '',
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Start false — don't block app on auth (like Earthquake-Recovery)
  const [loading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Load auth in background — app already visible
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (cancelled) return;
      if (s?.user) {
        setSession(s);
        setUser(mapSupabaseUser(s));
      }
    }).catch((err) => {
      console.warn('[Auth] getSession failed:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (cancelled) return;
      if (newSession?.user) {
        setSession(newSession);
        setUser(mapSupabaseUser(newSession));
      } else {
        setSession(null);
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw annotateError(error);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, name: username } },
    });
    if (error) throw annotateError(error);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: !!session,
      login,
      register,
      logout,
      loading,
    }),
    [user, session, login, register, logout, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
