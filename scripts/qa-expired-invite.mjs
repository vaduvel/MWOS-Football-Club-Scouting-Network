// Opt-in, isolated production QA of resend/expiry. Never selects real invitations.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
config({path:'.env.local',quiet:true});
assert.equal(process.env.QA_EXPIRED_INVITE,'yes');
assert.equal(new URL(process.env.VITE_SUPABASE_URL).hostname,'xpswwuhdodzzdvrxypdj.supabase.co');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY,opts);
const service=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,opts);
const must=r=>{if(r.error)throw r.error;return r.data;};
const session=must(await admin.auth.signInWithPassword({email:'danielvaduva994+qa-admin-ui@gmail.com',password:process.env.ROLE_QA_PASSWORD||'RoleQa123!'}));
const call=async(path,body,token=session.session.access_token)=>{
  const res=await fetch(`https://mwos-hub.com/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  return {status:res.status,body:await res.json()};
};
const email=`danielvaduva994+qa-expiry-${randomUUID().slice(0,8)}@gmail.com`;
let invitation;
try {
  const team=must(await admin.from('teams').select('id').eq('slug','first-team').single());
  const created=await call('invite-staff',{email,fullName:'QA expired invitation regression',roleSlugs:['scout'],teamIds:[team.id],deliveryMode:'manual_link'});
  assert.equal(created.status,200,created.body.error);
  invitation=must(await service.from('staff_invitations').select('id,invitation_token,resolved_user_id,email,expires_at').eq('id',created.body.invitationId).single());
  assert.equal(invitation.email,email);
  const expiredAt='2026-01-01T00:00:00Z';
  must(await service.from('staff_invitations').update({expires_at:expiredAt}).eq('id',invitation.id));
  const resent=await call('resend-staff-invite',{invitationId:invitation.id});
  const current=must(await service.from('staff_invitations').select('expires_at,last_sent_at,status').eq('id',invitation.id).single());
  // sign in using this test-only auth user's original invite token; resend uses the same staff invitation token.
  // When email delivery succeeds, the resend API intentionally withholds its auth link.
  // Generate a fresh auth-only link for this exact QA account to test the staff-expiry boundary independently.
  const link=resent.body.activationLink ? null : must(await service.auth.admin.generateLink({type:'invite',email}));
  const action=new URL(resent.body.activationLink || link.properties.action_link);
  const user=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY,opts);
  const verified=await user.auth.verifyOtp({token_hash:action.searchParams.get('token'),type:'invite'});
  let accepted=null;
  if(verified.data?.session) accepted=await call('accept-staff-invite',{invitationToken:invitation.invitation_token},verified.data.session.access_token);
  assert.equal(resent.status,200,resent.body.error);
  assert.equal(current.status,'pending');
  assert.ok(new Date(current.expires_at)>new Date(),`Resend did not renew expiry: ${current.expires_at}`);
  assert.ok(verified.data?.session,verified.error?.message || 'Fresh invitation auth session was not created.');
  assert.equal(accepted?.status,200,accepted?.body?.error);
  console.log(JSON.stringify({resendStatus:resent.status,delivery:resent.body.delivery?.status,resendError:resent.body.error,expiryStillPast:new Date(current.expires_at)<new Date(),invitation:current,authVerified:!!verified.data?.session,authError:verified.error?.message,acceptStatus:accepted?.status,acceptError:accepted?.body?.error}));
} finally {
  if(invitation){
    const owned=must(await service.from('staff_invitations').select('email,resolved_user_id').eq('id',invitation.id).single());
    assert.equal(owned.email,email);
    if(owned.resolved_user_id) must(await service.from('staff_access_events').delete().eq('target_user_id',owned.resolved_user_id));
    must(await service.from('staff_invitations').delete().eq('id',invitation.id));
    if(owned.resolved_user_id) { const auth=must(await service.auth.admin.getUserById(owned.resolved_user_id)); assert.equal(auth.user.email,email); must(await service.auth.admin.deleteUser(owned.resolved_user_id)); }
    console.log('Exact synthetic expiry-test invitation and account removed.');
  }
}
