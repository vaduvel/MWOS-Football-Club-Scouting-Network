import { createClient } from '@supabase/supabase-js';

const TRAINING_ROLES = ['admin', 'technical_director', 'coach'];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

export function createServiceSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration for notification functions.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeRoleSlug(value) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function getPublicAppUrl() {
  return (
    getOptionalEnv('APP_BASE_URL', 'VITE_APP_URL', 'URL', 'DEPLOY_PRIME_URL').replace(/\/$/, '') || ''
  );
}

function getEmailPreferenceField(type) {
  switch (type) {
    case 'training_plan_published':
      return 'email_training_plan_published';
    case 'training_td_comment':
      return 'email_training_td_comment';
    case 'training_session_reminder':
      return 'email_training_reminder';
    case 'training_schedule_changed':
      return 'email_training_schedule_change';
    case 'transport_plan_updated':
      return 'email_transport_updates';
    default:
      return null;
  }
}

function buildMessage(type, actorName, teamName, detail) {
  switch (type) {
    case 'training_plan_published':
      return `${actorName} published the ${teamName} training plan. ${detail}`.trim();
    case 'training_td_comment':
      return `${actorName} commented on the ${teamName} training plan. ${detail}`.trim();
    case 'training_session_reminder':
      return `${teamName} training starts soon. ${detail}`.trim();
    case 'training_schedule_changed':
      return `${actorName} updated the ${teamName} training schedule. ${detail}`.trim();
    case 'transport_plan_updated':
      return `${actorName} updated the ${teamName} transport plan. ${detail}`.trim();
    default:
      return detail || '';
  }
}

function buildTitle(type, teamName) {
  switch (type) {
    case 'training_plan_published':
      return `${teamName} training plan published`;
    case 'training_td_comment':
      return `Technical Director comment for ${teamName}`;
    case 'training_session_reminder':
      return `${teamName} training reminder`;
    case 'training_schedule_changed':
      return `${teamName} training schedule changed`;
    case 'transport_plan_updated':
      return `${teamName} transport updated`;
    default:
      return teamName;
  }
}

