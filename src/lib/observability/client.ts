'use client';

type CaptureProperties = Record<string, string | number | boolean | null | undefined>;

function posthogHost() {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
}

export function capturePostHog(event: string, properties: CaptureProperties = {}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  fetch(`${posthogHost().replace(/\/$/, '')}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      api_key: key,
      event,
      properties: {
        distinct_id: properties.distinct_id || 'anonymous',
        ...properties,
      },
    }),
  }).catch(() => {});
}

function parseSentryDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace('/', '');
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_key=${url.username}`,
    };
  } catch {
    return null;
  }
}

export function captureSentryError(error: Error, context: CaptureProperties = {}) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  fetch(parsed.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      platform: 'javascript',
      level: 'error',
      logger: 'saksham-client',
      message: error.message,
      exception: {
        values: [
          {
            type: error.name,
            value: error.message,
            stacktrace: {
              frames: (error.stack || '').split('\n').slice(1).map((line) => ({ function: line.trim() })),
            },
          },
        ],
      },
      extra: context,
    }),
  }).catch(() => {});
}
