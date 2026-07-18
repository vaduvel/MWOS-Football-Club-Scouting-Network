import { requireAuthenticatedUser, json, createServiceSupabaseClient, normalizeEmail } from './_shared.js';
import {
  completeUserInvitations,
  fetchInvitationByToken,
  fetchPendingInvitationsByEmail,
  flattenInvitationRoles,
  flattenInvitationTeams,
  logStaffAccessEvent,
} from './_staff-invitations.js';

export async function handler(event) {
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAuthenticatedUser(event);
  if (auth.error) {
    return auth.error;
  }

  const invitationToken = event.httpMethod === 'GET'
    ? String(event.queryStringParameters?.invitation || '').trim()
    : (() => {
        try {
          const payload = JSON.parse(event.body || '{}');
          return String(payload.invitationToken || '').trim();
        } catch {
          return '';
        }
      })();

  if (event.httpMethod === 'GET' && !invitationToken) {
    return json(400, { error: 'Invitation token is required.' });
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const currentEmail = normalizeEmail(auth.user.email || '');
    const invitation = invitationToken
      ? await fetchInvitationByToken(serviceSupabase, invitationToken)
      : null;

    if (invitationToken && !invitation) {
      return json(404, { error: 'Invitation not found.' });
    }

    if (invitation?.status === 'cancelled') {
      return json(400, { error: 'This invitation was cancelled.' });
    }

    if (invitation?.status === 'expired') {
      return json(400, { error: 'This invitation expired.' });
    }

    if (invitation && new Date(invitation.expires_at) <= new Date()) {
      await serviceSupabase.from('staff_invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return json(400, { error: 'This invitation expired.' });
    }

    if (invitation && currentEmail !== invitation.email_normalized) {
      return json(403, { error: 'This invitation belongs to a different email address.' });
    }

    if (event.httpMethod === 'GET') {
      const roles = flattenInvitationRoles(invitation);
      const teams = flattenInvitationTeams(invitation);
      return json(200, {
        ok: true,
        invitation: {
          invitationToken,
          email: invitation.email,
          fullName: invitation.full_name,
          status: invitation.status,
          statusLabel:
            invitation.status === 'applied_existing'
              ? 'Applied to Existing User'
              : invitation.status
                  .split('_')
                  .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
                  .join(' '),
          roles: roles.map((role) => ({
            slug: role.slug,
            label: role.label,
          })),
          teams: teams.map((team) => ({
            id: team.id,
            slug: team.slug,
            name: team.name,
            is_active: Boolean(team.is_active),
          })),
          expiresAt: invitation.expires_at,
        },
      });
    }

    if (invitation?.status === 'accepted' || invitation?.status === 'applied_existing') {
      return json(200, {
        ok: true,
        message: 'Invitation was already accepted.',
        completedCount: 0,
        roles: flattenInvitationRoles(invitation).map((role) => role.slug),
      });
    }

    const candidateInvitations = invitation
      ? [invitation]
      : await fetchPendingInvitationsByEmail(serviceSupabase, currentEmail);
    const now = new Date();
    const expiredInvitations = candidateInvitations.filter(
      (candidate) => new Date(candidate.expires_at) <= now,
    );
    const activeInvitations = candidateInvitations.filter(
      (candidate) => new Date(candidate.expires_at) > now,
    );

    if (expiredInvitations.length > 0) {
      const { error: expireError } = await serviceSupabase
        .from('staff_invitations')
        .update({ status: 'expired' })
        .in('id', expiredInvitations.map((candidate) => candidate.id))
        .eq('status', 'pending');
      if (expireError) throw expireError;
    }

    if (activeInvitations.length === 0) {
      return json(200, {
        ok: true,
        message: 'No active pending invitation was found for this account.',
        completedCount: 0,
        roles: [],
      });
    }

    const completion = await completeUserInvitations(serviceSupabase, {
      userId: auth.user.id,
      email: currentEmail,
      invitationToken,
      invitations: activeInvitations,
    });

    if (completion.completedCount > 0) {
      await Promise.all(
        activeInvitations.map((completedInvitation) =>
          logStaffAccessEvent(serviceSupabase, {
            actorUserId: auth.user.id,
            actorName:
              auth.user.user_metadata?.name ||
              auth.user.user_metadata?.full_name ||
              completedInvitation.full_name,
            actorEmail: auth.user.email || completedInvitation.email,
            targetUserId: auth.user.id,
            targetName: completedInvitation.full_name,
            targetEmail: completedInvitation.email,
            actionType: 'invite_accepted',
            roles: completion.roles,
            teams: completion.teams,
          }),
        ),
      );
    }

    return json(200, {
      ok: true,
      message:
        completion.completedCount > 0
          ? 'Invitation access activated.'
          : 'Invitation access was already active.',
      completedCount: completion.completedCount,
      roles: completion.roles.map((role) => role.slug),
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to accept invitation.' });
  }
}
