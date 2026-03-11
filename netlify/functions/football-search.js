import { fetchApiFootball, getUserSettingsFromEvent, json } from './_shared.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' });
  }

  const query = event.queryStringParameters?.query?.trim();
  if (!query) {
    return json(400, { error: 'Missing team search query.' });
  }

  const { settings, error } = await getUserSettingsFromEvent(event);
  if (error) {
    return error;
  }

  try {
    const data = await fetchApiFootball(`/teams?search=${encodeURIComponent(query)}`, settings.football_api_key);
    const teams = (data.response || []).map((entry) => ({
      id: String(entry.team.id),
      name: entry.team.name,
      logo: entry.team.logo,
    }));

    return json(200, teams);
  } catch (caughtError) {
    return json(500, { error: caughtError.message });
  }
}
