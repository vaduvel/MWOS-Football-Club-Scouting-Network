import { requireAdminUser, json, createServiceSupabaseClient } from './_shared.js';
import { fetchInvitationById, flattenInvitationRoles, flattenInvitationTeams, logStaffAccessEvent } from './_staff-invitations.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAdminUser(event);
  if (auth.error) {
    return auth.error;
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const invitationId = String(payload.invitationId || '').trim();
  if (!invitationId) {
    return json(400, { error: 'Invitation id is required.' });
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const invitation = await fetchInvitationById(serviceSupabase, invitationId);

    if (!invitation) {
      return json(404, { error: 'Invitation not found.' });
    }

    if (invitation.status !== 'pending') {
      return json(400, { error: 'Only pending invitations can be cancelled.' });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await serviceSupabase
      .from('staff_invitations')
      .update({
        status: 'cancelled',
        cancelled_at: nowIso,
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    await logStaffAccessEvent(serviceSupabase, {
      actorUserId: auth.user.id,
      actorName: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || '',
      actorEmail: auth.user.email || '',
      targetUserId: invitation.resolved_user_id || null,
      targetName: invitation.full_name,
      targetEmail: invitation.email,
      actionType: 'invite_cancelled',
      roles: flattenInvitationRoles(invitation),
      teams: flattenInvitationTeams(invitation),
    });

    return json(200, { ok: true, message: 'Invitation cancelled.' });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to cancel invitation.' });
  }
}
