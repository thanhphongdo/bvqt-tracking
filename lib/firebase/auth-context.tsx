'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseClient } from './client';
import type { UserRole } from '@/types/user';

interface AuthContextValue {
  user: FirebaseUser | null;
  role: UserRole | null;
  displayName: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = getFirebaseClient();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function verifyWithServer(fbUser: FirebaseUser) {
    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      setRole(null);
      setDisplayName(null);
      return;
    }
    const data = (await res.json()) as { role: UserRole; displayName: string };
    await fbUser.getIdToken(true);
    setRole(data.role);
    setDisplayName(data.displayName);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await verifyWithServer(fbUser);
      } else {
        setRole(null);
        setDisplayName(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [auth]);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signOut() {
    await fbSignOut(auth);
  }

  async function refreshRole() {
    if (user) await verifyWithServer(user);
  }

  return (
    <AuthContext.Provider value={{ user, role, displayName, loading, signInWithGoogle, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
