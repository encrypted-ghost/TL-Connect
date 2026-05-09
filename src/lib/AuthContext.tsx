import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { apiClient } from './apiClient';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && error.message.includes('Refresh Token Not Found')) {
        console.warn('Stale session detected, signing out...');
        supabase.auth.signOut();
      }
      handleSession(session);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else {
        handleSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: Session | null) => {
    if (session) {
      setUser(session.user);
      // Fetch profile from our API (DB-backed RBAC)
      try {
        const res = await apiClient.get('/auth/me');
        setProfile(res.data);
        
        // Log the login event
        await apiClient.post('/auth/log-login').catch(() => {});
      } catch (err: any) {
        console.error('Failed to fetch profile', err.response?.data || err.message);
      }
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  };

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
