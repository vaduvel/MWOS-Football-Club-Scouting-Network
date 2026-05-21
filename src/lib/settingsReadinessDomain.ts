import type { AdminAiStatus, AdminEmailStatus } from './data';

export type LaunchReadinessTone = 'ready' | 'attention' | 'optional';

export interface LaunchReadinessItem {
  id: 'public_access' | 'invite_delivery' | 'team_import' | 'admin_ai';
  label: string;
  tone: LaunchReadinessTone;
  statusLabel: string;
  detail: string;
  action: string;
  blocking: boolean;
}

export interface LaunchReadinessSummary {
  tone: 'ready' | 'attention';
  headline: string;
  detail: string;
  readyCount: number;
  attentionCount: number;
  optionalCount: number;
  blockingCount: number;
  items: LaunchReadinessItem[];
  nextSteps: string[];
}

interface BuildLaunchReadinessInput {
  publicAppUrl: string;
  footballApiProvider: string;
  footballApiKey: string;
  adminAiStatus: AdminAiStatus | null;
  adminEmailStatus: AdminEmailStatus | null;
}

function isPublicHttpsUrl(url: string) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.trim().toLowerCase();
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local');

    return parsed.protocol === 'https:' && !isLocalHost;
  } catch (error) {
    return false;
  }
}

export function buildLaunchReadiness({
  publicAppUrl,
  footballApiProvider,
  footballApiKey,
  adminAiStatus,
  adminEmailStatus,
}: BuildLaunchReadinessInput): LaunchReadinessSummary {
  const normalizedProvider = String(footballApiProvider || '').trim().toLowerCase();
  const hasFootballApiKey = footballApiKey.trim().length > 0;
  const hasPublicHttpsUrl = isPublicHttpsUrl(publicAppUrl);

  const items: LaunchReadinessItem[] = [
    hasPublicHttpsUrl
      ? {
          id: 'public_access',
          label: 'Public access URL',
          tone: 'ready',
          statusLabel: 'Ready',
          detail: 'Password reset, invitation acceptance and shared links point to a public HTTPS app URL.',
          action: 'Keep this URL aligned with Supabase redirect settings and the active production host.',
          blocking: false,
        }
      : {
          id: 'public_access',
          label: 'Public access URL',
          tone: 'attention',
          statusLabel: 'Needs setup',
          detail:
            'The app URL is missing or still local. Shared invite links and recovery links should point to the public hosted app before launch.',
          action: 'Set VITE_APP_URL and APP_BASE_URL to the public HTTPS app URL, then confirm Supabase redirect URLs match.',
          blocking: true,
        },
    adminEmailStatus?.configured
      ? {
          id: 'invite_delivery',
          label: 'Invite & alert delivery',
          tone: 'ready',
          statusLabel: 'Email delivery ready',
          detail: 'Transactional invite emails and important alerts can be sent automatically from the app runtime.',
          action: 'Keep the verified sender and reply-to address current as the club domain is finalized.',
          blocking: false,
        }
      : {
          id: 'invite_delivery',
          label: 'Invite & alert delivery',
          tone: 'attention',
          statusLabel: 'Manual fallback active',
          detail:
            'The app can still onboard staff through manual invite links and WhatsApp sharing, but automatic email delivery is not configured yet.',
          action: 'Continue with manual links for now, then add Resend domain + sender when the official club domain is ready.',
          blocking: false,
        },
    normalizedProvider === 'none'
      ? {
          id: 'team_import',
          label: 'Team import provider',
          tone: 'optional',
          statusLabel: 'Manual entry mode',
          detail: 'Scouting reports can still be created, but teams and squads must be entered manually.',
          action: 'Enable API-Football only when the club wants faster squad import and has an active key.',
          blocking: false,
        }
      : hasFootballApiKey
        ? {
            id: 'team_import',
            label: 'Team import provider',
            tone: 'ready',
            statusLabel: 'Configured',
            detail: 'API-Football is selected and this account has an API key saved for squad search/import.',
            action: 'Run a quick team search from scouting when convenient to confirm the live key is still valid.',
            blocking: false,
          }
        : {
            id: 'team_import',
            label: 'Team import provider',
            tone: 'attention',
            statusLabel: 'Needs key',
            detail: 'API-Football is selected, but there is no API key in this account settings yet.',
            action: 'Paste a valid API-Football key or switch the provider to manual entry until one is available.',
            blocking: false,
          },
    adminAiStatus?.configured
      ? {
          id: 'admin_ai',
          label: 'Club assistant',
          tone: 'ready',
          statusLabel: 'Configured',
          detail: 'Leadership insights and the club assistant can use the configured automation runtime.',
          action: 'Review generated insights in Oversight and keep the server key available in the hosting environment.',
          blocking: false,
        }
      : {
          id: 'admin_ai',
          label: 'Club assistant',
          tone: 'optional',
          statusLabel: 'Optional for launch',
          detail: 'The club can still operate training, transport, scouting and staff onboarding without the assistant.',
          action: 'Add the assistant API key later to unlock automated leadership insights and admin chat.',
          blocking: false,
        },
  ];

  const readyCount = items.filter((item) => item.tone === 'ready').length;
  const attentionCount = items.filter((item) => item.tone === 'attention').length;
  const optionalCount = items.filter((item) => item.tone === 'optional').length;
  const blockingCount = items.filter((item) => item.blocking).length;

  const nextSteps = items.filter((item) => item.tone !== 'ready').map((item) => item.action);

  if (blockingCount > 0) {
    return {
      tone: 'attention',
      headline: 'Needs one more setup pass before wide launch',
      detail:
        'Core modules can run, but at least one launch-critical setting still points away from the public app. Fix the blocking item first, then retest the onboarding links.',
      readyCount,
      attentionCount,
      optionalCount,
      blockingCount,
      items,
      nextSteps,
    };
  }

  if (attentionCount > 0) {
    return {
      tone: 'ready',
      headline: 'Ready for live use with operational fallbacks',
      detail:
        'The club can use the app today. A few integrations are still running in manual or partial mode, but the core workflows are usable and the next steps are explicit.',
      readyCount,
      attentionCount,
      optionalCount,
      blockingCount,
      items,
      nextSteps,
    };
  }

  return {
    tone: 'ready',
    headline: 'Ready for live use',
    detail:
      'Core launch settings are aligned for staff onboarding, team import and leadership oversight. The remaining work is routine maintenance and QA, not setup.',
    readyCount,
    attentionCount,
    optionalCount,
    blockingCount,
    items,
    nextSteps,
  };
}
