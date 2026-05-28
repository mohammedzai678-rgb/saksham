// ============================================================
// SAKSHAM — Firebase Admin SDK Configuration
// Server-side only — lazy initialization for Vercel builds
// ============================================================

import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { NextRequest } from 'next/server';

const hasValue = (value: string | undefined) =>
  Boolean(value && !value.startsWith('your_') && !value.includes('YOUR_PRIVATE_KEY'));

function normalizePrivateKey(value: string | undefined) {
  if (!value) return value;

  let key = value.trim();
  if (key.endsWith(',')) key = key.slice(0, -1).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, '\n');
}

export const isFirebaseAdminConfigured =
  hasValue(process.env.FIREBASE_PROJECT_ID) &&
  hasValue(process.env.FIREBASE_CLIENT_EMAIL) &&
  hasValue(process.env.FIREBASE_PRIVATE_KEY);

let adminApp: App | null = null;

function getAdminApp() {
  if (!isFirebaseAdminConfigured) {
    throw new Error('Firebase Admin is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }

  if (adminApp) return adminApp;

  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export { FieldValue, Timestamp };

export async function verifyRequestUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    throw new Error('Missing authorization token');
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email || '',
    name: decoded.name || decoded.email || 'User',
  };
}
