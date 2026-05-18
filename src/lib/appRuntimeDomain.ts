import type { AdminAppRuntimeStatus } from './data';

export type AppRuntimeSummaryTone = 'ready' | 'attention';

export interface AppRuntimeSummary {
  tone: AppRuntimeSummaryTone;
  headline: string;
  detail: string;
}

export function formatRuntimeContextLabel(context: string | null | undefined) {
  switch (String(context || '').trim().toLowerCase()) {
    case 'production':
      return 'Production';
    case 'branch-deploy':
      return 'Branch Preview';
    case 'deploy-preview':
      return 'Deploy Preview';
    case 'local':
      return 'Local Dev';
    default:
      return 'Unknown';
  }
}

export function buildAppRuntimeSummary(status: AdminAppRuntimeStatus | null): AppRuntimeSummary {
  if (!status) {
    return {
      tone: 'attention',
      headline: 'Runtime status unavailable',
      detail: 'The app could not read its current deployment context, branch or public URL yet.',
    };
  }

  if (!status.publicAppUrl) {
    return {
      tone: 'attention',
      headline: 'Public app URL is missing',
      detail: 'Invite and reset flows need a configured public app URL before wide rollout.',
    };
  }

  if (status.context === 'local') {
    return {
      tone: 'attention',
      headline: 'Local runtime is fine for dev, not final launch',
      detail:
        'This environment is still local. Use the Netlify branch or production build when validating invite and password-reset links.',
    };
  }

  if (
    (status.context === 'branch-deploy' || status.context === 'deploy-preview') &&
    status.recommendedPublicUrl &&
    !status.matchesRecommendedPublicUrl
  ) {
    return {
      tone: 'attention',
      headline: 'Preview links still point elsewhere',
      detail:
        'This preview build is running, but onboarding links still target a different public URL. Align the public app URL with the preview before testing invite or reset flows here.',
    };
  }

  if (status.context === 'production' && status.siteUrl && status.publicAppUrl !== status.siteUrl) {
    return {
      tone: 'attention',
      headline: 'Production URL mismatch',
      detail:
        'The production site is live, but the configured public app URL does not match the deployed site URL. Align them before broad staff rollout.',
    };
  }

  return {
    tone: 'ready',
    headline: 'Runtime URL alignment looks good',
    detail: status.setupHint,
  };
}
