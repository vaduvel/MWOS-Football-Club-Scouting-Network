// Explicit opt-in live QA; isolated accounts, manual links, no email delivery.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
config({ path: '.env.local', quiet: true });
const base = process.env.QA_APP_URL;
assert(base && process.env.QA_ALLOW_TEST_ACCOUNTS === 'yes', 'Set QA_APP_URL and QA_ALLOW_TEST_ACCOUNTS=yes explicitly');
assert(['https://mwos-hub.com','http://127.0.0.1:3005'].includes(base), 'Unexpected QA target');
const url = process.env.VITE_SUPABASE_URL;
assert.equal(new URL(url).hostname, 'xpswwuhdodzzdvrxypdj.supabase.co');
const key = process.env.VITE_SUPABASE_ANON_KEY;
const service = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const client = () => createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin = client();
const must = result => { if(result.error) throw result.error; return result.data; };
const login=must(await admin.auth.signInWithPassword({email:'danielvaduva994+qa-admin-ui@gmail.com',password:process.env.ROLE_QA_PASSWORD || 'RoleQa123!'}));
const adminToken=login.session.access_token;
const teams=must(await admin.from('teams').select('id,slug').eq('is_active',true));
const a=teams.find(t=>t.slug==='first-team').id;
const b=teams.find(t=>t.id!==a).id;
const run=randomUUID().slice(0,8);
const created=[];
const fixtures=[];
const plans=[];
const players=[];
let checks=0;
const api=async (path, token, payload) => {
  const response=await fetch(`${base}/api/${path}`,{
    method:payload===undefined?'GET':'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    ...(payload===undefined?{}:{body:JSON.stringify(payload)}),
  });
  return {status:response.status,body:await response.json()};
};
const ok=(condition,label) => { assert(condition,label); checks++; console.log(`PASS ${label}`); };
let manager;
try {
  for(const role of ['admin','executive_director','technical_director','board_observer','coach','team_manager','driver','scout']) {
    const email=`danielvaduva994+qa-${run}-${role}@gmail.com`;
    const invited=await api('invite-staff',adminToken,{email,fullName:`QA ${run} ${role}`,roleSlugs:[role],teamIds:[a],deliveryMode:'manual_link'});
    ok(invited.status===200 && invited.body.mode==='new_user',`${role}: invitation created via HTTP`);
    const invitation=must(await service.from('staff_invitations').select('id,invitation_token,resolved_user_id').eq('id',invited.body.invitationId).single());
    created.push({userId:invitation.resolved_user_id,email,invitationId:invitation.id});
    const action=new URL(invited.body.activationLink || invited.body.shareLink);
    ok(new URL(action.searchParams.get('redirect_to')).origin==='https://mwos-hub.com',`${role}: activation points to production`);
    const user=client();
    const verified=must(await user.auth.verifyOtp({token_hash:action.searchParams.get('token'),type:'invite'}));
    const token=verified.session.access_token;
    ok(!!token,`${role}: Supabase activation token verified`);
    const before=must(await user.from('user_roles').select('role_id').eq('user_id',verified.user.id));
    ok(before.length===0,`${role}: no access before invitation completion`);
    const accepted=await api('accept-staff-invite',token,{invitationToken:invitation.invitation_token});
    ok(accepted.status===200 && accepted.body.roles.includes(role),`${role}: invitation access activated`);
    const replay=await api('accept-staff-invite',token,{invitationToken:invitation.invitation_token});
    ok(replay.status===200 && replay.body.completedCount===0,`${role}: repeat acceptance is idempotent`);
    const assignments=must(await user.from('user_roles').select('roles!inner(slug)').eq('user_id',verified.user.id));
    ok(assignments.length===1 && assignments[0].roles.slug===role,`${role}: exactly the requested role`);
    const expectedGlobal=['admin','executive_director','technical_director','board_observer'].includes(role);
    const roster=await api(`club-roster?teamId=${b}`,token);
    ok(roster.status===(expectedGlobal?200:403),`${role}: other-team roster boundary`);
    const unprivileged=await api('invite-staff',token,{});
    ok(unprivileged.status===(role==='admin'?400:403),`${role}: admin endpoint boundary`);
    const internalRpc=await user.rpc('complete_staff_invitations',{target_user_id:verified.user.id,target_email:email,target_invitation_token:invitation.invitation_token});
    ok(!!internalRpc.error,`${role}: privileged completion RPC blocked`);
    if(role==='team_manager') {
      must(await user.auth.updateUser({password:process.env.ROLE_QA_PASSWORD || 'RoleQa123!'}));
      manager={user,token,id:verified.user.id,email};
    }
  }

  const {user,token,id}=manager;
  const fixture=must(await user.from('match_days').insert({team_id:a,opponent:`QA ${run}`,match_date:'2026-09-30',created_by:id,updated_by:id}).select('id').single());
  fixtures.push(fixture.id);
  ok(!!fixture.id,'manager creates own-team fixture');
  const forbidden=await user.from('match_days').insert({team_id:b,opponent:`QA ${run} forbidden`,match_date:'2026-09-30',created_by:id,updated_by:id}).select('id');
  if(forbidden.data?.length) fixtures.push(...forbidden.data.map(x=>x.id));
  ok(!!forbidden.error,'manager cannot create another-team fixture');
  const player=must(await service.from('club_players').insert({team_id:a,first_name:'QA',last_name:run,display_name:`QA ${run} age`,date_of_birth:'2000-01-01'}).select('id').single());
  players.push(player.id);
  const squad=await user.from('match_day_players').insert({match_day_id:fixture.id,club_player_id:player.id,selection_status:'starter'});
  ok(!!squad.error,'manager cannot change sporting selection');
  const plan=must(await user.from('transport_plans').insert({team_id:a,title:`QA ${run} transport`,event_date:'2026-09-30',destination:'QA venue',created_by:id,updated_by:id}).select('id').single());
  plans.push(plan.id);
  ok(!!plan.id,'manager creates own-team transport');
  const transfer=await user.from('transport_plans').update({team_id:b,updated_by:id}).eq('id',plan.id);
  ok(!!transfer.error,'manager cannot transfer transport outside assigned team');
  const age=await api(`club-roster?teamId=${a}`,token);
  ok(age.status===200 && age.body.players.find(p=>p.id===player.id)?.date_of_birth==='2000-01-01','DOB reaches authenticated roster API');
  must(await service.from('user_team_assignments').delete().eq('user_id',id));
  ok((await api(`club-roster?teamId=${a}`,token)).status===403,'same access token loses team roster after assignment revoked');
  ok(must(await user.from('match_days').select('id').eq('id',fixture.id)).length===0,'same token loses fixture visibility after assignment revoked');
  must(await service.from('user_team_assignments').insert({user_id:id,team_id:a}));
  must(await service.from('user_roles').delete().eq('user_id',id));
  ok((await api(`club-roster?teamId=${a}`,token)).status===403,'same token loses API access after role revoked');
  const managerRole=must(await service.from('roles').select('id').eq('slug','team_manager').single());
  must(await service.from('user_roles').insert({user_id:id,role_id:managerRole.id}));
  console.log(JSON.stringify({ok:true,checks,base,qaManager:process.env.QA_KEEP_MANAGER==='yes'?{email:manager.email,id:manager.id}:null}));
} finally {
  // Delete only exact IDs created by this run; real users and operational data are never selected.
  if(fixtures.length) must(await service.from('match_days').delete().in('id',fixtures));
  if(plans.length) must(await service.from('transport_plans').delete().in('id',plans));
  if(players.length) must(await service.from('club_players').delete().in('id',players));
  for(const account of created) {
    if(process.env.QA_KEEP_MANAGER==='yes' && account.userId===manager?.id) continue;
    must(await service.from('staff_access_events').delete().eq('target_user_id',account.userId));
    must(await service.from('staff_invitations').delete().eq('id',account.invitationId));
    const current=must(await service.auth.admin.getUserById(account.userId));
    assert.equal(current.user.email,account.email,'validate exact cleanup target');
    must(await service.auth.admin.deleteUser(account.userId));
  }
  console.log('Cleanup completed for transient QA data.');
}
