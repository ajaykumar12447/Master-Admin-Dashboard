import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminRole } from '@/lib/types';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export interface AdminProfile {
  userId: string;
  email: string;
  role: AdminRole;
  displayName: string;
}

export type AuthStatus = 'loading' | 'signed_out' | 'pending' | 'blocked' | 'unavailable' | 'admin';

interface AuthContextValue {
  status: AuthStatus;
  profile: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(session: Session): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, display_name')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    userId: data.user_id,
    email: session.user.email ?? '',
    role: data.role as AdminRole,
    displayName: data.display_name,
  };
}

async function requestAdminAccess(): Promise<'pending' | 'blocked'> {
  const { data, error } = await supabase.rpc('request_admin_access');
  if (error) throw new Error(error.message);
  if (data !== 'pending' && data !== 'blocked' && data !== 'approved') throw new Error('Unexpected response from server');
  return data === 'blocked' ? 'blocked' : 'pending';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let active = true;

    const applySession = (session: Session | null) => {
      (async () => {
        if (!session) {
          if (!active) return;
          setProfile(null);
          setStatus('signed_out');
          return;
        }
        try {
          const adminProfile = await loadProfile(session);
          if (!active) return;
          if (adminProfile) {
            setProfile(adminProfile);
            setStatus('admin');
            return;
          }
          const access = await requestAdminAccess();
          if (!active) return;
          setProfile(null);
          setStatus(access);
        } catch {
          if (!active) return;
          setProfile(null);
          setStatus('unavailable');
        }
      })();
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    if (status !== 'admin') return;
    let timer = window.setTimeout(() => void signOut(), IDLE_TIMEOUT_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void signOut(), IDLE_TIMEOUT_MS);
    };
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [status, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profile,
      signOut,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error(error.message);
      },
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw new Error(error.message);
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
      },
    }),
    [status, profile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
