# SAKSHAM

SAKSHAM is an AI-native autonomous cybersecurity platform built with Next.js, Firebase, and multi-agent workflows. It scans repositories, validates findings, scores risk, generates remediation context, and presents the results through a cinematic security dashboard.

## What It Does

SAKSHAM is designed to help security, platform, and engineering teams move from raw code to actionable security decisions faster. The platform combines repository scanning, AI-assisted analysis, exploitability validation, risk scoring, reporting, chat, and GitHub integration into a single workflow.

Key capabilities:

- Authenticate with email/password, Google, or GitHub.
- Scan repositories and persist scan sessions in Firestore.
- Analyze findings with multiple specialized agents.
- Validate exploitability and reduce false positives.
- Score repository risk and track posture over time.
- Generate PDF security reports and upload them to Firebase Storage.
- Review findings through an AI chat assistant.
- Connect GitHub accounts for PR review workflows.
- Display dashboards for vulnerabilities, repositories, scan history, notifications, agent activity, and attack graphs.

## Product Features

### Authentication and Access Control

- Firebase Authentication with email/password, Google, and GitHub login.
- Automatic user profile creation in Firestore on first sign-in.
- Protected dashboard routes for authenticated users only.
- Sidebar state and user preferences stored in app state and Firestore.

### Security Scanning Workflow

- Repository scan initiation from the dashboard.
- Multi-agent orchestration for static analysis, dependency security, exploitability validation, threat intelligence, risk scoring, remediation, repository intelligence, and memory.
- Scan progress, logs, and agent state tracking in the UI.
- Persisted artifacts in Firestore, including:
	- repositories
	- scan sessions
	- vulnerabilities
	- agent logs
	- remediations
	- risk scores
	- attack graphs
	- repository memory
	- notifications

### Dashboard and Operations Views

- Overview dashboard with repository metrics, scan totals, active threats, and resolution counts.
- Severity distribution charts and trend analysis.
- Vulnerability list with severity badges and file/line context.
- Agent activity feed for workflow events.
- Repository list and scan history for longitudinal tracking.
- Notifications and settings pages for operational control.

### AI and Developer Assistance

- Chat assistant powered by Gemini for security questions and analysis.
- GitHub connection flow for repository and PR review use cases.
- PR review endpoint for automated review workflows.
- Report generation endpoint for exportable security summaries.

### Reporting and Observability

- React PDF-based report generation.
- Firebase Storage upload for generated reports.
- Browser observability through PostHog pageview capture.
- Error tracking hooks wired for Sentry-style client event capture.
- Toast notifications for user-facing status feedback.

## Tech Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Recharts
- Lucide React icons
- Zustand for local state
- react-hot-toast for notifications

### Backend and Data

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Admin SDK
- Next.js serverless route handlers

### AI and Security Services

- Google Generative AI
- Hugging Face Inference API
- GitHub OAuth and PR review workflows
- OSV, CISA KEV, and NVD enrichment paths

### Documents and Observability

- @react-pdf/renderer for report creation
- PostHog browser analytics
- Sentry-style browser error capture hooks

## Application Workflow

1. A user signs in with Firebase Auth.
2. SAKSHAM creates or updates the Firestore user profile.
3. The user opens the dashboard and selects a repository to scan.
4. The scan endpoint orchestrates the security workflow across specialized agents.
5. Findings, risk scores, logs, attack graphs, remediations, and notifications are persisted.
6. The dashboard surfaces live posture, severity breakdowns, and recent findings.
7. The user can inspect vulnerabilities, review reports, continue in chat, or trigger GitHub-related workflows.
8. Reports are generated as PDFs and stored in Firebase Storage for download and sharing.

## API Surface

The app uses Next.js route handlers for backend actions.

- `POST /api/chat` - AI chat and analysis assistant.
- `POST /api/scan` - repository scanning and persistence.
- `POST /api/report` - report creation flow.
- `GET/POST /api/reports` - report listing and report generation.
- `POST /api/github/connect` - GitHub account connection.
- `POST /api/github/pr-review` - PR review workflow.

## Project Structure

```text
src/
	app/
		api/            route handlers for scan, chat, reports, and GitHub workflows
		dashboard/      authenticated product areas
		layout.tsx      root app shell and metadata
		providers.tsx    auth, analytics, and toast providers
	components/
		layout/         sidebar and topbar
	hooks/            Firestore collection hooks
	lib/
		agents/         orchestration logic
		auth/           Firebase auth context
		firebase/       client and admin configuration
		observability/  client analytics and error capture
		store.ts        Zustand stores
	types/            shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Firebase project with Authentication, Firestore, and Storage enabled

### Install

```bash
npm install
```

### Environment Variables

Create a `.env.local` file with the required values for Firebase, AI, and GitHub integration.

Browser-facing values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=SAKSHAM
```

Server-side values:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
GOOGLE_GEMINI_API_KEY=
HUGGINGFACE_API_TOKEN=
GITHUB_TOKEN=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
TOKEN_ENCRYPTION_KEY=
NVD_API_KEY=
```

Optional observability values:

```bash
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Development Workflow

### Run Locally

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

## Deployment Workflow

The repository is built for Vercel + Firebase deployment.

1. Configure Firebase Authentication providers and create Firestore and Storage.
2. Add environment variables in your hosting platform.
3. Deploy Firestore and Storage rules.
4. Push the app to GitHub.
5. Import the GitHub repository into Vercel.
6. Run the first production deployment.

For full deployment steps and hardening notes, see [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md).

## Smoke Test Checklist

After deployment, validate the core flow:

1. Sign up or sign in with email/password.
2. Verify Google and GitHub authentication.
3. Open the dashboard and confirm metrics load.
4. Run a repository scan.
5. Check that vulnerabilities, logs, risk scores, and notifications persist.
6. Open the chat assistant and send a message.
7. Generate a report and confirm it appears in Firebase Storage.
8. Confirm GitHub connection and PR review workflows if configured.

## Notes

- The app uses a dark, cyberpunk-inspired design system with animated gradients and glassmorphism.
- Root metadata, auth providers, analytics hooks, and error capture are configured in the app shell.
- The dashboard is protected and redirects unauthenticated users back to the landing page.
