// ============================================================
// SAKSHAM — Firebase Client Configuration
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const hasRealValue = (value: string | undefined) =>
  Boolean(value && !value.startsWith('your_') && !value.includes('your-project'));

export const isFirebaseConfigured = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
].every(hasRealValue);

const firebaseConfig = {
  apiKey: isFirebaseConfigured ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : 'demo-api-key',
  authDomain: isFirebaseConfigured ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : 'demo.firebaseapp.com',
  projectId: isFirebaseConfigured ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : 'demo',
  storageBucket: isFirebaseConfigured ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : 'demo.appspot.com',
  messagingSenderId: isFirebaseConfigured ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : '000000000000',
  appId: isFirebaseConfigured ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : '1:000000000000:web:0000000000000000000000',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Configure providers
googleProvider.addScope('profile');
googleProvider.addScope('email');
githubProvider.addScope('repo');
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

export default app;
