import { createServiceSupabaseClient, json, requireAdminUser } from './_shared.js';
import { fetchInvitationById, generateInviteActionLink } from './_staff-invitations.js';

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
      return json(400, { error: 'Only pending invitations can generate a fresh activation link.' });
    }

    const { actionLink } = await generateInviteActionLink({
      email: invitation.email,
      fullName: invitation.full_name,
      invitationToken: invitation.invitation_token,
    });

    return json(200, {
      ok: true,
      activationLink: actionLink,
      message: 'Activation link ready to copy.',
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to generate activation link.' });
  }
}
