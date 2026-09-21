import assert from 'node:assert/strict';

// Executed only against the isolated PGlite database created by verify-migration-chain.
export async function verifyAccessBoundaries(db) {
  await db.exec('reset role');
  const teams = (await db.query('select id from teams order by sort_order limit 2')).rows;
  const [a, b] = teams.map(t => t.id);
  assert(a && b, 'two fixture teams');
  const ids = {};
  const roles = ['admin','executive_director','technical_director','board_observer','coach','team_manager','driver','scout'];
  for (const [index, role] of roles.entries()) {
    const id = `10000000-0000-4000-a000-${String(index + 1).padStart(12,'0')}`;
    ids[role] = id;
    await db.query('insert into auth.users(id,email) values ($1,$2)', [id, `${role}@example.test`]);
    await db.query('insert into user_roles(user_id,role_id) select $1,id from roles where slug=$2', [id,role]);
    await db.query('insert into user_team_assignments(user_id,team_id) values ($1,$2)', [id,a]);
  }
  const asUser = async (id) => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('set role authenticated');
  };
  const matrix = {
    admin: [true,true,true,true,true,true],
    executive_director: [true,true,false,false,true,true],
    technical_director: [true,true,true,true,true,true],
    board_observer: [true,true,false,false,true,true],
    coach: [true,false,true,false,true,false],
    team_manager: [true,false,true,false,true,false],
    driver: [false,false,false,false,false,false],
    scout: [false,false,false,false,false,false],
  };
  for (const role of roles) {
    await asUser(ids[role]);
    const row = (await db.query(`select
      can_view_match_day_team($1) va, can_view_match_day_team($2) vb,
      can_manage_match_day_fixture($1) ma, can_manage_match_day_fixture($2) mb,
      can_view_club_roster($1) ra, can_view_club_roster($2) rb`, [a,b])).rows[0];
    assert.deepEqual(Object.values(row), matrix[role], `${role}: assigned vs other team`);
  }
  await db.exec('reset role');
  const fixture = (await db.query(`insert into match_days(team_id,opponent,match_date,created_by,updated_by)
    values ($1,'QA boundary',current_date,$2,$2) returning id`, [a,ids.admin])).rows[0].id;
  const player = (await db.query(`insert into club_players(team_id,first_name,last_name,display_name,date_of_birth)
    values ($1,'QA','Age','QA Age','2000-01-01') returning id`,[a])).rows[0].id;
  await asUser(ids.scout);
  assert.equal((await db.query('select id from club_players')).rows.length,0,'Scout cannot read internal players');
  const individual = (await db.query("insert into reports(user_id,report_type) values ($1,'individual') returning id",[ids.scout])).rows[0].id;
  await assert.rejects(db.query("insert into players(report_id,team_side,name,club_player_id) values ($1,'home','Forbidden link',$2)",[individual,player]), /Internal roster access/);
  await db.query("insert into players(report_id,team_side,name) values ($1,'home','External QA')",[individual]);
  assert.equal((await db.query('select report_type from reports where id=$1',[individual])).rows[0].report_type,'individual');
  await db.exec('reset role');
  const plan = (await db.query(`insert into transport_plans(team_id,title,event_date,destination,driver_user_id,created_by,updated_by)
    values ($1,'QA transport',current_date,'QA venue',$2,$3,$3) returning id`, [a,ids.driver,ids.admin])).rows[0].id;
  for (const role of ['admin','technical_director','coach','team_manager','driver']) {
    await asUser(ids[role]);
    const inserted = await db.query(`insert into transport_plans(team_id,title,event_date,destination,driver_user_id,created_by,updated_by)
      values ($1,'QA insert returning',current_date,'QA venue',$2,$3,$3) returning id`, [a,ids.driver,ids[role]]);
    assert.equal(inserted.rows.length,1,`${role}: transport INSERT RETURNING`);
  }
  await asUser(ids.team_manager);
  assert.equal((await db.query('select * from list_team_transport_drivers()')).rows.length,1);
  assert.equal((await db.query('select can_manage_match_day_team($1) allowed',[a])).rows[0].allowed,false);
  await db.query('update match_days set venue=$1,updated_by=$2 where id=$3', ['QA manager venue',ids.team_manager,fixture]);
  await assert.rejects(db.query('update match_days set team_id=$1,updated_by=$2 where id=$3',[b,ids.team_manager,fixture]), /row-level security/);
  await assert.rejects(db.query(`insert into match_day_players(match_day_id,club_player_id,selection_status)
    values ($1,$2,'starter')`,[fixture,player]), /row-level security/);
  await db.query('update transport_plans set destination=$1,updated_by=$2 where id=$3',['QA new venue',ids.team_manager,plan]);
  await assert.rejects(db.query('update transport_plans set team_id=$1,updated_by=$2 where id=$3',[b,ids.team_manager,plan]), /row-level security/);
  await assert.rejects(db.query('update transport_plans set driver_user_id=$1,updated_by=$2 where id=$3',[ids.scout,ids.team_manager,plan]), /row-level security/);
  await assert.rejects(db.query('insert into user_roles(user_id,role_id) select $1,id from roles where slug=$2',[ids.team_manager,'admin']), /row-level security/);
  assert.equal((await db.query('update club_players set date_of_birth=$1 where id=$2 returning id',['2001-01-01',player])).rows.length,0);
  await asUser(ids.coach);
  await db.query(`insert into match_day_players(match_day_id,club_player_id,selection_status) values ($1,$2,'starter')`,[fixture,player]);
  await asUser(ids.driver);
  assert.equal((await db.query('select id from transport_plans where id=$1',[plan])).rows.length,1);
  await db.exec('reset role');
  await db.query('delete from user_roles where user_id=$1',[ids.driver]);
  await asUser(ids.driver); // Same identity/token claims after role revocation.
  assert.equal((await db.query('select id from transport_plans where id=$1',[plan])).rows.length,0);
  await db.exec('reset role');
  await db.query('delete from user_team_assignments where user_id=$1',[ids.team_manager]);
  await asUser(ids.team_manager);
  assert.equal((await db.query('select id from match_days where id=$1',[fixture])).rows.length,0);
  assert.equal((await db.query('select id from transport_plans where id=$1',[plan])).rows.length,0);
  assert.equal((await db.query('select * from list_team_transport_drivers()')).rows.length,0);
  await asUser(ids.admin);
  await assert.rejects(db.query('update club_players set date_of_birth=$1 where id=$2',['2999-01-01',player]), /birth_date_not_future/);

  await db.exec('reset role');
  const recipient='20000000-0000-4000-a000-000000000001';
  await db.query('insert into auth.users(id,email) values ($1,$2)',[recipient,'invite@example.test']);
  for (const status of ['pending','cancelled','expired']) {
    const invite = (await db.query(`insert into staff_invitations(email,email_normalized,full_name,status,invitation_token,inviter_user_id)
      values ('invite@example.test','invite@example.test','QA invite',$1,$2,$3) returning id`,[status,`qa-${status}`,ids.admin])).rows[0].id;
    await db.query('insert into staff_invitation_roles(invitation_id,role_id) select $1,id from roles where slug=$2',[invite,'team_manager']);
    await db.query('insert into staff_invitation_teams(invitation_id,team_id) values ($1,$2)',[invite,a]);
  }
  await assert.rejects(db.query('select * from complete_staff_invitations($1,$2,$3)',[recipient,'wrong@example.test','qa-pending']), /does not match/);
  for (const token of ['qa-cancelled','qa-expired']) {
    assert.equal((await db.query('select * from complete_staff_invitations($1,$2,$3)',[recipient,'invite@example.test',token])).rows[0].completed_count,0);
  }
  const completed=(await db.query('select * from complete_staff_invitations($1,$2,$3)',[recipient,'invite@example.test','qa-pending'])).rows[0];
  assert.equal(completed.completed_count,1);
  assert.deepEqual(completed.role_slugs,['team_manager']);
  assert.equal((await db.query('select * from complete_staff_invitations($1,$2,$3)',[recipient,'invite@example.test','qa-pending'])).rows[0].completed_count,0);
  await asUser(recipient);
  await assert.rejects(db.query('select * from complete_staff_invitations($1,$2,$3)',[recipient,'invite@example.test','qa-pending']), /permission denied/);
  assert.equal((await db.query('select can_manage_match_day_fixture($1) allowed',[a])).rows[0].allowed,true);
  await db.exec('reset role');
  console.log('PASS 8-role SQL matrix, cross-team writes, squad isolation, driver scope, revocation, DOB constraint, invitation completion/replay/cancellation/expiry');

  const scoutRecipient = '20000000-0000-4000-a000-000000000002';
  await db.query('insert into auth.users(id,email) values ($1,$2)', [scoutRecipient, 'new-scout@example.test']);
  const scoutInvite = (await db.query(`insert into staff_invitations(email,email_normalized,full_name,status,invitation_token,inviter_user_id)
    values ('new-scout@example.test','new-scout@example.test','QA teamless Scout','pending','qa-teamless-scout',$1) returning id`, [ids.admin])).rows[0].id;
  await db.query("insert into staff_invitation_roles(invitation_id,role_id) select $1,id from roles where slug='scout'", [scoutInvite]);
  const scoutAccess = (await db.query('select * from complete_staff_invitations($1,$2,$3)', [scoutRecipient, 'new-scout@example.test', 'qa-teamless-scout'])).rows[0];
  assert.equal(scoutAccess.completed_count, 1);
  assert.deepEqual(scoutAccess.role_slugs, ['scout']);
  assert.equal((await db.query('select * from user_team_assignments where user_id=$1', [scoutRecipient])).rows.length, 0);
  await asUser(scoutRecipient);
  assert.equal((await db.query('select id from club_players')).rows.length, 0, 'new teamless Scout cannot read internal roster');
  assert.equal((await db.query('select can_view_match_day_team($1) allowed', [a])).rows[0].allowed, false);
  await db.query("insert into reports(user_id,report_type) values ($1,'individual')", [scoutRecipient]);
  await db.exec('reset role');
  console.log('PASS Scout invitation activation without teams, individual authoring, and internal roster isolation');
}
