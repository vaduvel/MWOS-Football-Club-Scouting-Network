import { randomBytes } from 'node:crypto';
import {
  createServiceSupabaseClient,
  getPublicAppUrl,
  getSupabaseUrl,
  normalizeEmail,
  sendTransactionalEmail,
} from './_shared.js';

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getDisplayName(email, fallback = 'Club Staff') {
  if (fallback && String(fallback).trim()) {
    return String(fallback).trim();
  }

  if (!email) return 'Club Staff';
  return String(email).split('@')[0] || 'Club Staff';
}

export function generateInvitationToken() {
  return randomBytes(24).toString('hex');
}

export async function fetchExistingUserByEmail(serviceSupabase, email) {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await serviceSupabase
    .from('profiles')
    .select('id, email, name, organization')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function fetchRolesAndTeams(serviceSupabase, roleSlugs, teamIds) {
  const [rolesResponse, teamsResponse] = await Promise.all([
    roleSlugs.length > 0
      ? serviceSupabase.from('roles').select('id, slug, label').in('slug', roleSlugs)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? serviceSupabase.from('teams').select('id, slug, name, is_active').in('id', teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (rolesResponse.error) throw rolesResponse.error;
  if (teamsResponse.error) throw teamsResponse.error;

  const roles = rolesResponse.data || [];
  const teams = teamsResponse.data || [];

  if (roles.length !== roleSlugs.length) {
    throw new Error('One or more selected roles could not be matched.');
  }

  if (teams.length !== teamIds.length) {
    throw new Error('One or more selected teams could not be matched.');
  }

  return { roles, teams };
}

export async function applyUserAccess(serviceSupabase, userId, roles, teams) {
  if (roles.length > 0) {
    const { error: roleError } = await serviceSupabase.from('user_roles').upsert(
      roles.map((role) => ({
        user_id: userId,
        role_id: role.id,
      })),
      { onConflict: 'user_id,role_id' },
    );

    if (roleError) throw roleError;
  }

  if (teams.length > 0) {
    const { error: teamError } = await serviceSupabase.from('user_team_assignments').upsert(
      teams.map((team) => ({
        user_id: userId,
        team_id: team.id,
      })),
      { onConflict: 'user_id,team_id' },
    );

    if (teamError) throw teamError;
  }

  if (roles.length > 0) {
    const primaryLabel = roles[0]?.label || 'Pending';
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .update({ role: primaryLabel })
      .eq('id', userId);

    if (profileError) throw profileError;
  }
}

export async function logStaffAccessEvent(serviceSupabase, {
  actorUserId = null,
  actorName,
  actorEmail,
  targetUserId = null,
  targetName,
  targetEmail,
  actionType,
  roles = [],
  teams = [],
}) {
  const { error } = await serviceSupabase.from('staff_access_events').insert({
    actor_user_id: actorUserId,
    actor_name: getDisplayName(actorEmail, actorName),
    actor_email: actorEmail || '',
    target_user_id: targetUserId,
    target_name: getDisplayName(targetEmail, targetName),
    target_email: targetEmail,
    action_type: actionType,
    role_labels: roles.map((role) => role.label).filter(Boolean),
    team_names: teams.map((team) => team.name).filter(Boolean),
  });

  if (error) {
    console.warn('Failed to record staff access event.', error);
  }
}

export async function createInvitationRecord(serviceSupabase, {
  email,
  fullName,
  inviterUserId,
  status = 'pending',
  messageType = 'invite',
  resolvedUserId = null,
  invitationToken = generateInvitationToken(),
  roles = [],
  teams = [],
}) {
  const normalizedEmail = normalizeEmail(email);
  const nowIso = new Date().toISOString();

  const { data: invitation, error: invitationError } = await serviceSupabase
    .from('staff_invitations')
    .insert({
      email: email.trim(),
      email_normalized: normalizedEmail,
      full_name: fullName.trim(),
      status,
      invitation_token: invitationToken,
      inviter_user_id: inviterUserId,
      resolved_user_id: resolvedUserId,
      message_type: messageType,
      last_sent_at: nowIso,
      accepted_at: status === 'accepted' || status === 'applied_existing' ? nowIso : null,
    })
    .select('id, email, email_normalized, full_name, status, invitation_token, inviter_user_id, resolved_user_id, message_type, last_sent_at, accepted_at, cancelled_at, expires_at, created_at, updated_at')
    .single();

  if (invitationError) throw invitationError;

  if (roles.length > 0) {
    const { error: roleError } = await serviceSupabase.from('staff_invitation_roles').insert(
      roles.map((role) => ({
        invitation_id: invitation.id,
        role_id: role.id,
      })),
    );

    if (roleError) throw roleError;
  }

  if (teams.length > 0) {
    const { error: teamError } = await serviceSupabase.from('staff_invitation_teams').insert(
      teams.map((team) => ({
        invitation_id: invitation.id,
        team_id: team.id,
      })),
    );

    if (teamError) throw teamError;
  }

  return invitation;
}

export async function fetchInvitationById(serviceSupabase, invitationId) {
  const { data, error } = await serviceSupabase
    .from('staff_invitations')
    .select(`
      id,
      email,
      email_normalized,
      full_name,
      status,
      invitation_token,
      inviter_user_id,
      resolved_user_id,
      message_type,
      last_sent_at,
      accepted_at,
      cancelled_at,
      expires_at,
      created_at,
      updated_at,
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
    .eq('id', invitationId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function fetchInvitationByToken(serviceSupabase, invitationToken) {
  const { data, error } = await serviceSupabase
    .from('staff_invitations')
    .select(`
      id,
      email,
      email_normalized,
      full_name,
      status,
      invitation_token,
      inviter_user_id,
      resolved_user_id,
      message_type,
      last_sent_at,
      accepted_at,
      cancelled_at,
      expires_at,
      created_at,
      updated_at,
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
    .eq('invitation_token', invitationToken)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export function flattenInvitationRoles(invitation) {
  return unique(
    (invitation?.staff_invitation_roles || []).flatMap((row) => {
      const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
      return joined;
    }),
  );
}

export function flattenInvitationTeams(invitation) {
  return unique(
    (invitation?.staff_invitation_teams || []).flatMap((row) => {
      const joined = Array.isArray(row.teams) ? row.teams : row.teams ? [row.teams] : [];
      return joined;
    }),
  );
}

export function buildSupabaseInviteActionLink({ hashedToken, redirectTo }) {
  const supabaseUrl = getSupabaseUrl().replace(/\/$/, '');
  if (!supabaseUrl || !hashedToken || !redirectTo) {
    return '';
  }

  const query = new URLSearchParams({
    token: hashedToken,
    type: 'invite',
    redirect_to: redirectTo,
  });

  return `${supabaseUrl}/auth/v1/verify?${query.toString()}`;
}

export function buildInviteLink(invitationToken, actionLink, publicAppUrl = getPublicAppUrl()) {
  const publicUrl = publicAppUrl || getPublicAppUrl();
  const acceptPath = `${publicUrl}/accept-invite?invitation=${encodeURIComponent(invitationToken)}`;

  if (!actionLink) {
    return acceptPath;
  }

  return actionLink;
}

function buildInvitationEmailHtml({ heading, intro, fullName, roleLabels, teamNames, actionHref, actionLabel }) {
  const roleList = roleLabels.length > 0 ? roleLabels.join(', ') : 'Club staff';
  const teamList = teamNames.length > 0 ? teamNames.join(', ') : 'Club-wide';

  return `
    <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe3f0;">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#7b88a8;font-weight:700;">MWOS Club Management</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#222745;">${heading}</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#55627d;">${intro}</p>
        <div style="margin:0 0 24px;padding:18px 20px;border-radius:16px;background:#f7f8fe;border:1px solid #dbe3f0;">
          <p style="margin:0 0 10px;font-size:14px;color:#222745;"><strong>Name:</strong> ${fullName}</p>
          <p style="margin:0 0 10px;font-size:14px;color:#222745;"><strong>Roles:</strong> ${roleList}</p>
          <p style="margin:0;font-size:14px;color:#222745;"><strong>Teams:</strong> ${teamList}</p>
        </div>
        ${
          actionHref
            ? `<a href="${actionHref}" style="display:inline-block;background:#312783;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:14px;font-weight:700;">${actionLabel}</a>`
            : ''
        }
      </div>
    </div>
  `;
}

export async function sendInviteEmail({ email, fullName, roles, teams, invitationToken, actionLink, publicAppUrl }) {
  const html = buildInvitationEmailHtml({
    heading: 'You have been invited to MWOS Club Management',
    intro: 'Open the invitation to set your password and activate your club access.',
    fullName,
    roleLabels: roles.map((role) => role.label),
    teamNames: teams.map((team) => team.name),
    actionHref: buildInviteLink(invitationToken, actionLink, publicAppUrl),
    actionLabel: 'Activate Account',
  });

  return sendTransactionalEmail({
    to: email,
    subject: 'Activate your MWOS Club Management access',
    html,
  });
}

export async function attemptEmailDelivery(sendOperation) {
  try {
    const result = await sendOperation();
    if (result?.skipped) {
      return {
        status: 'skipped',
        reason: result.reason || 'Email provider is not configured.',
      };
    }

    return {
      status: 'sent',
      reason: '',
    };
  } catch (error) {
    return {
      status: 'failed',
      reason: error?.message || 'Email delivery failed.',
    };
  }
}

export async function sendExistingUserAccessEmail({ email, fullName, roles, teams, publicAppUrl }) {
  const publicUrl = publicAppUrl || getPublicAppUrl();
  const html = buildInvitationEmailHtml({
    heading: 'Your MWOS Club Management access was updated',
    intro: 'Your club access is ready. Sign in to see the new modules and teams assigned to you.',
    fullName,
    roleLabels: roles.map((role) => role.label),
    teamNames: teams.map((team) => team.name),
    actionHref: publicUrl ? `${publicUrl}/login` : '',
    actionLabel: 'Open Login',
  });

  return sendTransactionalEmail({
    to: email,
    subject: 'Your MWOS Club Management access was updated',
    html,
  });
}

export async function sendResentInviteEmail({ email, fullName, roles, teams, invitationToken, actionLink, publicAppUrl }) {
  const html = buildInvitationEmailHtml({
    heading: 'Your invitation was re-sent',
    intro: 'Use the link below to finish setting up your MWOS Club Management access.',
    fullName,
    roleLabels: roles.map((role) => role.label),
    teamNames: teams.map((team) => team.name),
    actionHref: buildInviteLink(invitationToken, actionLink, publicAppUrl),
    actionLabel: 'Finish Setup',
  });

  return sendTransactionalEmail({
    to: email,
    subject: 'MWOS Club Management invitation reminder',
    html,
  });
}

export async function generateInviteActionLink({ email, fullName, invitationToken, publicAppUrl }) {
  const serviceSupabase = createServiceSupabaseClient();
  const resolvedPublicAppUrl = publicAppUrl || getPublicAppUrl();
  const redirectTo = `${resolvedPublicAppUrl}/accept-invite?invitation=${encodeURIComponent(invitationToken)}`;
  const { data, error } = await serviceSupabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: {
        name: fullName,
      },
    },
  });

  if (error) {
    throw error;
  }

  const hashedToken = data?.properties?.hashed_token || '';
  const rebuiltActionLink = buildSupabaseInviteActionLink({
    hashedToken,
    redirectTo,
  });

  return {
    actionLink: rebuiltActionLink || data?.properties?.action_link || redirectTo,
    authUserId: data?.user?.id || null,
  };
}
