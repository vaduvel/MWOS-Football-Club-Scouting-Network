import { describe, expect, it } from 'vitest';

import {
  buildInviteDeliveryNotice,
  buildInviteShareText,
  buildWhatsAppShareUrl,
  formatInvitationStatusLabel,
  formatInviteDeliveryModeLabel,
  normalizeInviteEmail,
  normalizeInviteSelection,
  roleRequiresTeam,
  validateInviteInput,
} from './inviteDomain';

describe('normalizeInviteEmail', () => {
  it('trims and lowercases invite emails', () => {
    expect(normalizeInviteEmail('  Coach@One.COM ')).toBe('coach@one.com');
  });
});

describe('roleRequiresTeam', () => {
  it('requires teams for coach, driver, and scout roles', () => {
    expect(roleRequiresTeam('coach')).toBe(true);
    expect(roleRequiresTeam('driver')).toBe(true);
    expect(roleRequiresTeam('scout')).toBe(true);
    expect(roleRequiresTeam('admin')).toBe(false);
  });
});

describe('normalizeInviteSelection', () => {
  it('deduplicates roles and teams', () => {
    expect(
      normalizeInviteSelection({
        roleSlugs: ['coach', 'Coach', 'admin'],
        teamIds: ['team-1', 'team-1', 'team-2'],
      }),
    ).toEqual({
      roleSlugs: ['coach', 'admin'],
      teamIds: ['team-1', 'team-2'],
    });
  });
});

describe('validateInviteInput', () => {
  it('requires at least one role', () => {
    expect(() =>
      validateInviteInput({
        fullName: 'Coach One',
        email: 'coach@one.com',
        roleSlugs: [],
        teamIds: [],
      }),
    ).toThrow(/at least one role/i);
  });

  it('requires teams for coach invitations', () => {
    expect(() =>
      validateInviteInput({
        fullName: 'Coach One',
        email: 'coach@one.com',
        roleSlugs: ['coach'],
        teamIds: [],
      }),
    ).toThrow(/team/i);
  });

  it('returns normalized values for valid invites', () => {
    expect(
      validateInviteInput({
        fullName: '  Coach One  ',
        email: ' Coach@One.COM ',
        roleSlugs: ['coach', 'coach', 'admin'],
        teamIds: ['team-1', 'team-1'],
      }),
    ).toEqual({
      fullName: 'Coach One',
      email: 'coach@one.com',
      roleSlugs: ['coach', 'admin'],
      teamIds: ['team-1'],
    });
  });
});

describe('formatInvitationStatusLabel', () => {
  it('formats invitation statuses for display', () => {
    expect(formatInvitationStatusLabel('pending')).toBe('Pending');
    expect(formatInvitationStatusLabel('applied_existing')).toBe('Applied to Existing User');
  });
});

describe('formatInviteDeliveryModeLabel', () => {
  it('formats delivery modes for display', () => {
    expect(formatInviteDeliveryModeLabel('email')).toBe('email invite');
    expect(formatInviteDeliveryModeLabel('manual_link')).toBe('share link');
    expect(formatInviteDeliveryModeLabel('whatsapp_share')).toBe('WhatsApp share');
  });
});

describe('buildInviteDeliveryNotice', () => {
  it('formats a sent new-user invite outcome', () => {
    expect(
      buildInviteDeliveryNotice({
        mode: 'new_user',
        delivery: { status: 'sent' },
        deliveryMode: 'email',
      }),
    ).toMatchObject({
      tone: 'success',
      title: 'Invitation sent',
      canCopyLink: false,
    });
  });

  it('formats a skipped invite with activation-link fallback', () => {
    expect(
      buildInviteDeliveryNotice({
        mode: 'new_user',
        delivery: { status: 'skipped', reason: 'Email provider is not configured.' },
        deliveryMode: 'email',
        hasActivationLink: true,
      }),
    ).toMatchObject({
      tone: 'warning',
      title: 'Invitation created without email',
      canCopyLink: true,
    });
  });

  it('formats a failed existing-user email outcome', () => {
    expect(
      buildInviteDeliveryNotice({
        mode: 'existing_user',
        delivery: { status: 'failed', reason: 'sandbox restriction' },
        deliveryMode: 'email',
        hasActivationLink: false,
      }),
    ).toMatchObject({
      tone: 'warning',
      title: 'Access updated but email failed',
      canCopyLink: false,
    });
  });

  it('formats a manual share invite as a success-first flow', () => {
    expect(
      buildInviteDeliveryNotice({
        mode: 'new_user',
        delivery: { status: 'skipped', reason: 'Manual share selected.' },
        deliveryMode: 'manual_link',
        hasActivationLink: true,
      }),
    ).toMatchObject({
      tone: 'success',
      title: 'Share link ready',
      canCopyLink: true,
    });
  });
});

describe('buildInviteShareText', () => {
  it('builds share text for a new user invite', () => {
    expect(
      buildInviteShareText({
        fullName: 'Lloyd Mutasa',
        roleLabels: ['Coach'],
        teamNames: ['First Team'],
        shareUrl: 'https://example.com/accept',
      }),
    ).toContain('activate your access');
  });

  it('builds share text for an existing user access update', () => {
    expect(
      buildInviteShareText({
        fullName: 'Wonder Ngoko',
        roleLabels: ['Scout'],
        teamNames: ['U19'],
        shareUrl: 'https://example.com/login',
        existingUser: true,
      }),
    ).toContain('Open login');
  });
});

describe('buildWhatsAppShareUrl', () => {
  it('encodes the message into a wa.me share url', () => {
    expect(buildWhatsAppShareUrl('Hello MWOS')).toBe('https://wa.me/?text=Hello%20MWOS');
  });
});
