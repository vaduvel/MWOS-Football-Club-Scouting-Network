-- Evaluate the candidate row directly: a STABLE helper that re-reads the table
-- cannot see a just-inserted row during INSERT ... RETURNING.
drop policy transport_plans_select_accessible on public.transport_plans;
create policy transport_plans_select_accessible on public.transport_plans
for select to authenticated using (
  public.has_any_role(array['admin','executive_director','technical_director','board_observer'])
  or (public.has_any_role(array['coach','team_manager']) and public.belongs_to_team(team_id))
  or (public.has_role('driver') and driver_user_id=auth.uid())
);
