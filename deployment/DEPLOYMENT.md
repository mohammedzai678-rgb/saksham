# SAKSHAM Deployment Checklist

This app is designed for Vercel + Firebase only. The current build target is a Next.js App Router app with serverless API routes for scans, chat, reports, and GitHub workflows.

## Current Deployment Status

- `npm.cmd run build` passes locally.
- `npm.cmd run lint` passes locally.
- Firebase client config has a demo fallback so local builds do not crash before real secrets are added.
- Firestore rules, Storage rules, and `firebase.json` are present.
- Dashboard, repositories, vulnerabilities, reports, notifications, history, agents, chat, and attack graphs read live Firestore collections.
- `/api/scan` creates persisted repositories, scan sessions, agent logs, vulnerabilities, remediations, risk scores, attack graphs, repository memory, and notifications.
- `/api/chat` uses Gemini and persists chat history in Firestore.
- `/api/reports` generates React PDF reports, uploads them to Firebase Storage, and saves signed report records.
- GitHub OAuth tokens can be encrypted server-side for PR review workflows.
- OSV.dev, CISA KEV, NVD enrichment, Sentry browser events, and PostHog browser events are wired.

## Runtime Notes

- The static analysis layer includes a serverless Semgrep-compatible rule engine for deployability on Vercel. It does not shell out to the Semgrep CLI, because this project intentionally avoids Docker and self-hosted infrastructure.
- NVD enrichment works without `NVD_API_KEY`, but rate limits are much better when the key is set.
- `TOKEN_ENCRYPTION_KEY` must be a strong secret before using GitHub OAuth token storage.
- Firebase Admin credentials are required for the real APIs. Without them, the UI can build, but authenticated scan/chat/report APIs will reject requests.

## 1. Create Firebase Project

1. Open the Firebase console and create a project named `saksham`.
2. Add a Web app.
3. Copy the Web app config values into `.env.local` and into Vercel environment variables.
4. Enable Authentication providers:
   - Email/password
   - Google
   - GitHub
5. In Firebase Authentication authorized domains, add:
   - `localhost`
   - your Vercel production domain, for example `saksham.vercel.app`
   - any custom domain you attach later
6. Create a Cloud Firestore database in production mode.
7. Create a Firebase Storage bucket.

References:
- https://firebase.google.com/docs/auth/web/start
- https://firebase.google.com/docs/auth/web/google-signin
- https://support.google.com/firebase/answer/6400741

## 2. Create Firebase Admin Credentials

1. In Firebase/GCP project settings, create a service account key for server-side Admin SDK use.
2. Put these values in Vercel and local `.env.local`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Store `FIREBASE_PRIVATE_KEY` as a single-line value with escaped newlines:

```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Reference:
- https://firebase.google.com/docs/admin/setup

## 3. Configure Environment Variables

Required for the browser:

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

Required for serverless API routes:

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

Optional:

```bash
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

On Vercel, add these under Project Settings -> Environment Variables for Production, Preview, and Development as needed. Redeploy after changing `NEXT_PUBLIC_*` values because they are bundled at build time.

References:
- https://vercel.com/docs/environment-variables
- https://nextjs.org/docs/app/guides/environment-variables

## 4. Deploy Firebase Rules

Install and log in to Firebase CLI, then run:

```bash
firebase login
firebase use <your-firebase-project-id>
firebase deploy --only firestore:rules,storage
```

References:
- https://firebase.google.com/docs/rules/manage-deploy
- https://firebase.google.com/docs/rules

## 5. Deploy Next.js to Vercel

Recommended path:

1. Push the repo to GitHub.
2. In Vercel, import the GitHub repository.
3. Framework preset should auto-detect Next.js.
4. Use:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: leave default
5. Add all environment variables before the first production deploy.
6. Deploy.

References:
- https://vercel.com/frameworks/nextjs
- https://vercel.com/docs/builds

## 6. Post-Deploy Smoke Test

1. Open the Vercel URL.
2. Create an account with email/password.
3. Sign out and sign back in.
4. Test Google OAuth.
5. Test GitHub OAuth.
6. Open `/dashboard`.
7. Open `/dashboard/chat` and send a simple message.
8. Open `/dashboard/scan` and scan a small public GitHub repository.
9. Check Firestore for new documents in `repositories`, `scan_sessions`, `agent_logs`, `vulnerabilities`, `remediations`, `risk_scores`, `attack_graphs`, `repository_memory`, and `notifications`.
10. Open `/dashboard/reports` and generate a PDF report.
11. Check Firebase Storage for the uploaded report under `reports/<uid>/`.
12. Check Vercel Function logs for `/api/chat`, `/api/scan`, `/api/reports`, and GitHub routes.

## 7. Production Hardening Order

1. Create realistic test repositories for SQLi, XSS, SSRF, command injection, secrets, and dependency CVE fixtures.
2. Add CI smoke tests that call authenticated scan/chat/report routes against a staging Firebase project.
3. Add GitHub webhook verification and PR comment templates for organization rollout.
4. Add paid-tier quota controls for Gemini, Hugging Face, OSV, NVD, and GitHub API usage.
5. Add retention policies for reports, logs, repository memory, and chat sessions.
6. Add organization onboarding, invite flow, and admin billing gates.
