import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendNotificationEmail } from '../../netlify/functions/_notification-core.js';
import { isAuthorizedCronRequest } from '../../netlify/functions/training-reminders.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('training reminder cron authorization', () => {
  it('accepts only the configured bearer token', () => {
    expect(isAuthorizedCronRequest({ headers: { authorization: 'Bearer expected' } }, 'expected')).toBe(true);
    expect(isAuthorizedCronRequest({ headers: { Authorization: 'Bearer wrong' } }, 'expected')).toBe(false);
    expect(isAuthorizedCronRequest({ headers: {} }, 'expected')).toBe(false);
    expect(isAuthorizedCronRequest({ headers: { authorization: 'Bearer expected' } }, '')).toBe(false);
  });

  it('supports Fetch API headers', () => {
    expect(
      isAuthorizedCronRequest(new Request('https://mwos-hub.com/api/training-reminders', {
        headers: { Authorization: 'Bearer expected' },
      }), 'expected'),
    ).toBe(true);
  });
});

describe('notification email retry behavior', () => {
  it('retries a rate-limited request and then succeeds', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_FROM_EMAIL = 'alerts@mwos-hub.com';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 429,
        headers: { 'retry-after': '0' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }));
    const waitImpl = vi.fn().mockResolvedValue(undefined);

    const result = await sendNotificationEmail(
      { to: 'coach@example.com', subject: 'Training update', html: '<p>Ready</p>' },
      { fetchImpl, waitImpl },
    );

    expect(result.skipped).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(waitImpl).toHaveBeenCalledOnce();
  });

  it('does not call the provider when email is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.NOTIFICATION_FROM_EMAIL;
    const fetchImpl = vi.fn();

    const result = await sendNotificationEmail(
      { to: 'coach@example.com', subject: 'Training update', html: '<p>Ready</p>' },
      { fetchImpl },
    );

    expect(result.skipped).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