function buildEmailHtml({ title, message, linkPath }) {
  const publicUrl = getPublicAppUrl();
  const href = linkPath
    ? `${publicUrl}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`
    : publicUrl;

  return `
    <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe3f0;">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#7b88a8;font-weight:700;">MWOS Club Management</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#222745;">${title}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#55627d;">${message}</p>
        ${
          href
            ? `<a href="${href}" style="display:inline-block;background:#312783;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:14px;font-weight:700;">Open in app</a>`
            : ''
        }
      </div>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  const replyTo = process.env.NOTIFICATION_REPLY_TO_EMAIL;

  if (!apiKey || !from) {
    return { skipped: true, reason: 'Email provider is not configured.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `Resend request failed with status ${response.status}.`);
  }

  return { skipped: false, body };
}

async function fetchActorIdentity(serviceSupabase, actorUserId, fallbackEmail = '') {
  if (!actorUserId) {
    return {
      id: null,
      email: fallbackEmail,
      name: 'MWOS Club',
      roleLabel: 'System',
    };
  }

  const { data, error } = await serviceSupabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', actorUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    id: actorUserId,
    email: data?.email || fallbackEmail,
    name: data?.name || fallbackEmail.split('@')[0] || 'MWOS Staff',
    roleLabel: data?.role || 'Staff',
  };
}

async function fetchTeam(serviceSupabase, teamId) {
  const { data, error } = await serviceSupabase
    .from('teams')
    .select('id, slug, name, is_active')
    .eq('id', teamId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchUserContext(serviceSupabase) {
  const [profilesResponse, rolesResponse, assignmentsResponse, settingsResponse] = await Promise.all([
    serviceSupabase.from('profiles').select('id, email, name'),
    serviceSupabase.from('user_roles').select('user_id, roles!inner(slug)'),
    serviceSupabase.from('user_team_assignments').select('user_id, team_id'),
    serviceSupabase
      .from('user_settings')
      .select(
        'user_id, email_training_plan_published, email_training_td_comment, email_training_reminder, email_training_schedule_change, email_transport_updates',
      ),
  ]);

  if (profilesResponse.error) throw profilesResponse.error;
  if (rolesResponse.error) throw rolesResponse.error;
  if (assignmentsResponse.error) throw assignmentsResponse.error;
  if (settingsResponse.error) throw settingsResponse.error;

  const profiles = profilesResponse.data || [];
  const roleRows = rolesResponse.data || [];
  const assignmentRows = assignmentsResponse.data || [];
  const settingsRows = settingsResponse.data || [];

  const rolesByUser = new Map();
  roleRows.forEach((row) => {
    const joined = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    const current = rolesByUser.get(row.user_id) || new Set();
    joined.forEach((entry) => current.add(normalizeRoleSlug(entry.slug)));
    rolesByUser.set(row.user_id, current);
  });

  const assignmentsByUser = new Map();
  assignmentRows.forEach((row) => {
    const current = assignmentsByUser.get(row.user_id) || new Set();
    current.add(row.team_id);
    assignmentsByUser.set(row.user_id, current);
  });

  const settingsByUser = new Map(settingsRows.map((row) => [row.user_id, row]));

  return profiles.map((profile) => ({
    id: profile.id,
    email: profile.email || '',
    name: profile.name || profile.email?.split('@')[0] || 'MWOS Staff',
    roles: Array.from(rolesByUser.get(profile.id) || []),
    teams: Array.from(assignmentsByUser.get(profile.id) || []),
    settings: settingsByUser.get(profile.id) || null,
  }));
}

function canReceiveEvent(user, type, teamId, transportPlan = null) {
  if (type === 'transport_plan_updated') {
    if (user.roles.includes('admin') || user.roles.includes('technical_director')) {
      return true;
    }

    if (user.roles.includes('coach') && user.teams.includes(teamId)) {
      return true;
    }

    if (user.roles.includes('driver') && transportPlan?.driver_user_id === user.id) {
      return true;
    }

    return false;
  }

  const roleMatch = user.roles.some((role) => TRAINING_ROLES.includes(role));
  const teamMatch = user.roles.includes('admin') || user.roles.includes('technical_director') || user.teams.includes(teamId);
  return roleMatch && teamMatch;
}

function shouldEmail(user, type) {
  const field = getEmailPreferenceField(type);
  if (!field) return false;
  if (!user.settings) return true;
  return Boolean(user.settings[field]);
}

async function fetchTransportPlans(serviceSupabase, planIds) {
  const uniquePlanIds = Array.from(new Set((planIds || []).filter(Boolean)));
  if (uniquePlanIds.length === 0) {
    return new Map();
  }

  const { data, error } = await serviceSupabase
    .from('transport_plans')
    .select('id, team_id, driver_user_id')
    .in('id', uniquePlanIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((plan) => [plan.id, plan]));
}

async function insertNotifications(serviceSupabase, rows) {
  if (rows.length === 0) return [];

  const { data, error } = await serviceSupabase
    .from('app_notifications')
    .upsert(rows, {
      onConflict: 'recipient_user_id,event_key',
    })
    .select(
      'id, recipient_user_id, type, title, message, link_path, team_id, training_plan_id, training_day_id, email_enabled, email_sent_at, event_key',
    );

  if (error) {
    throw error;
  }

  return data || [];
}

async function deliverEmails(serviceSupabase, usersById, notifications) {
  const sentIds = [];
  const warnings = [];

  for (const notification of notifications) {
    const recipient = usersById.get(notification.recipient_user_id);
    if (!recipient || !notification.email_enabled || notification.email_sent_at) {
      continue;
    }

    if (!shouldEmail(recipient, notification.type)) {
      continue;
    }

    if (!recipient.email) {
      continue;
    }

    try {
      const result = await sendEmail({
        to: recipient.email,
        subject: notification.title,
        html: buildEmailHtml({
          title: notification.title,
          message: notification.message,
          linkPath: notification.link_path,
        }),
      });

      if (result.skipped) {
        warnings.push(result.reason);
        continue;
      }

      sentIds.push(notification.id);
    } catch (error) {
      warnings.push(error.message || 'Failed to send one or more notification emails.');
    }
  }

  if (sentIds.length > 0) {
    const { error } = await serviceSupabase
      .from('app_notifications')
      .update({ email_sent_at: new Date().toISOString() })
      .in('id', sentIds);

    if (error) {
      throw error;
    }
  }

  return warnings;
}

export async function emitTrainingEvents(serviceSupabase, actorUserId, actorFallbackEmail, events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { inserted: 0, warnings: [] };
  }

  const [actor, users, teams, transportPlansById] = await Promise.all([
    fetchActorIdentity(serviceSupabase, actorUserId, actorFallbackEmail),
    fetchUserContext(serviceSupabase),
    Promise.all(Array.from(new Set(events.map((event) => event.teamId))).map((teamId) => fetchTeam(serviceSupabase, teamId))),
    fetchTransportPlans(
      serviceSupabase,
      events.filter((event) => event.type === 'transport_plan_updated').map((event) => event.planId),
    ),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const rows = [];

  events.forEach((event) => {
    const team = teamById.get(event.teamId);
    if (!team) return;

    users
      .filter((candidate) => candidate.id !== actor.id)
      .filter((candidate) => canReceiveEvent(candidate, event.type, event.teamId, transportPlansById.get(event.planId || '')))
      .forEach((candidate) => {
        rows.push({
          recipient_user_id: candidate.id,
          actor_user_id: actor.id,
          type: event.type,
          title: buildTitle(event.type, team.name),
          message: buildMessage(event.type, actor.name, team.name, event.detail || ''),
          link_path: event.linkPath,
          team_id: event.teamId,
          training_plan_id: event.planId || null,
          training_day_id: event.dayId || null,
          event_key: event.eventKey || `${event.type}:${event.planId || event.dayId || event.teamId}`,
          email_enabled: true,
        });
      });
  });

  const inserted = await insertNotifications(serviceSupabase, rows);
  const warnings = await deliverEmails(serviceSupabase, usersById, inserted);

  return {
    inserted: inserted.length,
    warnings: warnings.filter(Boolean),
  };
}

export async function emitScheduledTrainingReminders(serviceSupabase, now = new Date()) {
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const candidateDates = Array.from(
    new Set([
      now.toISOString().slice(0, 10),
      windowEnd.toISOString().slice(0, 10),
    ]),
  );

  const { data, error } = await serviceSupabase
    .from('training_plan_days')
    .select(
      'id, plan_id, day_index, weekday_label, calendar_date, day_type, session_title, start_time, location, reminder_sent_at, training_plans!inner(id, team_id, status, week_start)',
    )
    .eq('day_type', 'training')
    .in('calendar_date', candidateDates)
    .is('reminder_sent_at', null);

  if (error) {
    throw error;
  }

  const rows = (data || []).filter((row) => {
    const plan = Array.isArray(row.training_plans) ? row.training_plans[0] : row.training_plans;
    if (!plan || !['published', 'updated'].includes(plan.status)) {
      return false;
    }

    if (!row.start_time) return false;
    const scheduledAt = new Date(`${row.calendar_date}T${row.start_time}`);
    return scheduledAt > now && scheduledAt <= windowEnd;
  });

  if (rows.length === 0) {
    return { emitted: 0, warnings: [] };
  }

  const reminders = rows.map((row) => {
    const plan = Array.isArray(row.training_plans) ? row.training_plans[0] : row.training_plans;
    return {
      type: 'training_session_reminder',
      teamId: plan.team_id,
      planId: plan.id,
      dayId: row.id,
      linkPath: `/training?team=${plan.team_id}&week=${plan.week_start}&day=${row.day_index}`,
      detail: `${row.weekday_label} · ${row.start_time}${row.location ? ` · ${row.location}` : ''}`,
      eventKey: `training-session-reminder:${row.id}:${row.calendar_date}:${row.start_time}`,
    };
  });

  const actorEmail = process.env.NOTIFICATION_REPLY_TO_EMAIL || process.env.NOTIFICATION_FROM_EMAIL || 'noreply@mwos.local';

  const result = await emitTrainingEvents(serviceSupabase, null, actorEmail, reminders);

  const reminderIds = rows.map((row) => row.id);
  const { error: updateError } = await serviceSupabase
    .from('training_plan_days')
    .update({ reminder_sent_at: new Date().toISOString() })
    .in('id', reminderIds);

  if (updateError) {
    throw updateError;
  }

  return {
    emitted: result.inserted,
    warnings: result.warnings,
  };
}
