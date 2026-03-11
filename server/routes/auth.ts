import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

router.post('/register', (req, res) => {
  const { email, password, name, organization } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const insert = db.prepare('INSERT INTO users (email, password, name, organization) VALUES (?, ?, ?, ?)');
    const info = insert.run(email, hash, name, organization);
    const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET);
    res.json({ token, user: { id: info.lastInsertRowid, email, name, organization, role: 'Scout' } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/me', authenticate, (req: any, res) => {
  const user = db.prepare('SELECT id, email, name, organization, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

export default router;
