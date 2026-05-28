// ============================================================
// SAKSHAM — GitHub PR Review API
// Fetches PR diff, asks Gemini for security review, posts a PR comment
// ============================================================

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/agents/orchestrator';
import { getAdminDb, isFirebaseAdminConfigured, verifyRequestUser } from '@/lib/firebase/admin';

export const maxDuration = 60;

function encryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is required for GitHub token decryption.');
  return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ success: false, error: 'Firebase Admin is not configured.' }, { status: 503 });
  }

  try {
    const authUser = await verifyRequestUser(request);
    const { repositoryFullName, pullNumber, postComment = true } = await request.json();
    if (!repositoryFullName || !pullNumber) {
      return NextResponse.json({ success: false, error: 'repositoryFullName and pullNumber are required.' }, { status: 400 });
    }

    const db = getAdminDb();
    const connection = await db.collection('github_connections').doc(authUser.uid).get();
    const encrypted = connection.data()?.accessTokenEncrypted;
    const token = typeof encrypted === 'string' ? decrypt(encrypted) : process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ success: false, error: 'No GitHub token available.' }, { status: 400 });
    }

    const diffResponse = await fetch(`https://api.github.com/repos/${repositoryFullName}/pulls/${pullNumber}`, {
      headers: {
        Accept: 'application/vnd.github.v3.diff',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!diffResponse.ok) {
      throw new Error(`GitHub diff fetch failed with ${diffResponse.status}`);
    }

    const diff = (await diffResponse.text()).slice(0, 50000);
    const model = getGeminiModel();
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Review this pull request diff for exploitable security issues. Return a concise markdown review with severity, file references, exploitability, and remediation.\n\n${diff}`,
        }],
      }],
      systemInstruction: 'You are SAKSHAM PR Review Agent. Focus on real exploitable security risks and avoid generic style feedback.',
    });
    const review = result.response.text();

    if (postComment) {
      const commentResponse = await fetch(`https://api.github.com/repos/${repositoryFullName}/issues/${pullNumber}/comments`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: `## SAKSHAM AI Security Review\n\n${review}` }),
      });
      if (!commentResponse.ok) {
        throw new Error(`GitHub comment failed with ${commentResponse.status}`);
      }
    }

    await db.collection('notifications').add({
      userId: authUser.uid,
      type: 'pr_review',
      title: `PR review complete — ${repositoryFullName}#${pullNumber}`,
      message: 'SAKSHAM posted an AI security review for the pull request.',
      read: false,
      actionUrl: `https://github.com/${repositoryFullName}/pull/${pullNumber}`,
      metadata: { repositoryFullName, pullNumber },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to review pull request' },
      { status: 500 }
    );
  }
}
