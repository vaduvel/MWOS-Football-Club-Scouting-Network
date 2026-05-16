import { emitTrainingEvents } from './_notification-core.js';
import { json, requireAuthenticatedUser } from './_shared.js';
import { createServiceSupabaseClient } from './_notification-core.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAuthenticatedUser(event);
  if (auth.error) {
    return auth.error;
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (_error) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  if (payload?.mode !== 'emit-training-events' || !Array.isArray(payload?.events)) {
    return json(400, { error: 'Unsupported notification request.' });
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const result = await emitTrainingEvents(
      serviceSupabase,
      auth.user.id,
      auth.user.email || '',
      payload.events,
    );

    return json(200, {
      ok: true,
      inserted: result.inserted,
      warning: result.warnings.join(' ').trim() || null,
    });
  } catch (error) {
    return json(500, {
      error: error.message || 'Failed to process notifications.',
    });
  }
}
