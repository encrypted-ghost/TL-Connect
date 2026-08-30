import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { apiClient } from './apiClient';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = supabase.auth as any;

    // 1. Check current session
    const checkSession = async () => {
      try {
        const { data, error } = await auth.getSession();
        const session = data?.session;
        if (error) {
          if (error.message?.includes('Refresh Token Not Found')) {
            console.warn('Stale session detected, clearing storage...');
            await auth.signOut();
            handleSession(null);
          } else {
            console.error('Initial session fetch error:', error.message);
            handleSession(null);
          }
        } else {
          handleSession(session);
        }
      } catch (err) {
        console.error('Unexpected error checking session:', err);
        handleSession(null);
      }
    };

    checkSession();

    // 2. Listen for auth changes
    const { data: subData } = auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        handleSession(session);
      } else {
        handleSession(session);
      }
    });

    return () => {
      subData?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSession = async (session: any | null) => {
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
    const { error } = await (supabase.auth as any).signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await (supabase.auth as any).signOut();
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
