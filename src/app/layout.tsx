// ============================================================
// SAKSHAM — Root Layout
// ============================================================

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SAKSHAM — AI-Native Autonomous Cybersecurity Platform',
  description:
    'SAKSHAM is a futuristic AI-native autonomous cybersecurity platform where specialized AI agents collaborate to scan, analyze, validate, and remediate security vulnerabilities.',
  keywords: [
    'cybersecurity',
    'AI security',
    'vulnerability scanner',
    'DevSecOps',
    'autonomous security',
  ],
  authors: [{ name: 'SAKSHAM' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
