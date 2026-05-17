import type { InviteStatus } from './inviteDomain';

export type AcceptInvitationNotice = {
  tone: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  ctaLabel?: string;
};

function decodeHashValue(value: string | null) {
  return decodeURIComponent((value || '').replace(/\+/g, ' '));
}

export function parseAcceptInvitationHash(hash: string): AcceptInvitationNotice | null {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(normalizedHash);
  const errorCode = params.get('error_code');
  const description = decodeHashValue(params.get('error_description'));

  if (!params.get('error') && !errorCode) {
    return null;
  }

  if (errorCode === 'otp_expired') {
    return {
      tone: 'warning',
      title: 'Invitation link expired',
      message:
        'This activation link has expired or was already used on another device. Ask an admin to create a fresh activation link from Staff Accounts.',
      ctaLabel: 'Back to Login',
    };
  }

  return {
    tone: 'warning',
    title: 'Activation link could not be used',
    message: description || 'This invite link could not be validated. Ask an admin for a fresh activation link.',
    ctaLabel: 'Back to Login',
  };
}

export function getInvitationStatusNotice(status: InviteStatus): AcceptInvitationNotice {
  switch (status) {
    case 'accepted':
    case 'applied_existing':
      return {
        tone: 'success',
        title: 'Access already active',
        message: 'This invitation was already completed. Sign in with your password to enter the club workspace.',
        ctaLabel: 'Open Login',
      };
    case 'cancelled':
      return {
        tone: 'warning',
        title: 'Invitation cancelled',
        message: 'This invitation was cancelled by an admin. Ask for a new invite if you still need access.',
        ctaLabel: 'Back to Login',
      };
    case 'expired':
      return {
        tone: 'warning',
        title: 'Invitation expired',
        message: 'This invitation expired. Ask an admin to resend it or generate a fresh link.',
        ctaLabel: 'Back to Login',
      };
    default:
      return {
        tone: 'info',
        title: 'Invitation ready',
        message: 'Your club access is ready. Set a password below to activate this account on this device.',
      };
  }
}

export function mapAcceptInvitationError(message: string) {
  if (message.includes('different email address')) {
    return 'This invite belongs to a different email address. Open it using the invited account or ask an admin for a fresh link.';
  }

  if (message.includes('Invitation not found')) {
    return 'This invite could not be found. Ask an admin to generate a new activation link.';
  }

  if (message.includes('cancelled')) {
    return 'This invitation was cancelled by an admin. Ask for a new invite if you still need access.';
  }

  if (message.includes('expired')) {
    return 'This invitation has expired. Ask an admin for a fresh activation link.';
  }

  return message || 'Failed to load the invitation.';
}
