import { requireAuthenticatedUser, json, createServiceSupabaseClient, normalizeEmail } from './_shared.js';
import {
  applyUserAccess,
  fetchInvitationByToken,
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

  if (!invitationToken) {
    return json(400, { error: 'Invitation token is required.' });
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const invitation = await fetchInvitationByToken(serviceSupabase, invitationToken);

    if (!invitation) {
      return json(404, { error: 'Invitation not found.' });
    }

    if (invitation.status === 'cancelled') {
      return json(400, { error: 'This invitation was cancelled.' });
    }

    if (invitation.status === 'expired') {
      return json(400, { error: 'This invitation expired.' });
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      await serviceSupabase.from('staff_invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return json(400, { error: 'This invitation expired.' });
    }

    const currentEmail = normalizeEmail(auth.user.email || '');
    if (currentEmail !== invitation.email_normalized) {
      return json(403, { error: 'This invitation belongs to a different email address.' });
    }

    const roles = flattenInvitationRoles(invitation);
    const teams = flattenInvitationTeams(invitation);

    if (event.httpMethod === 'GET') {
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

    if (invitation.status === 'accepted' || invitation.status === 'applied_existing') {
      return json(200, { ok: true, message: 'Invitation was already accepted.' });
    }

    await applyUserAccess(serviceSupabase, auth.user.id, roles, teams);

    const nowIso = new Date().toISOString();
    const { error: updateError } = await serviceSupabase
      .from('staff_invitations')
      .update({
        status: 'accepted',
        resolved_user_id: auth.user.id,
        accepted_at: nowIso,
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    await logStaffAccessEvent(serviceSupabase, {
      actorUserId: auth.user.id,
      actorName: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || invitation.full_name,
      actorEmail: auth.user.email || invitation.email,
      targetUserId: auth.user.id,
      targetName: invitation.full_name,
      targetEmail: invitation.email,
      actionType: 'invite_accepted',
      roles,
      teams,
    });

    return json(200, { ok: true, message: 'Invitation accepted.', roles: roles.map((role) => role.slug) });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to accept invitation.' });
  }
}
