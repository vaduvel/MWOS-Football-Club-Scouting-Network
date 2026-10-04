import { createServiceSupabaseClient, getPublicAppUrl, json, requireAdminUser } from './_shared.js';
import { fetchInvitationById, generateInviteActionLink, getInvitationAuthLinkType } from './_staff-invitations.js';

const INVITATION_EXPIRY_DAYS = 7;

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
    const publicAppUrl = getPublicAppUrl(event);
    const serviceSupabase = createServiceSupabaseClient();
    const invitation = await fetchInvitationById(serviceSupabase, invitationId);

    if (!invitation) {
      return json(404, { error: 'Invitation not found.' });
    }

    if (!['pending', 'expired'].includes(invitation.status)) {
      return json(400, { error: 'Only pending or expired invitations can generate a fresh activation link.' });
    }

    const authLinkType = await getInvitationAuthLinkType(serviceSupabase, invitation);
    const { actionLink } = await generateInviteActionLink({
      email: invitation.email,
      fullName: invitation.full_name,
      invitationToken: invitation.invitation_token,
      publicAppUrl,
      authLinkType,
    });

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await serviceSupabase
      .from('staff_invitations')
      .update({ last_sent_at: nowIso, expires_at: expiresAt, status: 'pending' })
      .eq('id', invitation.id);
    if (updateError) throw updateError;

    return json(200, {
      ok: true,
      activationLink: actionLink,
      message: 'Activation link ready to copy.',
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to generate activation link.' });
  }
}
