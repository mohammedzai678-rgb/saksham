// ============================================================
// SAKSHAM — Auth Context Provider
// Manages Firebase Authentication state across the app
// ============================================================

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GithubAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, githubProvider, db } from '@/lib/firebase/config';
import type { SakshamUser, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  sakshamUser: SakshamUser | null;
  loading: boolean;
  error: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sakshamUser, setSakshamUser] = useState<SakshamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createUserDocument = useCallback(async (firebaseUser: User, role: UserRole = 'developer') => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newUser: SakshamUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Anonymous',
        photoURL: firebaseUser.photoURL || undefined,
        role,
        githubConnected: false,
        preferences: {
          theme: 'dark',
          notifications: true,
          emailAlerts: false,
          defaultScanDepth: 'standard',
          autoRemediate: false,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };

      await setDoc(userRef, newUser);
      return newUser;
    } else {
      await setDoc(userRef, { lastLoginAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
      return userSnap.data() as SakshamUser;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userData = await createUserDocument(firebaseUser);
        setSakshamUser(userData);
      } else {
        setUser(null);
        setSakshamUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [createUserDocument]);

  const signInEmail = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpEmail = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInGithub = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      const idToken = await result.user.getIdToken();

      if (accessToken) {
        await fetch('/api/github/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            accessToken,
            username: result.user.providerData.find((provider) => provider.providerId === 'github.com')?.displayName || result.user.displayName || '',
          }),
        });
      } else {
        await setDoc(
          doc(db, 'users', result.user.uid),
          { githubConnected: true, updatedAt: Timestamp.now() },
          { merge: true }
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with GitHub';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        sakshamUser,
        loading,
        error,
        signInEmail,
        signUpEmail,
        signInGoogle,
        signInGithub,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
