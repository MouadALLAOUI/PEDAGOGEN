'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
}

interface TeacherProfile {
  id: string;
  full_name: string;
  matiere: string;
  etablissement: string;
  telephone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: TeacherProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          fetchProfile();
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || 'Login failed' };
      }

      setUser(data.user);
      await fetchProfile();
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'SignIn failed' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      await fetchProfile();
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'SignUp failed' };
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
