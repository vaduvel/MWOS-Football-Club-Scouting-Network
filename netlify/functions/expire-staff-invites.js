import { createServiceSupabaseClient, json, requireAdminUser } from './_shared.js';
import { flattenInvitationRoles, flattenInvitationTeams, logStaffAccessEvent } from './_staff-invitations.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const auth = await requireAdminUser(event);
  if (auth.error) {
    return auth.error;
  }

  try {
    const nowIso = new Date().toISOString();
    const serviceSupabase = createServiceSupabaseClient();
    const { data, error } = await serviceSupabase
      .from('staff_invitations')
      .select(`
        id,
        email,
        full_name,
        status,
        resolved_user_id,
        expires_at,
        staff_invitation_roles (
          role_id,
          roles (
            id,
            slug,
            label
          )
        ),
        staff_invitation_teams (
          team_id,
          teams (
            id,
            slug,
            name,
            is_active
          )
        )
      `)
      .eq('status', 'pending')
      .lt('expires_at', nowIso)
      .order('expires_at', { ascending: true });

    if (error) {
      throw error;
    }

    const staleInvitations = data || [];
    if (staleInvitations.length === 0) {
      return json(200, {
        ok: true,
        expiredCount: 0,
        message: 'No stale pending invitations needed cleanup.',
      });
    }

    const staleIds = staleInvitations.map((invitation) => invitation.id);
    const { error: updateError } = await serviceSupabase
      .from('staff_invitations')
      .update({ status: 'expired' })
      .in('id', staleIds);

    if (updateError) {
      throw updateError;
    }

    await Promise.all(
      staleInvitations.map((invitation) =>
        logStaffAccessEvent(serviceSupabase, {
          actorUserId: auth.user.id,
          actorName: auth.user.user_metadata?.name || auth.user.user_metadata?.full_name || '',
          actorEmail: auth.user.email || '',
          targetUserId: invitation.resolved_user_id || null,
          targetName: invitation.full_name,
          targetEmail: invitation.email,
          actionType: 'invite_expired',
          roles: flattenInvitationRoles(invitation),
          teams: flattenInvitationTeams(invitation),
        }),
      ),
    );

    return json(200, {
      ok: true,
      expiredCount: staleInvitations.length,
      message:
        staleInvitations.length === 1
          ? '1 stale invitation was moved out of the pending queue.'
          : `${staleInvitations.length} stale invitations were moved out of the pending queue.`,
    });
  } catch (error) {
    return json(500, {
      error: error.message || 'Failed to expire stale invitations.',
    });
  }
}
