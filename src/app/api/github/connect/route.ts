// ============================================================
// SAKSHAM — GitHub OAuth Token Connection
// Stores encrypted GitHub provider tokens server-side only
// ============================================================

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseAdminConfigured, verifyRequestUser } from '@/lib/firebase/admin';

function encryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is required to store GitHub tokens securely.');
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ success: false, error: 'Firebase Admin is not configured.' }, { status: 503 });
  }

  try {
    const authUser = await verifyRequestUser(request);
    const { accessToken, username = '' } = await request.json();
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing GitHub access token' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = new Date();
    await db.collection('github_connections').doc(authUser.uid).set({
      userId: authUser.uid,
      username,
      accessTokenEncrypted: encrypt(accessToken),
      scopes: ['repo', 'read:user', 'user:email'],
      connectedAt: now,
      updatedAt: now,
    }, { merge: true });

    await db.collection('users').doc(authUser.uid).set({
      githubConnected: true,
      githubUsername: username,
      updatedAt: now,
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to connect GitHub' },
      { status: 500 }
    );
  }
}
