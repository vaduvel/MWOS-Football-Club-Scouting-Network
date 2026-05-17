import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import {
  generateAdminChatReply,
  generateAdminInsights,
  getAdminAiRuntimeStatus,
} from './server/admin-ai.js';
import { getEmailRuntimeStatus } from './netlify/functions/_shared.js';

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
          server.middlewares.use('/api/admin-ai/status', async (req, res, next) => {
            if (req.method !== 'GET') {
              return next();
            }

            jsonResponse(res, 200, getAdminAiRuntimeStatus());
          });

          server.middlewares.use('/api/admin/email-status', async (req, res, next) => {
            if (req.method !== 'GET') {
              return next();
            }

            jsonResponse(res, 200, getEmailRuntimeStatus());
          });

          server.middlewares.use('/api/admin-ai/insights', async (req, res, next) => {
            if (req.method !== 'POST') {
              return next();
            }

            try {
              const body = await readJsonBody(req);
              const result = await generateAdminInsights(body?.context || {});
              jsonResponse(res, 200, result);
            } catch (error: any) {
              const statusCode = error?.code === 'admin_ai_not_configured' ? 503 : 500;
              jsonResponse(res, statusCode, {
                error: error.message || 'Failed to generate admin insights.',
                ...(error?.code ? { code: error.code } : {}),
              });
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
              const statusCode = error?.code === 'admin_ai_not_configured' ? 503 : 500;
              jsonResponse(res, statusCode, {
                error: error.message || 'Failed to generate admin response.',
                ...(error?.code ? { code: error.code } : {}),
              });
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
