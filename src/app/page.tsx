// ============================================================
// SAKSHAM — Cinematic Login Page
// Cyberpunk-modern authentication experience
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Zap,
  Scan,
  Bot,
  ChevronRight,
} from 'lucide-react';

const seededUnit = (seed: number) => {
  const value = Math.sin(seed * 999) * 10000;
  return value - Math.floor(value);
};

const particles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: `${(seededUnit(i + 1) * 100).toFixed(4)}%`,
  y: `${(seededUnit(i + 31) * 100).toFixed(4)}%`,
  size: `${(seededUnit(i + 61) * 3 + 1).toFixed(3)}px`,
  delay: seededUnit(i + 91) * 5,
  duration: seededUnit(i + 121) * 10 + 10,
}));

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInEmail, signUpEmail, signInGoogle, signInGithub, user, error, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password, displayName);
      }
    } catch {
      // Error handled by auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInGoogle();
    } catch {
      // Error handled by auth context
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInGithub();
    } catch {
      // Error handled by auth context
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-bg-primary">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-40" />

        {/* Radial gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-saksham-primary/5 blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-saksham-secondary/5 blur-[120px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-saksham-accent/3 blur-[100px] animate-glow-pulse" style={{ animationDelay: '3s' }} />

        {/* Floating particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
            }}
          >
            <motion.div
              className="rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.id % 3 === 0 ? '#00f0ff' : p.id % 3 === 1 ? '#a855f7' : '#f43f5e',
                opacity: 0.3,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        ))}

        {/* Scan line */}
        <motion.div
          className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-saksham-primary/30 to-transparent"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        {/* Left side — Branding */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Logo */}
          <motion.div
            className="flex items-center justify-center lg:justify-start gap-3 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-saksham-primary/20 to-saksham-secondary/20 border border-saksham-primary/30 flex items-center justify-center glow-cyan">
                <Shield className="w-7 h-7 text-saksham-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-saksham-primary animate-glow-pulse" />
            </div>
            <span className="text-3xl font-bold tracking-wider gradient-text">SAKSHAM</span>
          </motion.div>

          {/* Tagline */}
          <motion.h1
            className="text-4xl lg:text-5xl font-extrabold leading-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="text-text-primary">AI-Native</span>
            <br />
            <span className="gradient-text">Autonomous Security</span>
          </motion.h1>

          <motion.p
            className="text-text-secondary text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            Where specialized AI agents collaborate like an elite security engineering team. Scan, analyze, validate, and remediate — autonomously.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap justify-center lg:justify-start gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {[
              { icon: Scan, label: 'Deep Scanning' },
              { icon: Bot, label: 'Multi-Agent AI' },
              { icon: Zap, label: 'Real-time Threats' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-text-secondary"
              >
                <feature.icon className="w-4 h-4 text-saksham-primary" />
                {feature.label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right side — Auth card */}
        <motion.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        >
          <div className="glass-strong rounded-2xl p-8 relative overflow-hidden">
            {/* Card glow border */}
            <div className="absolute inset-0 rounded-2xl border border-saksham-primary/10 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-saksham-primary/50 to-transparent" />

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-text-primary mb-1">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-text-muted text-sm">
                {isLogin
                  ? 'Enter your credentials to access the platform'
                  : 'Join the future of cybersecurity'}
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleGoogleSignIn}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass hover:border-saksham-primary/30 transition-all text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button
                onClick={handleGithubSignIn}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass hover:border-saksham-primary/30 transition-all text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-[1px] bg-border-default" />
              <span className="text-xs text-text-muted uppercase tracking-wider">or</span>
              <div className="flex-1 h-[1px] bg-border-default" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative mb-4">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl input-cyber text-sm"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl input-cyber text-sm"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  className="w-full pl-10 pr-12 py-3 rounded-xl input-cyber text-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-saksham-accent bg-saksham-accent/10 border border-saksham-accent/20 rounded-lg px-4 py-2"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl font-semibold text-sm relative overflow-hidden group disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-saksham-primary to-saksham-secondary opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 text-bg-primary">
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </motion.button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); clearError(); }}
                className="text-sm text-text-muted hover:text-saksham-primary transition-colors inline-flex items-center gap-1"
              >
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Security badge */}
          <motion.div
            className="mt-4 flex items-center justify-center gap-2 text-xs text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <Shield className="w-3 h-3 text-saksham-primary" />
            <span>Protected by Firebase Auth • End-to-end encrypted</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
