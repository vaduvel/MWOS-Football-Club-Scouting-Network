import { describe, expect, it } from 'vitest';
import { buildAppRuntimeSummary, formatRuntimeContextLabel } from './appRuntimeDomain';

describe('formatRuntimeContextLabel', () => {
  it('maps known runtime contexts to readable labels', () => {
    expect(formatRuntimeContextLabel('production')).toBe('Production');
    expect(formatRuntimeContextLabel('branch-deploy')).toBe('Branch Preview');
    expect(formatRuntimeContextLabel('deploy-preview')).toBe('Deploy Preview');
    expect(formatRuntimeContextLabel('local')).toBe('Local Dev');
    expect(formatRuntimeContextLabel('weird')).toBe('Unknown');
  });
});

describe('buildAppRuntimeSummary', () => {
  it('flags missing public URLs', () => {
    const result = buildAppRuntimeSummary({
      context: 'production',
      branch: 'main',
      commitRef: 'abc',
      siteUrl: 'https://scout-report-builder.netlify.app',
      deployPrimeUrl: null,
      publicAppUrl: null,
      recommendedPublicUrl: 'https://scout-report-builder.netlify.app',
      releaseBranch: 'feat/club-management',
      branchMatchesRelease: false,
      matchesRecommendedPublicUrl: false,
      setupHint: 'Missing.',
    });

    expect(result.tone).toBe('attention');
    expect(result.headline).toBe('Public app URL is missing');
  });

  it('flags preview deployments that still point links elsewhere', () => {
    const result = buildAppRuntimeSummary({
      context: 'branch-deploy',
      branch: 'feat/club-management',
      commitRef: 'abc',
      siteUrl: 'https://scout-report-builder.netlify.app',
      deployPrimeUrl: 'https://preview.netlify.app',
      publicAppUrl: 'https://scout-report-builder.netlify.app',
      recommendedPublicUrl: 'https://preview.netlify.app',
      releaseBranch: 'feat/club-management',
      branchMatchesRelease: true,
      matchesRecommendedPublicUrl: false,
      setupHint: 'Preview mismatch.',
    });

    expect(result.tone).toBe('attention');
    expect(result.headline).toBe('Preview links still point elsewhere');
  });

  it('marks aligned production/runtime as ready', () => {
    const result = buildAppRuntimeSummary({
      context: 'production',
      branch: 'main',
      commitRef: 'abc',
      siteUrl: 'https://scout-report-builder.netlify.app',
      deployPrimeUrl: null,
      publicAppUrl: 'https://scout-report-builder.netlify.app',
      recommendedPublicUrl: 'https://scout-report-builder.netlify.app',
      releaseBranch: 'feat/club-management',
      branchMatchesRelease: false,
      matchesRecommendedPublicUrl: true,
      setupHint: 'Runtime URL alignment looks good for this deployment.',
    });

    expect(result.tone).toBe('ready');
    expect(result.headline).toBe('Runtime URL alignment looks good');
  });
});
