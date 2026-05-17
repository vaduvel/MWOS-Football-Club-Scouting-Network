import { describe, expect, it } from 'vitest';

import {
  getInvitationStatusNotice,
  mapAcceptInvitationError,
  parseAcceptInvitationHash,
} from './acceptInvitationDomain';

describe('parseAcceptInvitationHash', () => {
  it('maps expired Supabase invite hashes to a friendly recovery message', () => {
    expect(
      parseAcceptInvitationHash(
        '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual(
      expect.objectContaining({
        tone: 'warning',
        title: 'Invitation link expired',
      }),
    );
  });

  it('returns null when the hash has no auth error payload', () => {
    expect(parseAcceptInvitationHash('#access_token=abc')).toBeNull();
  });
});

describe('getInvitationStatusNotice', () => {
  it('returns a ready-state message for pending invitations', () => {
    expect(getInvitationStatusNotice('pending')).toEqual(
      expect.objectContaining({
        tone: 'info',
        title: 'Invitation ready',
      }),
    );
  });

  it('returns a login-oriented message for completed invitations', () => {
    expect(getInvitationStatusNotice('accepted')).toEqual(
      expect.objectContaining({
        tone: 'success',
        ctaLabel: 'Open Login',
      }),
    );
    expect(getInvitationStatusNotice('applied_existing')).toEqual(
      expect.objectContaining({
        tone: 'success',
        ctaLabel: 'Open Login',
      }),
    );
  });
});

describe('mapAcceptInvitationError', () => {
  it('normalizes backend invitation errors into user-facing guidance', () => {
    expect(mapAcceptInvitationError('This invitation belongs to a different email address.')).toBe(
      'This invite belongs to a different email address. Open it using the invited account or ask an admin for a fresh link.',
    );
    expect(mapAcceptInvitationError('Invitation not found.')).toBe(
      'This invite could not be found. Ask an admin to generate a new activation link.',
    );
  });
});
