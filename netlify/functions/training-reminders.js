import { createServiceSupabaseClient, emitScheduledTrainingReminders } from './_notification-core.js';

export default async () => {
  try {
    const serviceSupabase = createServiceSupabaseClient();
    const result = await emitScheduledTrainingReminders(serviceSupabase);

    return new Response(
      JSON.stringify({
        ok: true,
        emitted: result.emitted,
        warning: result.warnings.join(' ').trim() || null,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to emit training reminders.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
};

export const config = {
  schedule: '*/5 * * * *',
};
