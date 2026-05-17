import { requireAdminUser, json, createServiceSupabaseClient } from './_shared.js';
import {
  attemptEmailDelivery,
  fetchInvitationById,
  flattenInvitationRoles,
  flattenInvitationTeams,
  generateInviteActionLink,
  logStaffAccessEvent,
  sendResentInviteEmail,
} from './_staff-invitations.js';

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
      return json(400, { error: 'Only pending invitations can be resent.' });
    }

    const roles = flattenInvitationRoles(invitation);
    const teams = flattenInvitationTeams(invitation);
    const { actionLink } = await generateInviteActionLink({
      email: invitation.email,
      fullName: invitation.full_name,
      invitationToken: invitation.invitation_token,
    });

    const nowIso = new Date().toISOString();
    const { error: updateError } = await serviceSupabase
      .from('staff_invitations')
      .update({ last_sent_at: nowIso })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    const delivery = await attemptEmailDelivery(() =>
      sendResentInviteEmail({
        email: invitation.email,
        fullName: invitation.full_name,
        roles,
        teams,
        invitationToken: invitation.invitation_token,
        actionLink,
      }),
    );

    await logStaffAccessEvent(serviceSupabase, {
      actorUserId: auth.user.id,
      actorName: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || '',
      actorEmail: auth.user.email || '',
      targetUserId: invitation.resolved_user_id || null,
      targetName: invitation.full_name,
      targetEmail: invitation.email,
      actionType: 'invite_resent',
      roles,
      teams,
    });

    return json(200, {
      ok: true,
      message: delivery.status === 'sent' ? 'Invitation resent.' : 'Fresh activation link prepared.',
      delivery,
      ...(delivery.status !== 'sent' ? { activationLink: actionLink } : {}),
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to resend invitation.' });
  }
}
