export type InviteStatus = 'pending' | 'accepted' | 'cancelled' | 'expired' | 'applied_existing';
export type InviteDeliveryStatus = 'sent' | 'skipped' | 'failed';
export type InviteDeliveryMode = 'email' | 'manual_link' | 'whatsapp_share';

export type InviteDeliveryResult = {
  status: InviteDeliveryStatus;
  reason?: string;
};

const TEAM_SCOPED_ROLES = new Set(['coach', 'driver', 'scout']);

export function formatInviteDeliveryModeLabel(mode: InviteDeliveryMode) {
  switch (mode) {
    case 'manual_link':
      return 'share link';
    case 'whatsapp_share':
      return 'WhatsApp share';
    default:
      return 'email invite';
  }
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRoleSlug(roleSlug: string) {
  return roleSlug.trim().toLowerCase().replace(/\s+/g, '_');
}

export function roleRequiresTeam(roleSlug: string) {
  return TEAM_SCOPED_ROLES.has(normalizeRoleSlug(roleSlug));
}

export function normalizeInviteSelection(input: { roleSlugs: string[]; teamIds: string[] }) {
  return {
    roleSlugs: Array.from(
      new Set(
        input.roleSlugs
          .map(normalizeRoleSlug)
          .filter(Boolean),
      ),
    ),
    teamIds: Array.from(
      new Set(
        input.teamIds
          .map((teamId) => teamId.trim())
          .filter(Boolean),
      ),
    ),
  };
}

export function validateInviteInput(input: {
  fullName: string;
  email: string;
  roleSlugs: string[];
  teamIds: string[];
}) {
  const fullName = input.fullName.trim();
  const email = normalizeInviteEmail(input.email);
  const { roleSlugs, teamIds } = normalizeInviteSelection(input);

  if (!fullName) {
    throw new Error('Full name is required.');
  }

  if (!email) {
    throw new Error('Email is required.');
  }

  if (roleSlugs.length === 0) {
    throw new Error('Select at least one role.');
  }

  if (roleSlugs.some(roleRequiresTeam) && teamIds.length === 0) {
    throw new Error('Select at least one team for team-scoped staff.');
  }

  return {
    fullName,
    email,
    roleSlugs,
    teamIds,
  };
}

export function formatInvitationStatusLabel(status: InviteStatus) {
  switch (status) {
    case 'applied_existing':
      return 'Applied to Existing User';
    default:
      return status
        .split('_')
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ');
  }
}

export function buildInviteDeliveryNotice(input: {
  mode: 'new_user' | 'existing_user';
  delivery: InviteDeliveryResult;
  deliveryMode?: InviteDeliveryMode;
  hasActivationLink?: boolean;
}) {
  const modeLabel = input.mode === 'existing_user' ? 'existing user access' : 'new invite';
  const deliveryMode = input.deliveryMode || 'email';

  if (input.delivery.status === 'sent') {
    return {
      tone: 'success' as const,
      title: input.mode === 'existing_user' ? 'Access updated and email sent' : 'Invitation sent',
      message:
        input.mode === 'existing_user'
          ? 'The account was updated and the confirmation email was sent successfully.'
          : 'The invitation email was sent successfully.',
      canCopyLink: false,
    };
  }

  if (deliveryMode === 'manual_link' || deliveryMode === 'whatsapp_share') {
    return {
      tone: 'success' as const,
      title: input.mode === 'existing_user' ? 'Access updated — share login manually' : 'Share link ready',
      message:
        input.mode === 'existing_user'
          ? 'The account already exists and access is live. Share the login link manually so the staff member can sign in.'
          : deliveryMode === 'whatsapp_share'
            ? 'The activation link is ready. Share it on WhatsApp or copy it manually.'
            : 'The activation link is ready. Copy it or send it manually to the staff member.',
      canCopyLink: true,
    };
  }

  if (input.delivery.status === 'skipped') {
    return {
      tone: 'warning' as const,
      title: input.mode === 'existing_user' ? 'Access updated without email' : 'Invitation created without email',
      message: `${modeLabel} is ready, but email delivery is not configured. ${
        input.hasActivationLink ? 'Use the activation link below.' : 'You can continue manually from the admin workspace.'
      }`,
      canCopyLink: Boolean(input.hasActivationLink),
    };
  }

  return {
    tone: 'warning' as const,
    title: input.mode === 'existing_user' ? 'Access updated but email failed' : 'Invitation created but email failed',
    message: `${modeLabel} was saved, but the email provider returned an error${
      input.delivery.reason ? `: ${input.delivery.reason}` : '.'
    } ${input.hasActivationLink ? 'Use the activation link below.' : 'Retry or use a manual fallback.'}`,
    canCopyLink: Boolean(input.hasActivationLink),
  };
}

export function buildInviteShareText(input: {
  fullName: string;
  roleLabels: string[];
  teamNames: string[];
  shareUrl: string;
  existingUser?: boolean;
}) {
  const roleList = input.roleLabels.length > 0 ? input.roleLabels.join(', ') : 'Club staff';
  const teamList = input.teamNames.length > 0 ? input.teamNames.join(', ') : 'Club-wide';

  if (input.existingUser) {
    return [
      `Hi ${input.fullName}, your MWOS Club Management access is now active.`,
      `Roles: ${roleList}`,
      `Teams: ${teamList}`,
      `Open login: ${input.shareUrl}`,
    ].join('\n');
  }

  return [
    `Hi ${input.fullName}, you have been invited to MWOS Club Management.`,
    `Roles: ${roleList}`,
    `Teams: ${teamList}`,
    'Open this secure link to activate your access and set your password:',
    input.shareUrl,
  ].join('\n');
}

export function buildWhatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
