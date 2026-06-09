import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../lib/config';

const DEMO_USER = {
  id: 'demo-user',
  phone: '+919999999999',
  email: null,
  user_metadata: { full_name: 'Demo User' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  role: '',
  factors: [],
  identities: [],
} as unknown as User;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  updateProfile: (updates: { full_name?: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(IS_DEMO ? DEMO_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(!IS_DEMO);

  useEffect(() => {
    if (IS_DEMO) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPhone = async (phone: string) => {
    if (IS_DEMO) return;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  const verifyOTP = async (phone: string, token: string) => {
    if (IS_DEMO) return;
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (IS_DEMO) { setUser(DEMO_USER); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (IS_DEMO) { setUser(DEMO_USER); return; }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const updateProfile = async (updates: { full_name?: string; phone?: string }) => {
    if (IS_DEMO) {
      setUser(u => (u ? ({ ...u, user_metadata: { ...u.user_metadata, ...updates } } as User) : u));
      return;
    }
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    if (data.user) setUser(data.user);
    // Best-effort mirror into the profiles row (ignore failures).
    if (data.user?.id && updates.full_name !== undefined) {
      (supabase.from('profiles') as any).update({ full_name: updates.full_name }).eq('id', data.user.id).then(() => {}, () => {});
    }
  };

  const signOut = async () => {
    if (IS_DEMO) { setUser(null); return; }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInWithPhone, verifyOTP, signInWithEmail, signUpWithEmail, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
