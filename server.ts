import express from 'express';
import { createServer as createViteServer } from 'vite';
import { db, initDb } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import reportRoutes from './server/routes/reports.js';
import settingsRoutes from './server/routes/settings.js';
import footballRoutes from './server/routes/football.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3301);

  app.use(express.json());

  // Initialize Database
  initDb();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/football', footballRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
