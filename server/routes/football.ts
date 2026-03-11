import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from './auth.js';

const router = Router();
router.use(authenticate);

async function fetchApiFootball(endpoint: string, apiKey: string) {
  const res = await fetch(`https://v3.football.api-sports.io${endpoint}`, {
    headers: { 'x-apisports-key': apiKey }
  });
  if (!res.ok) throw new Error('Failed to fetch from API-Football');
  return res.json();
}

router.get('/search', async (req: any, res) => {
  const { query } = req.query;
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id) as any;
  
  if (!settings?.football_api_key) {
    return res.status(400).json({ error: 'API key not configured in settings' });
  }

  try {
    if (settings.football_api_provider === 'api-football') {
      const data = await fetchApiFootball(`/teams?search=${encodeURIComponent(query as string)}`, settings.football_api_key);
      const teams = data.response.map((t: any) => ({
        id: t.team.id.toString(),
        name: t.team.name,
        logo: t.team.logo
      }));
      res.json(teams);
    } else {
      res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/squad/:teamId', async (req: any, res) => {
  const { teamId } = req.params;
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id) as any;
  
  if (!settings?.football_api_key) {
    return res.status(400).json({ error: 'API key not configured in settings' });
  }

  try {
    if (settings.football_api_provider === 'api-football') {
      const data = await fetchApiFootball(`/players/squads?team=${teamId}`, settings.football_api_key);
      if (!data.response || data.response.length === 0) {
        return res.json([]);
      }
      const players = data.response[0].players.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        number: p.number,
        position: p.position
      }));
      res.json(players);
    } else {
      res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
