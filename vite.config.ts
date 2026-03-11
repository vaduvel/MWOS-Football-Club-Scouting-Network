import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { generateAdminChatReply, generateAdminInsights } from './server/admin-ai.js';

function readJsonBody(req: NodeJS.ReadableStream) {
  return new Promise<any>((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function jsonResponse(res: any, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  if (env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY) {
    process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY;
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'admin-ai-dev-middleware',
        configureServer(server) {
          if (!env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) {
            return;
          }

          server.middlewares.use('/api/admin-ai/insights', async (req, res, next) => {
            if (req.method !== 'POST') {
              return next();
            }

            try {
              const body = await readJsonBody(req);
              const result = await generateAdminInsights(body?.context || {});
              jsonResponse(res, 200, result);
            } catch (error: any) {
              jsonResponse(res, 500, { error: error.message || 'Failed to generate admin insights.' });
            }
          });

          server.middlewares.use('/api/admin-ai/chat', async (req, res, next) => {
            if (req.method !== 'POST') {
              return next();
            }

            try {
              const body = await readJsonBody(req);
              const result = await generateAdminChatReply(body?.context || {}, body?.messages || []);
              jsonResponse(res, 200, result);
            } catch (error: any) {
              jsonResponse(res, 500, { error: error.message || 'Failed to generate admin response.' });
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
