import { json, requireAdminUser } from './_shared.js';
import { generateAdminInsights } from '../../server/admin-ai.js';

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
    const result = await generateAdminInsights(payload?.context || {});
    return json(200, result);
  } catch (error) {
    return json(500, { error: error.message || 'Failed to generate admin insights.' });
  }
}
