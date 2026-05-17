export type StaffAccessEventAction =
  | 'access_updated'
  | 'access_revoked'
  | 'invite_created'
  | 'invite_resent'
  | 'invite_cancelled'
  | 'invite_expired'
  | 'invite_applied_existing'
  | 'invite_accepted';

export interface StaffingHealthCard {
  label: string;
  value: string;
  detail: string;
}

export function buildStaffAccessEventSummary(input: {
  actionType: StaffAccessEventAction;
  roleLabels: string[];
  teamNames: string[];
}) {
  const roleText = input.roleLabels.length > 0 ? `Roles: ${input.roleLabels.join(', ')}` : '';
  const teamText = input.teamNames.length > 0 ? `Teams: ${input.teamNames.join(', ')}` : '';
  const scopeText = [roleText, teamText].filter(Boolean).join(' · ');

  switch (input.actionType) {
    case 'access_revoked':
      return {
        title: 'Club access revoked',
        detail: 'All club roles and team assignments were removed.',
        tone: 'warning' as const,
      };
    case 'invite_cancelled':
      return {
        title: 'Invitation cancelled',
        detail: scopeText || 'The pending invite was cancelled before activation.',
        tone: 'warning' as const,
      };
    case 'invite_expired':
      return {
        title: 'Invitation expired',
        detail: scopeText || 'The invite passed its activation window and was moved out of the pending queue.',
        tone: 'warning' as const,
      };
    case 'invite_created':
      return {
        title: 'Invitation created',
        detail: scopeText || 'A new staff invitation is waiting for activation.',
        tone: 'info' as const,
      };
    case 'invite_resent':
      return {
        title: 'Invitation re-sent',
        detail: scopeText || 'A fresh activation link was generated for this staff member.',
        tone: 'info' as const,
      };
    case 'invite_applied_existing':
      return {
        title: 'Existing account updated',
        detail: scopeText || 'An existing club account received updated access.',
        tone: 'success' as const,
      };
    case 'invite_accepted':
      return {
        title: 'Invitation accepted',
        detail: scopeText || 'The invited staff member finished account activation.',
        tone: 'success' as const,
      };
    default:
      return {
        title: 'Club access updated',
        detail: scopeText || 'Roles or team assignments were updated.',
        tone: 'success' as const,
      };
  }
}

export function buildStaffingHealthCards(input: {
  unassignedStaffAccounts: number;
  multiTeamStaff: number;
  pendingInvitations: number;
  recentAccessChanges: number | null;
}): StaffingHealthCard[] {
  const cards: StaffingHealthCard[] = [
    {
      label: 'Unassigned accounts',
      value: String(input.unassignedStaffAccounts),
      detail: 'Authentication users who still need club roles or team assignments.',
    },
    {
      label: 'Multi-team staff',
      value: String(input.multiTeamStaff),
      detail: 'People currently supporting more than one team in the club workspace.',
    },
    {
      label: 'Pending invites',
      value: String(input.pendingInvitations),
      detail: 'Staff invitations still waiting for activation or follow-up.',
    },
  ];

  if (input.recentAccessChanges !== null) {
    cards.push({
      label: 'Recent access changes',
      value: String(input.recentAccessChanges),
      detail: 'Role or invite updates recorded in the last 7 days.',
    });
  }

  return cards;
}
