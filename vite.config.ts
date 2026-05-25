import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { handler as acceptStaffInviteHandler } from './netlify/functions/accept-staff-invite.js';
import { handler as cancelStaffInviteHandler } from './netlify/functions/cancel-staff-invite.js';
import { handler as clubRosterHandler } from './netlify/functions/club-roster.js';
import { handler as expireStaffInvitesHandler } from './netlify/functions/expire-staff-invites.js';
import { handler as inviteStaffHandler } from './netlify/functions/invite-staff.js';
import { handler as issueStaffInviteLinkHandler } from './netlify/functions/issue-staff-invite-link.js';
import { handler as notifyEmailHandler } from './netlify/functions/notify-email.js';
import { handler as ocrReportHandler } from './netlify/functions/ocr-report.js';
import { handler as resendStaffInviteHandler } from './netlify/functions/resend-staff-invite.js';
import {
  generateAdminChatReply,
  generateAdminInsights,
  getAdminAiRuntimeStatus,
} from './server/admin-ai.js';
import { getAppRuntimeStatus, getEmailRuntimeStatus } from './netlify/functions/_shared.js';

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

function toNetlifyEvent(req: any, rawBody: string) {
  const requestUrl = new URL(req.originalUrl || req.url || '/', 'http://localhost');
  const queryStringParameters = Object.fromEntries(requestUrl.searchParams.entries());

  return {
    httpMethod: req.method || 'GET',
    headers: req.headers || {},
    body: rawBody,
    rawUrl: requestUrl.toString(),
    path: requestUrl.pathname,
    queryStringParameters,
    isBase64Encoded: false,
  };
}

async function runNetlifyFunction(handler: (event: any, context?: any) => Promise<any>, req: any, res: any) {
  const rawBody = req.method === 'GET' || req.method === 'HEAD' ? '' : await new Promise<string>((resolve, reject) => {
    let body = '';

    req.on('data', (chunk: Buffer | string) => {
      body += chunk.toString();
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

  const response = await handler(toNetlifyEvent(req, rawBody), {});
  res.statusCode = response?.statusCode || 200;

  Object.entries(response?.headers || {}).forEach(([headerName, headerValue]) => {
    if (headerValue !== undefined) {
      res.setHeader(headerName, headerValue as string);
    }
  });

  res.end(response?.body || '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  [
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'NOTIFICATION_FROM_EMAIL',
    'NOTIFICATION_REPLY_TO_EMAIL',
    'APP_BASE_URL',
    'VITE_APP_URL',
    'URL',
    'DEPLOY_PRIME_URL',
  ].forEach((key) => {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  });

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'admin-ai-dev-middleware',
        configureServer(server) {
          const functionHandlers: Record<string, (event: any, context?: any) => Promise<any>> = {
            'accept-staff-invite': acceptStaffInviteHandler,
            'cancel-staff-invite': cancelStaffInviteHandler,
            'club-roster': clubRosterHandler,
            'expire-staff-invites': expireStaffInvitesHandler,
            'invite-staff': inviteStaffHandler,
            'issue-staff-invite-link': issueStaffInviteLinkHandler,
            'notify-email': notifyEmailHandler,
            'ocr-report': ocrReportHandler,
            'resend-staff-invite': resendStaffInviteHandler,
          };

          Object.entries(functionHandlers).forEach(([functionName, handler]) => {
            server.middlewares.use(`/.netlify/functions/${functionName}`, async (req, res, next) => {
              try {
                await runNetlifyFunction(handler, req, res);
              } catch (error: any) {
                jsonResponse(res, 500, {
                  error: error?.message || `Failed to execute ${functionName} locally.`,
                });
              }
            });

            server.middlewares.use(`/api/${functionName}`, async (req, res, next) => {
              try {
                await runNetlifyFunction(handler, req, res);
              } catch (error: any) {
                jsonResponse(res, 500, {
                  error: error?.message || `Failed to execute ${functionName} locally.`,
                });
              }
            });
          });

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

          server.middlewares.use('/api/admin/runtime-status', async (req, res, next) => {
            if (req.method !== 'GET') {
              return next();
            }

            jsonResponse(res, 200, getAppRuntimeStatus());
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
