// Opt-in production regression for a confirmed Auth account without club access.
// Creates and removes only one unique synthetic Scout account and its invitations.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

config({ path: '.env.local', quiet: true });
assert.equal(process.env.QA_INVITE_RECOVERY, 'yes');
assert.equal(new URL(process.env.VITE_SUPABASE_URL).hostname, 'xpswwuhdodzzdvrxypdj.supabase.co');

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, options);
const service = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const requireData = ({ data, error }) => { if (error) throw error; return data; };
const adminSession = requireData(await admin.auth.signInWithPassword({
  email: 'danielvaduva994+qa-admin-ui@gmail.com',
  password: process.env.ROLE_QA_PASSWORD || 'RoleQa123!',
})).session;

async function call(path, body, accessToken = adminSession.access_token) {
  const response = await fetch(`https://mwos-hub.com/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function signInWithActionLink(link, type) {
  const url = new URL(link);
  assert.equal(url.searchParams.get('type'), type);
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, options);
  const result = requireData(await client.auth.verifyOtp({
    token_hash: url.searchParams.get('token'),
    type,
  }));
  assert.ok(result.session?.access_token, `${type} link did not create a session`);
  return { client, session: result.session };
}

const email = `danielvaduva994+qa-recovery-${randomUUID().slice(0, 8)}@gmail.com`;
const invitations = [];
let authUserId = null;

try {
  const first = await call('invite-staff', {
    email,
    fullName: 'QA Invitation Recovery',
    roleSlugs: ['scout'],
    teamIds: [],
    deliveryMode: 'manual_link',
  });
  assert.equal(first.status, 200, first.body.error);
  assert.equal(first.body.mode, 'new_user');
  invitations.push(first.body.invitationId);
  const firstRecord = requireData(await service.from('staff_invitations')
    .select('id, invitation_token, resolved_user_id, email')
    .eq('id', first.body.invitationId).single());
  assert.equal(firstRecord.email, email);
  authUserId = firstRecord.resolved_user_id;
  assert.ok(authUserId);

  const firstAuth = await signInWithActionLink(first.body.activationLink, 'invite');
  const firstAcceptance = await call('accept-staff-invite', {
    invitationToken: firstRecord.invitation_token,
  }, firstAuth.session.access_token);
  assert.equal(firstAcceptance.status, 200, firstAcceptance.body.error);
  requireData(await firstAuth.client.auth.updateUser({ password: `QaOnly-${randomUUID()}!` }));

  // Simulate the production failure: Auth works, but no club role remains.
  requireData(await service.from('user_roles').delete().eq('user_id', authUserId));
  const second = await call('invite-staff', {
    email,
    fullName: 'QA Invitation Recovery',
    roleSlugs: ['scout'],
    teamIds: [],
    deliveryMode: 'manual_link',
  });
  assert.equal(second.status, 200, second.body.error);
  assert.equal(second.body.mode, 'new_user');
  invitations.push(second.body.invitationId);
  assert.equal(new URL(second.body.activationLink).searchParams.get('type'), 'recovery');

  requireData(await service.from('staff_invitations')
    .update({ status: 'expired', expires_at: '2026-01-01T00:00:00Z' })
    .eq('id', second.body.invitationId));
  const resent = await call('resend-staff-invite', { invitationId: second.body.invitationId });
  assert.equal(resent.status, 200, resent.body.error);
  const renewed = requireData(await service.from('staff_invitations')
    .select('id, invitation_token, email, status, expires_at')
    .eq('id', second.body.invitationId).single());
  assert.equal(renewed.email, email);
  assert.equal(renewed.status, 'pending');
  assert.ok(new Date(renewed.expires_at) > new Date());

  // The resend endpoint hides successfully emailed links; request a fresh QA-only link.
  const issued = await call('issue-staff-invite-link', { invitationId: second.body.invitationId });
  assert.equal(issued.status, 200, issued.body.error);
  const recoveryAuth = await signInWithActionLink(issued.body.activationLink, 'recovery');
  const secondAcceptance = await call('accept-staff-invite', {
    invitationToken: renewed.invitation_token,
  }, recoveryAuth.session.access_token);
  assert.equal(secondAcceptance.status, 200, secondAcceptance.body.error);
  const final = requireData(await service.from('staff_invitations')
    .select('status').eq('id', second.body.invitationId).single());
  const roles = requireData(await service.from('user_roles').select('role_id').eq('user_id', authUserId));
  assert.equal(final.status, 'accepted');
  assert.equal(roles.length, 1);
  console.log(JSON.stringify({
    initialInvite: 'accepted',
    existingAccountLink: 'recovery',
    expiredResend: resent.body.delivery?.status || 'completed',
    issuedLink: 'verified',
    finalInvite: final.status,
    finalRoleCount: roles.length,
  }));
} finally {
  if (authUserId) {
    const user = requireData(await service.auth.admin.getUserById(authUserId)).user;
    assert.equal(user.email, email);
    requireData(await service.from('staff_access_events').delete().eq('target_user_id', authUserId));
  }
  for (const id of invitations) {
    const owned = requireData(await service.from('staff_invitations').select('email').eq('id', id).single());
    assert.equal(owned.email, email);
    requireData(await service.from('staff_invitations').delete().eq('id', id));
  }
  if (authUserId) requireData(await service.auth.admin.deleteUser(authUserId));
  console.log('Synthetic QA account and invitations removed.');
}
