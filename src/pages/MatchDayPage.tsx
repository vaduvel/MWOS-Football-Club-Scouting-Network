import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  AlertCircle,
  Bus,
  Ban,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Plus,
  Save,
  Send,
  UserRound,
  Users,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AppSidebar from '../components/AppSidebar';
import ConfirmActionModal from '../components/ConfirmActionModal';
import {
  createLinkedTransportPlan,
  fetchMatchDaySummaries,
  fetchMatchDayTeams,
  fetchMatchDayWorkspace,
  saveMatchDayFixture,
  saveMatchDayPlayerSelections,
  type MatchDayPlayerSelection,
  type MatchDaySummary,
  type MatchDayWorkspace,
  type SaveMatchDayFixtureInput,
} from '../lib/matchDayData';
import { buildMatchDayStatusTotals, groupMatchDaySelections, isTerminalMatchDayStatus } from '../lib/matchDayDomain';
import { canAccessPlayerHub } from '../lib/roleAccessDomain';
import { useAuthStore } from '../store/auth';

export default function MatchDayPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState<Array<{ id: string; slug: string; name: string; is_active: boolean }>>([]);
  const [summaries, setSummaries] = useState<MatchDaySummary[]>([]);
  const [workspace, setWorkspace] = useState<MatchDayWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'draft' | 'publish' | 'complete' | 'cancel' | null>(null);
  const [savingSquad, setSavingSquad] = useState(false);
  const [transportBusy, setTransportBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingTerminalAction, setPendingTerminalAction] = useState<'complete' | 'cancel' | null>(null);

  const teamId = searchParams.get('team') || '';
  const selectedMatchDayId = searchParams.get('match') || '';
  const draftMode = searchParams.get('draft') === '1';

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const availableTeams = await fetchMatchDayTeams();
        if (!isMounted) return;

        setTeams(availableTeams);

        if (!teamId && availableTeams.length > 0) {
          const params = new URLSearchParams(searchParams);
          params.set('team', availableTeams[0].id);
          setSearchParams(params, { replace: true });
        }
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load match-day teams.', loadError);
        setError(loadError?.message || 'Failed to load match-day team access.');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [teamId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!teamId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const nextSummaries = await fetchMatchDaySummaries(teamId);
        if (!isMounted) return;

        setSummaries(nextSummaries);

        const firstMatchDayId = nextSummaries[0]?.id || '';
        const effectiveMatchDayId =
          selectedMatchDayId && nextSummaries.some((summary) => summary.id === selectedMatchDayId)
            ? selectedMatchDayId
            : !draftMode
              ? firstMatchDayId
              : '';

        if (!selectedMatchDayId && !draftMode && effectiveMatchDayId) {
          const params = new URLSearchParams(searchParams);
          params.set('match', effectiveMatchDayId);
          setSearchParams(params, { replace: true });
          return;
        }

        const nextWorkspace = await fetchMatchDayWorkspace(teamId, effectiveMatchDayId || undefined);
        if (!isMounted) return;
        setWorkspace(nextWorkspace);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load match-day workspace.', loadError);
        setError(loadError?.message || 'Failed to load the match-day workspace.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [teamId, selectedMatchDayId, draftMode, searchParams, setSearchParams]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(''), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const updateSearch = (patch: Partial<Record<'team' | 'match' | 'draft', string | null>>) => {
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
    if (!workspace?.canManage && summaries.length > 0) return;
    const fallbackTeamId = teamId || teams[0]?.id || '';
    updateSearch({
      team: fallbackTeamId || null,
      match: null,
      draft: '1',
    });
  };

  const handleSelectMatchDay = (matchDayId: string) => {
    updateSearch({
      match: matchDayId,
      draft: null,
    });
  };

  const handleWorkspaceChange = <K extends keyof MatchDayWorkspace>(field: K, value: MatchDayWorkspace[K]) => {
    setWorkspace((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });

    if (field === 'team') {
      const nextTeam = value as MatchDayWorkspace['team'];
      updateSearch({
        team: nextTeam.id,
        match: null,
        draft: workspace?.id ? null : '1',
      });
    }
  };

  const handlePlayerChange = (
    clubPlayerId: string,
    field: keyof Pick<MatchDayPlayerSelection, 'availabilityStatus' | 'selectionStatus' | 'notes'>,
    value: string,
  ) => {
    setWorkspace((current) => {
      if (!current) return current;
      return {
        ...current,
        players: current.players.map((player) =>
          player.clubPlayerId === clubPlayerId
            ? {
                ...player,
                [field]: value,
              }
            : player,
        ),
      };
    });
  };

  const refreshTeamState = async (nextTeamId: string, nextMatchDayId?: string | null) => {
    const [nextSummaries, nextWorkspace] = await Promise.all([
      fetchMatchDaySummaries(nextTeamId),
      fetchMatchDayWorkspace(nextTeamId, nextMatchDayId || undefined),
    ]);

    setSummaries(nextSummaries);
    setWorkspace(nextWorkspace);
  };

  const handleSave = async (action: 'draft' | 'publish' | 'complete' | 'cancel') => {
    if (!workspace) return;

    setSavingState(action);
    setError('');
    try {
      const fixtureResult = await saveMatchDayFixture(
        {
          id: workspace.id,
          teamId: workspace.team.id,
          opponent: workspace.opponent,
          competition: workspace.competition,
          matchDate: workspace.matchDate,
          kickoffTime: workspace.kickoffTime,
          venue: workspace.venue,
          status: workspace.status,
        } satisfies SaveMatchDayFixtureInput,
        action,
      );

      const savedId = fixtureResult.workspace.id;
      const selectionResult = savedId
        ? await saveMatchDayPlayerSelections(savedId, workspace.players)
        : fixtureResult;

      await refreshTeamState(selectionResult.workspace.team.id, selectionResult.workspace.id || null);
      updateSearch({
        team: selectionResult.workspace.team.id,
        match: selectionResult.workspace.id || null,
        draft: null,
      });

      setSuccess(
        action === 'publish'
          ? 'Match day published.'
          : action === 'complete'
            ? 'Match day marked as completed.'
            : action === 'cancel'
              ? 'Match day cancelled.'
              : 'Match day saved.',
      );
    } catch (saveError: any) {
      console.error('Failed to save match day.', saveError);
      setError(saveError?.message || 'Failed to save the match day.');
    } finally {
      setSavingState(null);
    }
  };

  const handleSaveSquad = async () => {
    if (!workspace?.id) {
      setError('Save the fixture first, then save the squad board.');
      return;
    }

    setSavingSquad(true);
    setError('');
    try {
      const result = await saveMatchDayPlayerSelections(workspace.id, workspace.players);
      await refreshTeamState(result.workspace.team.id, result.workspace.id || null);
      setSuccess('Squad board saved.');
    } catch (saveError: any) {
      console.error('Failed to save squad board.', saveError);
      setError(saveError?.message || 'Failed to save the squad board.');
    } finally {
      setSavingSquad(false);
    }
  };

  const handleCreateTransport = async () => {
    if (!workspace?.id) {
      setError('Save the fixture first, then create the linked transport plan.');
      return;
    }

    setTransportBusy(true);
    setError('');
    try {
      const result = await createLinkedTransportPlan(workspace.id);
      setWorkspace(result.workspace);
      setSuccess('Transport plan linked to this match day.');
      navigate(result.transportLinkPath);
    } catch (transportError: any) {
      console.error('Failed to create linked transport plan.', transportError);
      setError(transportError?.message || 'Failed to create the linked transport plan.');
    } finally {
      setTransportBusy(false);
    }
  };

  const activeFixtureCount = useMemo(
    () => summaries.filter((summary) => !['completed', 'cancelled'].includes(summary.status)).length,
    [summaries],
  );

  const nextFixture = useMemo(
    () => summaries.find((summary) => !['completed', 'cancelled'].includes(summary.status)) || null,
    [summaries],
  );

  const totals = useMemo(
    () => buildMatchDayStatusTotals(workspace?.players || []),
    [workspace?.players],
  );

  const grouped = useMemo(
    () => groupMatchDaySelections(workspace?.players || []),
    [workspace?.players],
  );
  const workspaceIsTerminal = workspace ? isTerminalMatchDayStatus(workspace.status) : false;
  const canViewPlayerProfiles = canAccessPlayerHub(user);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-light)] md:flex-row">
      <AppSidebar current="match-day" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-3 pb-24 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="mwos-ribbon-surface overflow-hidden rounded-[28px] px-4 py-5 text-white md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/68">Club Match Day</p>
                <h1 className="mt-2 mwos-display text-[2.35rem] uppercase leading-none tracking-[0.05em] text-white md:text-5xl">
                  Match day board
                </h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/78">
                  Set the fixture, lock the squad state, and keep the next football decision attached to real club players.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <HeroMetric label="Active fixtures" value={String(activeFixtureCount)} />
                <HeroMetric label="Starters" value={String(totals.starterCount)} />
                <HeroMetric
                  label="Next kick-off"
                  value={nextFixture?.kickoffTime || nextFixture?.matchDate || '--'}
                />
              </div>
            </div>
          </section>

          {error ? (
            <div className="mwos-card-tone-danger rounded-2xl border p-4 text-sm font-semibold text-[var(--color-accent-deep)]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {success}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-[var(--color-mid)]/16 bg-white">
              <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-mid)]">
                <Loader2 size={18} className="animate-spin" />
                Loading match-day workspace…
              </div>
            </div>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Fixtures</p>
                      <h2 className="mt-2 text-xl font-black text-[var(--color-dark)]">Team match days</h2>
                    </div>
                    {workspace?.canManage ? (
                      <button
                        onClick={handleCreateNew}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-primary)]/16 bg-[var(--color-primary)]/6 px-3 py-2 text-sm font-black text-[var(--color-primary)]"
                      >
                        <Plus size={16} />
                        New
                      </button>
                    ) : null}
                  </div>

                  <label className="mt-4 block">
                    <span className="mwos-form-label mb-2 text-[var(--color-mid)]">Team</span>
                    <select
                      value={teamId}
                      onChange={(event) => updateSearch({ team: event.target.value, match: null, draft: null })}
                      disabled={teams.length < 2}
                      className="mwos-select-field mwos-input"
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-4 space-y-3">
                    {summaries.map((summary) => (
                      <button
                        key={summary.id}
                        onClick={() => handleSelectMatchDay(summary.id)}
                        className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                          summary.id === workspace?.id
                            ? 'border-[var(--color-primary)]/22 bg-[var(--color-primary)]/6'
                            : 'border-[var(--color-mid)]/12 bg-[var(--color-light)]/48 hover:border-[var(--color-primary)]/18'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                              {summary.teamName}
                            </p>
                            <p className="mt-2 text-base font-black text-[var(--color-dark)]">{summary.opponent}</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">
                              {summary.matchDate}
                              {summary.kickoffTime ? ` • ${summary.kickoffTime}` : ''}
                            </p>
                          </div>
                          <StatusBadge status={summary.status} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatChip label="Start" value={summary.starterCount} tone="primary" />
                          <StatChip label="Bench" value={summary.benchCount} tone="neutral" />
                          <StatChip label="Out" value={summary.unavailableCount} tone="danger" />
                        </div>
                      </button>
                    ))}

                    {summaries.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4">
                        <p className="text-sm font-black text-[var(--color-dark)]">
                          No match-day fixtures yet for this team.
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                          Start with the next fixture, then attach transport and squad selection once the core record exists.
                        </p>
                        {workspace?.canManage ? (
                          <button
                            type="button"
                            onClick={handleCreateNew}
                            className="mwos-btn mwos-btn-primary mt-3 w-full"
                          >
                            <Plus size={16} />
                            Create first fixture
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {workspace ? (
                  <>
                    <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                      <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Fixture setup</p>
                          <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Core match record</h2>
                        </div>
                      </div>

                      <div className={`mt-5 mwos-inline-strip ${workspace.canManage && !workspaceIsTerminal ? 'mwos-inline-strip-training' : 'mwos-inline-strip-staff'}`}>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                            {workspace.canManage && !workspaceIsTerminal ? 'Start here' : 'Read-only mode'}
                          </p>
                          <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                            {workspace.canManage && !workspaceIsTerminal
                              ? 'Save the fixture first. Then link transport, open the training week, and lock the squad board.'
                              : 'This role can follow the fixture, transport link, training context, and squad board, but cannot edit them.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <FieldBlock label="Team">
                          <select
                            value={workspace.team.id}
                            onChange={(event) => {
                              const nextTeam = teams.find((team) => team.id === event.target.value);
                              if (nextTeam) {
                                handleWorkspaceChange('team', nextTeam);
                              }
                            }}
                            disabled={teams.length < 2}
                            className="mwos-select-field mwos-input"
                          >
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </FieldBlock>

                        <FieldBlock label="Opponent">
                          <input
                            value={workspace.opponent}
                            onChange={(event) => handleWorkspaceChange('opponent', event.target.value)}
                            disabled={!workspace.canManage || workspaceIsTerminal}
                            className="mwos-input"
                            placeholder="Opponent"
                          />
                        </FieldBlock>

                        <FieldBlock label="Competition">
                          <input
                            value={workspace.competition}
                            onChange={(event) => handleWorkspaceChange('competition', event.target.value)}
                            disabled={!workspace.canManage || workspaceIsTerminal}
                            className="mwos-input"
                            placeholder="League / Cup / Friendly"
                          />
                        </FieldBlock>

                        <FieldBlock label="Venue">
                          <input
                            value={workspace.venue}
                            onChange={(event) => handleWorkspaceChange('venue', event.target.value)}
                            disabled={!workspace.canManage || workspaceIsTerminal}
                            className="mwos-input"
                            placeholder="Home / Away / Ground"
                          />
                        </FieldBlock>

                        <FieldBlock label="Match date">
                          <input
                            type="date"
                            value={workspace.matchDate}
                            onChange={(event) => handleWorkspaceChange('matchDate', event.target.value)}
                            disabled={!workspace.canManage || workspaceIsTerminal}
                            className="mwos-date-field mwos-input"
                          />
                        </FieldBlock>

                        <FieldBlock label="Kick-off">
                          <input
                            type="time"
                            value={workspace.kickoffTime}
                            onChange={(event) => handleWorkspaceChange('kickoffTime', event.target.value)}
                            disabled={!workspace.canManage || workspaceIsTerminal}
                            className="mwos-input"
                          />
                        </FieldBlock>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <MetaChip label="Status" value={workspace.status} />
                        <MetaChip label="Players" value={String(workspace.players.length)} />
                        <MetaChip label="Starters" value={String(grouped.starters.length)} />
                        <MetaChip label="Bench" value={String(grouped.bench.length)} />
                      </div>

                      {workspace.canManage && !workspaceIsTerminal ? (
                        <div className="mt-5 space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <ActionButton
                              label={workspace.status === 'draft' ? 'Save draft' : 'Save changes'}
                              icon={Save}
                              onClick={() => void handleSave('draft')}
                              active={savingState === 'draft'}
                              tone="neutral"
                            />
                            <ActionButton
                              label={workspace.status === 'draft' ? 'Publish' : 'Publish update'}
                              icon={Send}
                              onClick={() => void handleSave('publish')}
                              active={savingState === 'publish'}
                              tone="primary"
                            />
                          </div>

                          <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/45 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                              Change of status
                            </p>
                            <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                              Use Complete after full time. Use Cancel only if the fixture is off or should no longer drive transport and squad decisions.
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <ActionButton
                                label="Complete"
                                icon={CheckCircle2}
                                onClick={() => setPendingTerminalAction('complete')}
                                active={savingState === 'complete'}
                                disabled={workspace.status !== 'published'}
                                tone="success"
                              />
                              <ActionButton
                                label="Cancel"
                                icon={Ban}
                                onClick={() => setPendingTerminalAction('cancel')}
                                active={savingState === 'cancel'}
                                tone="danger"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          {workspaceIsTerminal
                            ? 'This match day is completed or cancelled and is now locked to protect the final club record.'
                            : 'This role can review the board, but only coaches, the technical director, or admins can edit it.'}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                            <Bus size={20} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Transport</p>
                            <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Travel plan link</h2>
                          </div>
                        </div>

                        {workspace.transportPlan ? (
                          <StatusBadge status={workspace.transportPlan.status === 'updated' ? 'published' : workspace.transportPlan.status === 'draft' ? 'draft' : workspace.transportPlan.status === 'completed' ? 'completed' : 'cancelled'} />
                        ) : null}
                      </div>

                      {workspace.transportPlan ? (
                        <div className="mt-5 space-y-4">
                          <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/48 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                              {workspace.transportPlan.contextType}
                            </p>
                            <p className="mt-2 text-lg font-black text-[var(--color-dark)]">{workspace.transportPlan.title}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <MetaChip label="Date" value={workspace.transportPlan.eventDate} />
                              <MetaChip
                                label="Departure"
                                value={workspace.transportPlan.departureTime || 'TBD'}
                              />
                              <MetaChip label="Destination" value={workspace.transportPlan.destination} />
                              <MetaChip label="Driver" value={workspace.transportPlan.driverName} />
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(workspace.transportPlan!.linkPath)}
                            className="mwos-btn mwos-btn-secondary"
                          >
                            <Bus size={16} />
                            Open transport plan
                          </button>
                        </div>
                      ) : workspace.id ? (
                        <div className="mt-5 space-y-4">
                          <p className="text-sm font-semibold leading-6 text-[var(--color-mid)]">
                            Create a linked travel plan only when this fixture needs a departure time, driver assignment, or destination tracking.
                          </p>

                          {workspace.canManage && !workspaceIsTerminal ? (
                            <button
                              onClick={() => void handleCreateTransport()}
                              disabled={transportBusy}
                              className="mwos-btn mwos-btn-primary disabled:opacity-60"
                            >
                              {transportBusy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                              Create transport plan
                            </button>
                          ) : (
                            <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                              Only match-day managers can create or link a transport plan for this fixture.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          Save this fixture first, then create the linked transport plan from here.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                            <CalendarRange size={20} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Training context</p>
                            <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Week around the fixture</h2>
                          </div>
                        </div>

                        {workspace.trainingContext ? (
                          <MetaChip label="Week" value={workspace.trainingContext.weekStart} />
                        ) : null}
                      </div>

                      {workspace.trainingContext ? (
                        <div className="mt-5 space-y-4">
                          <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/48 p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                              {workspace.trainingContext.planId ? workspace.trainingContext.status : 'No saved plan yet'}
                            </p>
                            <p className="mt-2 text-lg font-black text-[var(--color-dark)]">
                              {workspace.trainingContext.headline || 'Open the training week for MD context'}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <MetaChip label="Before" value={String(workspace.trainingContext.preMatchSessionCount)} />
                              <MetaChip label="After" value={String(workspace.trainingContext.postMatchSessionCount)} />
                              <MetaChip label="Recovery" value={String(workspace.trainingContext.postMatchRecoveryCount)} />
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(workspace.trainingContext!.linkPath)}
                            className="mwos-btn mwos-btn-secondary"
                          >
                            <CalendarRange size={16} />
                            Open training week
                          </button>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          Save this fixture first, then open the surrounding training week from here.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary-deep)]/10 text-[var(--color-primary-deep)]">
                            <Users size={20} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Squad board</p>
                            <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Selection and availability</h2>
                          </div>
                        </div>

                        {workspace.canManage && !workspaceIsTerminal ? (
                          <button
                            onClick={() => void handleSaveSquad()}
                            disabled={savingSquad}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                          >
                            {savingSquad ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save squad
                          </button>
                        ) : null}
                      </div>

                      {workspace.rosterSetupNotice ? (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                          {workspace.rosterSetupNotice}
                        </div>
                      ) : null}

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard label="Available" value={totals.availableCount} tone="primary" />
                        <SummaryCard label="Doubtful" value={totals.doubtfulCount} tone="warning" />
                        <SummaryCard label="Unavailable" value={totals.unavailableCount} tone="danger" />
                        <SummaryCard label="Out" value={totals.outCount} tone="neutral" />
                      </div>

                      <div className="mt-5 space-y-3">
                        {workspace.players.map((player) => (
                          <div
                            key={player.clubPlayerId}
                            className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/48 p-4"
                          >
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-black text-[var(--color-dark)]">{player.playerName}</p>
                                  <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">
                                    {player.primaryPosition}
                                    {player.squadNumber !== null ? ` • #${player.squadNumber}` : ''}
                                    {!player.isActive ? ' • Inactive' : ''}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {canViewPlayerProfiles ? (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/players/${encodeURIComponent(`club:${player.clubPlayerId}`)}`)}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/18 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/8"
                                    >
                                      <UserRound size={12} />
                                      Profile
                                    </button>
                                  ) : null}
                                  <QuickTag label={player.availabilityStatus} tone={availabilityTone(player.availabilityStatus)} />
                                  <QuickTag label={player.selectionStatus} tone={selectionTone(player.selectionStatus)} />
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
                                <FieldBlock label="Availability">
                                  <select
                                    value={player.availabilityStatus}
                                    onChange={(event) => handlePlayerChange(player.clubPlayerId, 'availabilityStatus', event.target.value)}
                                    disabled={!workspace.canManage || workspaceIsTerminal}
                                    className="mwos-select-field mwos-input"
                                  >
                                    <option value="available">Available</option>
                                    <option value="doubtful">Doubtful</option>
                                    <option value="unavailable">Unavailable</option>
                                  </select>
                                </FieldBlock>

                                <FieldBlock label="Selection">
                                  <select
                                    value={player.selectionStatus}
                                    onChange={(event) => handlePlayerChange(player.clubPlayerId, 'selectionStatus', event.target.value)}
                                    disabled={!workspace.canManage || workspaceIsTerminal}
                                    className="mwos-select-field mwos-input"
                                  >
                                    <option value="starter">Starter</option>
                                    <option value="bench">Bench</option>
                                    <option value="out">Out</option>
                                  </select>
                                </FieldBlock>

                                <FieldBlock label="Coach note">
                                  <input
                                    value={player.notes}
                                    onChange={(event) => handlePlayerChange(player.clubPlayerId, 'notes', event.target.value)}
                                    disabled={!workspace.canManage || workspaceIsTerminal}
                                    className="mwos-input"
                                    placeholder="Short context for this player"
                                  />
                                </FieldBlock>
                              </div>
                            </div>
                          </div>
                        ))}

                        {workspace.players.length === 0 ? (
                          <div className="rounded-[24px] border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                            No internal roster players are available for this team yet.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-[var(--color-dark)]">No editable match-day board is open yet.</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                          Select an existing fixture from the left or create a new one if your role can manage this team.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <ConfirmActionModal
        open={pendingTerminalAction !== null}
        title={pendingTerminalAction === 'complete' ? 'Mark this match day as completed?' : 'Cancel this match day?'}
        description={pendingTerminalAction === 'complete'
          ? 'This locks the fixture and squad record after full time. It cannot be edited afterwards.'
          : 'This removes the fixture from active planning and locks the record. It cannot be edited afterwards.'}
        confirmLabel={pendingTerminalAction === 'complete' ? 'Mark completed' : 'Cancel match day'}
        tone={pendingTerminalAction === 'complete' ? 'warning' : 'danger'}
        loading={savingState !== null}
        onCancel={() => setPendingTerminalAction(null)}
        onConfirm={() => {
          const action = pendingTerminalAction;
          if (!action) return;
          void handleSave(action).finally(() => setPendingTerminalAction(null));
        }}
      />
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/10 px-4 py-3 shadow-[0_16px_32px_rgba(12,16,53,0.14)] backdrop-blur-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/64">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mwos-form-label mb-0 text-[var(--color-mid)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function StatusBadge({ status }: { status: MatchDaySummary['status'] }) {
  const map: Record<MatchDaySummary['status'], string> = {
    draft: 'bg-white text-[var(--color-primary)] border-[var(--color-primary)]/16',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${map[status]}`}>
      {status}
    </span>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'neutral' | 'danger' }) {
  const tones = {
    primary: 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]',
    neutral: 'bg-slate-100 text-slate-700',
    danger: 'bg-rose-50 text-rose-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tones[tone]}`}>
      {label} · {value}
    </span>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'warning' | 'danger' | 'neutral' }) {
  const tones = {
    primary: 'mwos-card-tone-training',
    warning: 'mwos-card-tone-alert',
    danger: 'mwos-card-tone-danger',
    neutral: 'border-[var(--color-mid)]/12 bg-[var(--color-light)]/55',
  };

  return (
    <div className={`rounded-[24px] border p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[var(--color-dark)]">{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  active,
  disabled = false,
  tone,
}: {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  tone: 'neutral' | 'primary' | 'success' | 'danger';
}) {
  const tones = {
    neutral: 'mwos-btn-secondary',
    primary: 'mwos-btn-primary',
    success: 'mwos-btn-success',
    danger: 'mwos-btn-danger',
  };

  return (
    <button
      onClick={onClick}
      disabled={active || disabled}
      className={`mwos-btn w-full disabled:opacity-70 ${tones[tone]}`}
    >
      {active ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
      {label}
    </button>
  );
}

function QuickTag({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
      {label}
    </span>
  );
}

function availabilityTone(value: MatchDayPlayerSelection['availabilityStatus']) {
  if (value === 'unavailable') return 'bg-rose-50 text-rose-700';
  if (value === 'doubtful') return 'bg-amber-50 text-amber-700';
  return 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]';
}

function selectionTone(value: MatchDayPlayerSelection['selectionStatus']) {
  if (value === 'starter') return 'bg-emerald-50 text-emerald-700';
  if (value === 'bench') return 'bg-slate-100 text-slate-700';
  return 'bg-[var(--color-primary-deep)]/8 text-[var(--color-primary-deep)]';
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
      {label} · {value}
    </span>
  );
}
