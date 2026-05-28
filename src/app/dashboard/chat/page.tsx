// ============================================================
// SAKSHAM — AI Repository Chat
// Persisted Firebase-backed repository Q&A
// ============================================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  GitBranch,
  Plus,
  History,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useChatSessions, useRepositories } from '@/hooks/use-firestore-collections';
import type { ChatMessage } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  'What frameworks does this repository use?',
  'How do I run this project locally?',
  'Where is authentication implemented?',
  'What environment variables are required?',
  'Explain the most critical vulnerability found',
  'Show me the data flow for user inputs',
];

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate() as Date;
  }
  return new Date();
}

function normalizeMessages(messages: ChatMessage[] = []): Message[] {
  return messages
    .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: toDate(message.timestamp),
    }));
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('global');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const { user } = useAuth();
  const { data: repositories } = useRepositories();
  const { data: chatSessions } = useChatSessions();
  const selectedRepo = repositories.find((repo) => repo.id === selectedRepoId);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return `local-msg-${messageIdRef.current}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedSession = chatSessions.find((chat) => chat.id === selectedChatId);
  const displayMessages = selectedSession ? normalizeMessages(selectedSession.messages) : messages;

  const startNewChat = () => {
    setSelectedChatId(undefined);
    setMessages([]);
    setInput('');
  };

  const sendMessage = async (content?: string) => {
    const messageText = content || input.trim();
    if (!messageText || !user) return;

    const userMessage: Message = {
      id: nextMessageId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          repositoryUrl: selectedRepo?.url || '',
          repositoryId: selectedRepoId,
          chatSessionId: selectedChatId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to process the message');
      }

      setSelectedChatId(data.chatSessionId);
      const assistantMessage: Message = {
        id: nextMessageId(),
        role: 'assistant',
        content: data.response || 'I was unable to process that request. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: nextMessageId(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Connection error. Please check your API configuration and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4">
      <div className="w-64 shrink-0 glass-card rounded-2xl p-4 flex flex-col">
        <button
          onClick={startNewChat}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl btn-primary text-sm font-medium mb-4"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        <div className="mb-3">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">Repository</label>
          <div className="relative">
            <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg input-cyber text-xs"
            >
              <option value="global">Global assistant</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>{repo.fullName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
            <History className="w-3 h-3" />
            Saved Chats
          </p>
          {chatSessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-text-muted">No saved chats yet.</p>
          ) : (
            chatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setSelectedChatId(session.id);
                  setSelectedRepoId(session.repositoryId || 'global');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${
                  selectedChatId === session.id
                    ? 'bg-saksham-primary/10 text-saksham-primary'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                {session.title}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-default flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saksham-primary/20 to-saksham-secondary/20 border border-saksham-primary/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-saksham-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">SAKSHAM AI Assistant</h2>
            <p className="text-xs text-text-muted">{selectedRepo?.fullName || 'Repository intelligence & security guidance'}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-saksham-success animate-pulse" />
            <span className="text-xs text-saksham-success">Online</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {displayMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-saksham-primary/10 to-saksham-secondary/10 border border-saksham-primary/20 flex items-center justify-center mb-4 mx-auto">
                  <Sparkles className="w-8 h-8 text-saksham-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">How can I help?</h3>
                <p className="text-sm text-text-muted mb-6 max-w-md">
                  Ask about scanned repositories, vulnerabilities, setup instructions, or security best practices.
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                  {suggestedPrompts.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-left px-4 py-3 rounded-xl glass text-xs text-text-secondary hover:text-text-primary hover:border-saksham-primary/20 transition-all"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            displayMessages.map((message) => (
              <motion.div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saksham-primary/20 to-saksham-secondary/20 border border-saksham-primary/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-saksham-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-saksham-primary/15 border border-saksham-primary/20 text-text-primary'
                      : 'glass text-text-secondary'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <span className="text-[10px] text-text-muted mt-2 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-saksham-secondary/20 border border-saksham-secondary/30 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-saksham-secondary" />
                  </div>
                )}
              </motion.div>
            ))
          )}

          {isLoading && (
            <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saksham-primary/20 to-saksham-secondary/20 border border-saksham-primary/30 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-saksham-primary" />
              </div>
              <div className="glass px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-saksham-primary animate-spin" />
                  <span className="text-sm text-text-muted">Analyzing repository memory...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border-default">
          <div className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the repository..."
              className="flex-1 px-4 py-3 rounded-xl input-cyber text-sm resize-none min-h-[48px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-gradient-to-r from-saksham-primary to-saksham-secondary disabled:opacity-30 transition-opacity shrink-0"
            >
              <Send className="w-4 h-4 text-bg-primary" />
            </button>
          </div>
          <p className="text-[10px] text-text-muted mt-2 text-center">
            Conversations are saved to Firestore and grounded in repository memory from completed scans.
          </p>
        </div>
      </div>
    </div>
  );
}
