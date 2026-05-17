import { describe, expect, it } from 'vitest';
import { buildLaunchReadiness } from './settingsReadinessDomain';

describe('buildLaunchReadiness', () => {
  it('marks the app ready for live use when public URL, email delivery, team import and AI are configured', () => {
    const result = buildLaunchReadiness({
      publicAppUrl: 'https://scout-report-builder.netlify.app',
      footballApiProvider: 'api-football',
      footballApiKey: 'live-key',
      adminAiStatus: {
        configured: true,
        provider: 'Gemini',
        model: 'gemini-2.5-flash',
        configuredEnvVar: 'GEMINI_API_KEY',
        acceptedEnvVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
        setupHint: 'Configured.',
      },
      adminEmailStatus: {
        configured: true,
        sender: 'MWOS Club Management <notifications@mwosfchub.com>',
        replyTo: null,
        publicAppUrl: 'https://scout-report-builder.netlify.app',
        deliveryMode: 'transactional_email',
        setupHint: 'Ready.',
      },
    });

    expect(result.headline).toBe('Ready for live use');
    expect(result.blockingCount).toBe(0);
    expect(result.attentionCount).toBe(0);
    expect(result.readyCount).toBe(4);
  });

  it('marks the app as ready with fallbacks when email delivery is manual and AI is optional', () => {
    const result = buildLaunchReadiness({
      publicAppUrl: 'https://scout-report-builder.netlify.app',
      footballApiProvider: 'api-football',
      footballApiKey: '',
      adminAiStatus: {
        configured: false,
        provider: 'Gemini',
        model: 'gemini-2.5-flash',
        configuredEnvVar: null,
        acceptedEnvVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
        setupHint: 'Needs setup.',
      },
      adminEmailStatus: {
        configured: false,
        sender: null,
        replyTo: null,
        publicAppUrl: 'https://scout-report-builder.netlify.app',
        deliveryMode: 'manual_link_fallback',
        setupHint: 'Use manual links.',
      },
    });

    expect(result.headline).toBe('Ready for live use with operational fallbacks');
    expect(result.blockingCount).toBe(0);
    expect(result.attentionCount).toBe(2);
    expect(result.optionalCount).toBe(1);
  });

  it('blocks launch readiness when the public app URL is local', () => {
    const result = buildLaunchReadiness({
      publicAppUrl: 'http://127.0.0.1:3005',
      footballApiProvider: 'none',
      footballApiKey: '',
      adminAiStatus: null,
      adminEmailStatus: null,
    });

    expect(result.headline).toBe('Needs one more setup pass before wide launch');
    expect(result.blockingCount).toBe(1);
    expect(result.items.find((item) => item.id === 'public_access')?.blocking).toBe(true);
  });
});
