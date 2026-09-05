import { createServiceSupabaseClient, emitScheduledTrainingReminders } from './_notification-core.js';

function readHeader(requestOrEvent, name) {
  const headers = requestOrEvent?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';

  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  const value = entry?.[1];
  return Array.isArray(value) ? value[0] || '' : String(value || '');
}

export function isAuthorizedCronRequest(requestOrEvent, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  return readHeader(requestOrEvent, 'authorization') === `Bearer ${secret}`;
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export default async (requestOrEvent = {}) => {
  const method = requestOrEvent.method || requestOrEvent.httpMethod || 'GET';
  if (method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  if (!isAuthorizedCronRequest(requestOrEvent)) {
    return jsonResponse(401, { error: 'Unauthorized.' });
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const result = await emitScheduledTrainingReminders(serviceSupabase);

    return jsonResponse(200, {
      ok: true,
      emitted: result.emitted,
      warning: result.warnings.join(' ').trim() || null,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error.message || 'Failed to emit training reminders.',
    });
  }
};

export const config = {
  schedule: '*/5 * * * *',
};
