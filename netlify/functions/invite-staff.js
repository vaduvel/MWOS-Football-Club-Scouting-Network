import { requireAdminUser, json, createServiceSupabaseClient, getPublicAppUrl } from './_shared.js';
import {
  attemptEmailDelivery,
  applyUserAccess,
  createInvitationRecord,
  fetchExistingUserByEmail,
  fetchRolesAndTeams,
  generateInviteActionLink,
  logStaffAccessEvent,
  sendExistingUserAccessEmail,
  sendInviteEmail,
} from './_staff-invitations.js';

function badRequest(message) {
  return json(400, { error: message });
}

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
    return badRequest('Invalid JSON payload.');
  }

  const fullName = String(payload.fullName || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const roleSlugs = Array.isArray(payload.roleSlugs) ? payload.roleSlugs.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean) : [];
  const teamIds = Array.isArray(payload.teamIds) ? payload.teamIds.map((item) => String(item || '').trim()).filter(Boolean) : [];
  const deliveryMode = ['manual_link', 'whatsapp_share', 'email'].includes(String(payload.deliveryMode || ''))
    ? String(payload.deliveryMode)
    : 'email';

  if (!fullName) return badRequest('Full name is required.');
  if (!email) return badRequest('Email is required.');
  if (roleSlugs.length === 0) return badRequest('Select at least one role.');

  try {
    const publicAppUrl = getPublicAppUrl(event);
    const serviceSupabase = createServiceSupabaseClient();
    const { roles, teams } = await fetchRolesAndTeams(serviceSupabase, Array.from(new Set(roleSlugs)), Array.from(new Set(teamIds)));
    const existingUser = await fetchExistingUserByEmail(serviceSupabase, email);

    if (existingUser) {
      await applyUserAccess(serviceSupabase, existingUser.id, roles, teams);
      const invitation = await createInvitationRecord(serviceSupabase, {
        email,
        fullName,
        inviterUserId: auth.user.id,
        status: 'applied_existing',
        messageType: 'existing_access_update',
        resolvedUserId: existingUser.id,
        roles,
        teams,
      });
      await logStaffAccessEvent(serviceSupabase, {
        actorUserId: auth.user.id,
        actorName: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || '',
        actorEmail: auth.user.email || '',
        targetUserId: existingUser.id,
        targetName: existingUser.name || fullName,
        targetEmail: email,
        actionType: 'invite_applied_existing',
        roles,
        teams,
      });

      const delivery =
        deliveryMode === 'email'
          ? await attemptEmailDelivery(() =>
              sendExistingUserAccessEmail({
                email,
                fullName,
                roles,
                teams,
                publicAppUrl,
              }),
            )
          : {
              status: 'skipped',
              reason: 'Manual share selected.',
            };

      return json(200, {
        ok: true,
        mode: 'existing_user',
        invitationId: invitation.id,
        message: 'Existing user access updated successfully.',
        delivery,
        deliveryMode,
        ...(deliveryMode !== 'email' ? { shareLink: `${publicAppUrl}/login` } : {}),
      });
    }

    const invitation = await createInvitationRecord(serviceSupabase, {
      email,
      fullName,
      inviterUserId: auth.user.id,
      roles,
      teams,
    });

    const { actionLink, authUserId } = await generateInviteActionLink({
      email,
      fullName,
      invitationToken: invitation.invitation_token,
      publicAppUrl,
    });

    if (authUserId) {
      await serviceSupabase
        .from('staff_invitations')
        .update({ resolved_user_id: authUserId })
        .eq('id', invitation.id);
    }

    await logStaffAccessEvent(serviceSupabase, {
      actorUserId: auth.user.id,
      actorName: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || '',
      actorEmail: auth.user.email || '',
      targetUserId: authUserId,
      targetName: fullName,
      targetEmail: email,
      actionType: 'invite_created',
      roles,
      teams,
    });

    const delivery =
      deliveryMode === 'email'
        ? await attemptEmailDelivery(() =>
            sendInviteEmail({
              email,
              fullName,
              roles,
              teams,
              invitationToken: invitation.invitation_token,
              actionLink,
              publicAppUrl,
            }),
          )
        : {
            status: 'skipped',
            reason: 'Manual share selected.',
          };

    return json(200, {
      ok: true,
      mode: 'new_user',
      invitationId: invitation.id,
      message: delivery.status === 'sent' ? 'Invitation sent successfully.' : 'Invitation created successfully.',
      delivery,
      deliveryMode,
      ...(delivery.status !== 'sent' || deliveryMode !== 'email' ? { activationLink: actionLink, shareLink: actionLink } : {}),
    });
  } catch (error) {
    return json(500, { error: error.message || 'Failed to invite staff.' });
  }
}
