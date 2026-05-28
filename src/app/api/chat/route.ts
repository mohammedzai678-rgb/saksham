// ============================================================
// SAKSHAM — Chat API Route
// AI-powered repository Q&A with persisted Firebase memory
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateAiText } from '@/lib/agents/orchestrator';
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

    if (!process.env.GOOGLE_GEMINI_API_KEY && !process.env.HUGGINGFACE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Configure GOOGLE_GEMINI_API_KEY or HUGGINGFACE_API_TOKEN.' },
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

${repositoryUrl ? `Context: The user may be asking about the repository at ${repositoryUrl}. Use this only when it is relevant.` : ''}

Answer the user's question directly. If it is about code, security, or the repository context above, use that context. If it is a general question, answer normally as a helpful assistant. If you are not fully certain, say so briefly and give the best useful answer without pretending certainty. Format your response with clear structure when it helps.`;

    const systemInstruction = `You are SAKSHAM, a helpful AI assistant with deep cybersecurity and repository intelligence expertise. You can answer broad general questions as well as technical, coding, security, architecture, and deployment questions.

Your capabilities:
- Answer general knowledge, philosophical, practical, and everyday questions
- Explain repository architecture and code patterns
- Guide developers on local setup and configuration
- Identify and explain security vulnerabilities
- Provide remediation guidance and secure coding practices
- Answer questions about frameworks, dependencies, and APIs
- Teach cybersecurity concepts in an accessible way

Be conversational and useful. Do not refuse a broad question just because it is outside cybersecurity. For questions like "what is life", give a thoughtful answer. When repository memory is provided, use it only if it is relevant. If facts are uncertain or context is missing, acknowledge the uncertainty briefly and still provide the best answer you can. Always prioritize security best practices when the topic involves code, systems, or user data.`;

    const response = await generateAiText(prompt, systemInstruction);
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
        framework: Array.isArray(memory?.frameworks) ? memory.frameworks[0] || null : null,
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
