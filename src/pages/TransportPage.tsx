import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bus, Loader2, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import TransportCommentsPanel from '../components/transport/TransportCommentsPanel';
import TransportPlanEditor from '../components/transport/TransportPlanEditor';
import TransportPlanList from '../components/transport/TransportPlanList';
import {
  addTransportPlanComment,
  fetchTransportDriverOptions,
  fetchTransportPlanSummaries,
  fetchTransportTeams,
  fetchTransportWorkspace,
  saveTransportPlan,
  type SaveTransportPlanInput,
  type TransportDriverOption,
  type TransportPlanSummary,
  type TransportWorkspace,
} from '../lib/transportData';
import { useAuthStore } from '../store/auth';

type TransportStatusFilter = 'all' | 'draft' | 'published' | 'updated' | 'completed' | 'cancelled';

export default function TransportPage() {
  const { user, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState<Array<{ id: string; slug: string; name: string; is_active: boolean }>>([]);
  const [drivers, setDrivers] = useState<TransportDriverOption[]>([]);
  const [plans, setPlans] = useState<TransportPlanSummary[]>([]);
  const [workspace, setWorkspace] = useState<TransportWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'draft' | 'publish' | 'complete' | 'cancel' | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');

  const teamId = searchParams.get('team') || '';
  const selectedPlanId = searchParams.get('plan') || '';
  const statusFilter = (searchParams.get('status') || 'all') as TransportStatusFilter;
  const draftMode = searchParams.get('draft') === '1';

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [availableTeams, availableDrivers] = await Promise.all([
          fetchTransportTeams(),
          fetchTransportDriverOptions(),
        ]);

        if (!isMounted) return;
        setTeams(availableTeams);
        setDrivers(availableDrivers);

        if (!teamId && availableTeams.length > 0 && !selectedPlanId) {
          const params = new URLSearchParams(searchParams);
          params.set('team', availableTeams[0].id);
          setSearchParams(params, { replace: true });
        }
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load transport setup.', loadError);
        setError(loadError?.message || 'Failed to load the transport workspace.');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [teamId, selectedPlanId, setSearchParams]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const summaries = await fetchTransportPlanSummaries({
          teamId: teamId || undefined,
          status: statusFilter,
        });

        if (!isMounted) return;
        setPlans(summaries);

        const firstPlanId = summaries[0]?.id || '';
        const effectivePlanId =
          selectedPlanId && summaries.some((plan) => plan.id === selectedPlanId)
            ? selectedPlanId
            : !draftMode
              ? firstPlanId
              : '';

        if (!selectedPlanId && !draftMode && effectivePlanId) {
          const params = new URLSearchParams(searchParams);
          params.set('plan', effectivePlanId);
          setSearchParams(params, { replace: true });
          return;
        }

        if (selectedPlanId && !effectivePlanId && draftMode) {
          const params = new URLSearchParams(searchParams);
          params.delete('plan');
          setSearchParams(params, { replace: true });
          return;
        }

        const nextWorkspace = await fetchTransportWorkspace(teamId || undefined, effectivePlanId || undefined);
        if (!isMounted) return;
        setWorkspace(nextWorkspace);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load transport data.', loadError);
        setError(loadError?.message || 'Failed to load transport plans.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [teamId, selectedPlanId, statusFilter, draftMode, setSearchParams]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(''), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const activePlansCount = useMemo(
    () => plans.filter((plan) => !['completed', 'cancelled'].includes(plan.status)).length,
    [plans],
  );

  const nextTrip = useMemo(() => {
    return plans.find((plan) => !['completed', 'cancelled'].includes(plan.status)) || null;
  }, [plans]);

  const assignedDriversCount = useMemo(
    () => plans.filter((plan) => plan.driverUserId).length,
    [plans],
  );

  const updateSearch = (patch: Partial<Record<'team' | 'plan' | 'status' | 'draft', string | null>>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params, { replace: true });
  };

  const handleCreateNew = () => {
    const fallbackTeamId = teamId || teams[0]?.id || '';
    updateSearch({
      team: fallbackTeamId || null,
      plan: null,
      draft: '1',
    });
  };

  const handleSelectPlan = (planId: string) => {
    updateSearch({
      plan: planId,
      draft: null,
    });
  };

  const handleWorkspaceChange = <K extends keyof TransportWorkspace>(field: K, value: TransportWorkspace[K]) => {
    setWorkspace((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });

    if (field === 'team') {
      const nextTeam = value as TransportWorkspace['team'];
      updateSearch({ team: nextTeam.id });
    }
  };

  const handleSave = async (action: 'draft' | 'publish' | 'complete' | 'cancel') => {
    if (!workspace) return;

    setSavingState(action);
    setError('');
    setWarning('');

    try {
      const result = await saveTransportPlan(
        {
          id: workspace.id,
          teamId: workspace.team.id,
          title: workspace.title,
          contextType: workspace.contextType,
          eventDate: workspace.eventDate,
          departureTime: workspace.departureTime,
          arrivalTargetTime: workspace.arrivalTargetTime,
          meetingPoint: workspace.meetingPoint,
          destination: workspace.destination,
          driverUserId: workspace.driverUserId,
          notes: workspace.notes,
          contactNotes: workspace.contactNotes,
          status: workspace.status,
        } satisfies SaveTransportPlanInput,
        action,
      );

      const refreshedPlans = await fetchTransportPlanSummaries({
        teamId: result.workspace.team.id,
        status: statusFilter,
      });

      setPlans(refreshedPlans);
      setWorkspace(result.workspace);
      updateSearch({
        team: result.workspace.team.id,
        plan: result.workspace.id || null,
        draft: null,
      });
      setSuccess(
        action === 'publish'
          ? 'Transport plan published.'
          : action === 'complete'
            ? 'Transport plan marked as completed.'
            : action === 'cancel'
              ? 'Transport plan cancelled.'
              : 'Transport plan saved.',
      );
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (saveError: any) {
      console.error('Failed to save transport plan.', saveError);
      setError(saveError?.message || 'Failed to save transport plan.');
    } finally {
      setSavingState(null);
    }
  };

  const handleCommentSubmit = async (content: string) => {
    if (!workspace?.id) {
      setError('Save the transport plan first, then add comments.');
      return;
    }

    setCommentSaving(true);
    setError('');

    try {
      const result = await addTransportPlanComment(workspace.id, content);
      setWorkspace(result.workspace);
      if (result.warning) {
        setWarning(result.warning);
      }
      setSuccess('Comment posted.');
    } catch (commentError: any) {
      console.error('Failed to add transport comment.', commentError);
      setError(commentError?.message || 'Failed to post comment.');
    } finally {
      setCommentSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="transport" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-3 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-4 py-5 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">
                Club Module
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <Bus size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="mwos-display text-balance text-[2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Transport Plans
                  </h1>
                  <p className="mt-3 max-w-3xl text-pretty text-sm font-semibold leading-6 text-white/82 md:text-base md:leading-7">
                    Coordinate departures, keep assigned drivers aligned and surface important travel changes in one place for the whole club.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <section className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </section>
          ) : null}

          {warning ? (
            <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {warning}
            </section>
          ) : null}

          {success ? (
            <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {success}
            </section>
          ) : null}

          <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <article className="mwos-card-tone-transport rounded-[22px] border p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Active trips</p>
              <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{activePlansCount}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                Published and in-progress transport work that still needs attention.
              </p>
            </article>
            <article className="mwos-card-tone-alert col-span-2 rounded-[22px] border p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)] md:col-span-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Next departure</p>
              <p className="mt-3 text-xl font-black text-[var(--color-dark)]">
                {nextTrip ? `${nextTrip.eventDate} · ${nextTrip.departureTime || 'TBD'}` : 'No upcoming trip'}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                {nextTrip ? `${nextTrip.teamName} · ${nextTrip.destination}` : 'Create or publish the next trip to see it here.'}
              </p>
            </article>
            <article className="mwos-card-tone-staff rounded-[22px] border p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Assigned drivers</p>
              <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{assignedDriversCount}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                Trips that already have a named driver and are ready for execution updates.
              </p>
            </article>
          </section>

          <section className="mwos-card-tone-report rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="w-full flex-1 space-y-2 sm:min-w-[220px]">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Team filter</span>
                <select
                  value={teamId}
                  onChange={(event) =>
                    updateSearch({
                      team: event.target.value || null,
                      plan: null,
                      draft: null,
                    })
                  }
                  className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">All accessible teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="w-full flex-1 space-y-2 sm:min-w-[220px]">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Status filter</span>
                <select
                  value={statusFilter}
                  onChange={(event) => updateSearch({ status: event.target.value || 'all', plan: null, draft: null })}
                  className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="updated">Updated</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              {workspace?.canCreate ? (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white sm:w-auto"
                >
                  <Plus size={16} />
                  New plan
                </button>
              ) : null}
            </div>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <div className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--color-mid)]">
                <Loader2 size={18} className="animate-spin text-[var(--color-primary)]" />
                Loading transport workspace…
              </div>
            </section>
          ) : (
            <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                <TransportPlanList
                  plans={plans}
                  selectedPlanId={selectedPlanId || workspace?.id || null}
                  onSelect={handleSelectPlan}
                />
              </div>

              <div className="space-y-6">
                {workspace ? (
                  <>
                    <TransportPlanEditor
                      workspace={workspace}
                      teams={teams}
                      drivers={drivers}
                      savingState={savingState}
                      onChange={handleWorkspaceChange}
                      onAction={(action) => void handleSave(action)}
                    />
                    <TransportCommentsPanel
                      comments={workspace.comments}
                      canComment={workspace.canComment}
                      isSubmitting={commentSaving}
                      onSubmit={handleCommentSubmit}
                    />
                  </>
                ) : (
                  <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
                    <div className="inline-flex items-start gap-3 rounded-2xl border border-[var(--color-primary)]/14 bg-[var(--color-primary)]/5 p-4 text-sm font-semibold text-[var(--color-dark)]">
                      <AlertCircle size={18} className="mt-0.5 text-[var(--color-primary)]" />
                      <div>
                        Select a transport plan from the left, or create a new one if your role can plan travel.
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
