import { json, requireAdminUser } from './_shared.js';
import { generateAdminChatReply } from '../../server/admin-ai.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAdminUser(event);
  if (auth.error) {
    return auth.error;
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  try {
    const result = await generateAdminChatReply(payload?.context || {}, payload?.messages || []);
    return json(200, result);
  } catch (error) {
    if (error?.code === 'admin_ai_not_configured') {
      return json(503, { error: error.message || 'Admin AI is not configured yet.', code: error.code });
    }

    return json(500, { error: error.message || 'Failed to generate admin response.' });
  }
}
