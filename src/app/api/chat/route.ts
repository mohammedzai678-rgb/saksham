// ============================================================
// SAKSHAM — Chat API Route
// AI-powered repository Q&A with persisted Firebase memory
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/agents/orchestrator';
import { getAdminDb, isFirebaseAdminConfigured, verifyRequestUser } from '@/lib/firebase/admin';

interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function isChatHistoryMessage(value: unknown): value is ChatHistoryMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'role' in value &&
    'content' in value &&
    typeof value.content === 'string' &&
    ['user', 'assistant', 'system'].includes(String(value.role))
  );
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin is not configured, so chat memory cannot be persisted.' },
      { status: 503 }
    );
  }

  try {
    const authUser = await verifyRequestUser(request);
    const db = getAdminDb();
    const body = await request.json();
    const { message, repositoryUrl = '', repositoryId = 'global', chatSessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_GEMINI_API_KEY is not configured.' },
        { status: 503 }
      );
    }

    const sessionId = typeof chatSessionId === 'string' && chatSessionId
      ? chatSessionId
      : db.collection('chat_sessions').doc().id;
    const sessionRef = db.collection('chat_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    const storedMessages = sessionSnap.exists && Array.isArray(sessionSnap.data()?.messages)
      ? sessionSnap.data()?.messages.filter(isChatHistoryMessage)
      : [];

    const memorySnap = repositoryId !== 'global'
      ? await db.collection('repository_memory').doc(repositoryId).get()
      : null;
    const memory = memorySnap?.exists ? memorySnap.data() : null;

    const conversationHistory = storedMessages
      .slice(-10)
      .map((msg: ChatHistoryMessage) => `${msg.role === 'user' ? 'User' : 'SAKSHAM'}: ${msg.content}`)
      .join('\n');

    const memoryContext = memory ? `Repository memory:
Architecture: ${memory.architecture || 'Unknown'}
Frameworks: ${(memory.frameworks || []).join(', ') || 'Unknown'}
Entry points: ${(memory.entryPoints || []).join(', ') || 'Unknown'}
Auth patterns: ${(memory.authPatterns || []).join(', ') || 'Unknown'}
Known issues: ${(memory.knownIssues || []).join(', ') || 'None'}
Setup: ${memory.setupInstructions || 'Unknown'}` : '';

    const prompt = `${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ''}${memoryContext ? `${memoryContext}\n\n` : ''}User: ${message}

${repositoryUrl ? `Context: The user is asking about the repository at ${repositoryUrl}.` : ''}

Provide a helpful, detailed, and technically accurate response. If discussing code or security concepts, include examples and explanations. Format your response with clear structure using markdown-like formatting.`;

    const systemInstruction = `You are SAKSHAM, an elite AI cybersecurity assistant and repository intelligence engine. You deeply understand code repositories, security vulnerabilities, software architecture, and development best practices.

Your capabilities:
- Explain repository architecture and code patterns
- Guide developers on local setup and configuration
- Identify and explain security vulnerabilities
- Provide remediation guidance and secure coding practices
- Answer questions about frameworks, dependencies, and APIs
- Teach cybersecurity concepts in an accessible way

Always prioritize security best practices. If repository memory is provided, ground your answer in it. If the requested detail is not available, say what data is missing and suggest the next scan or integration needed.`;

    const model = getGeminiModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    });

    const response = result.response.text();
    const now = new Date();
    const title = storedMessages[0]?.content?.slice(0, 60) || message.slice(0, 60) || 'Repository chat';
    const userMessage = {
      id: `${sessionId}_msg_${storedMessages.length + 1}`,
      role: 'user',
      content: message,
      timestamp: now,
    };
    const assistantMessage = {
      id: `${sessionId}_msg_${storedMessages.length + 2}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    await sessionRef.set({
      id: sessionId,
      userId: authUser.uid,
      repositoryId,
      title,
      messages: [...(sessionSnap.data()?.messages || []), userMessage, assistantMessage],
      context: {
        repositoryName: memory?.repositoryName || repositoryUrl || 'Global',
        repositoryUrl,
        languages: memory?.languages || [],
        framework: Array.isArray(memory?.frameworks) ? memory.frameworks[0] : undefined,
        recentVulnerabilities: memory?.knownIssues || [],
      },
      createdAt: sessionSnap.exists ? sessionSnap.data()?.createdAt || now : now,
      updatedAt: now,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      response,
      chatSessionId: sessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        success: false,
        response: 'I encountered an error processing your request. Please check your API configuration and try again.',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: error instanceof Error && error.message.includes('authorization') ? 401 : 500 }
    );
  }
}
