import { describe, expect, it, vi } from 'vitest';

vi.mock('../../netlify/functions/_shared.js', () => ({
  createServiceSupabaseClient: vi.fn(),
  getPublicAppUrl: () => 'https://scout-report-builder.netlify.app',
  getSupabaseUrl: () => 'https://xpswwuhdodzzdvrxypdj.supabase.co',
  normalizeEmail: (email: string) => String(email || '').trim().toLowerCase(),
  sendTransactionalEmail: vi.fn(),
}));

import {
  buildInviteLink,
  buildSupabaseInviteActionLink,
} from '../../netlify/functions/_staff-invitations.js';

describe('staff invitation action links', () => {
  it('returns the provided action link unchanged when one exists', () => {
    const actionLink =
      'https://xpswwuhdodzzdvrxypdj.supabase.co/auth/v1/verify?token=hash123&type=invite&redirect_to=https%3A%2F%2Fscout-report-builder.netlify.app%2Faccept-invite%3Finvitation%3Dabc';

    expect(buildInviteLink('abc', actionLink)).toBe(actionLink);
  });

  it('falls back to the plain accept-invite route when no action link exists', () => {
    expect(buildInviteLink('abc 123', '')).toBe(
      'https://scout-report-builder.netlify.app/accept-invite?invitation=abc%20123',
    );
  });

  it('rebuilds the Supabase verify link with the provided redirect', () => {
    const result = buildSupabaseInviteActionLink({
      hashedToken: 'hash123',
      redirectTo: 'https://scout-report-builder.netlify.app/accept-invite?invitation=token456',
    });

    expect(result).toBe(
      'https://xpswwuhdodzzdvrxypdj.supabase.co/auth/v1/verify?token=hash123&type=invite&redirect_to=https%3A%2F%2Fscout-report-builder.netlify.app%2Faccept-invite%3Finvitation%3Dtoken456',
    );
  });
});
