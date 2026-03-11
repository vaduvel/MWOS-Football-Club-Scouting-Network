import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from './auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req: any, res) => {
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  res.json(settings || { football_api_provider: 'api-football', football_api_key: '' });
});

router.put('/', (req: any, res) => {
  const { football_api_provider, football_api_key } = req.body;
  
  const existing = db.prepare('SELECT user_id FROM user_settings WHERE user_id = ?').get(req.user.id);
  
  if (existing) {
    db.prepare('UPDATE user_settings SET football_api_provider = ?, football_api_key = ? WHERE user_id = ?')
      .run(football_api_provider, football_api_key, req.user.id);
  } else {
    db.prepare('INSERT INTO user_settings (user_id, football_api_provider, football_api_key) VALUES (?, ?, ?)')
      .run(req.user.id, football_api_provider, football_api_key);
  }
  
  res.json({ success: true });
});

export default router;
