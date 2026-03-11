import { fetchApiFootball, getUserSettingsFromEvent, json } from './_shared.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' });
  }

  const teamId = event.queryStringParameters?.teamId?.trim();
  if (!teamId) {
    return json(400, { error: 'Missing team ID.' });
  }

  const { settings, error } = await getUserSettingsFromEvent(event);
  if (error) {
    return error;
  }

  try {
    const data = await fetchApiFootball(`/players/squads?team=${encodeURIComponent(teamId)}`, settings.football_api_key);
    const squad = data.response?.[0]?.players || [];
    const players = squad.map((player) => ({
      id: String(player.id),
      name: player.name,
      number: player.number,
      position: player.position,
    }));

    return json(200, players);
  } catch (caughtError) {
    return json(500, { error: caughtError.message });
  }
}
