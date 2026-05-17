import { getEmailRuntimeStatus, json, requireAdminUser } from './_shared.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAdminUser(event);
  if (auth.error) {
    return auth.error;
  }

  return json(200, getEmailRuntimeStatus());
}
