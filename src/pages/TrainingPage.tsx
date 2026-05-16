import { useEffect, useMemo, useState, type Attributes } from 'react';
import { AlertCircle, CalendarRange, CheckCircle2, Loader2, Save, Send, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import TrainingCommentsPanel from '../components/training/TrainingCommentsPanel';
import TrainingDayEditor from '../components/training/TrainingDayEditor';
import TrainingPlanBoard from '../components/training/TrainingPlanBoard';
import {
  addTrainingPlanComment,
  buildTrainingLinkPath,
  fetchTrainingPlanSummaries,
  fetchTrainingTeams,
  fetchTrainingWorkspace,
  getTrainingWeekRangeLabel,
  getTrainingWeekStart,
  saveTrainingPlan,
  type TrainingPlanDay,
  type TrainingPlanSummary,
  type TrainingWorkspace,
} from '../lib/trainingData';
import { useAuthStore } from '../store/auth';

function normalizeDayIndex(value: string | null) {
  const parsed = Number(value ?? '0');
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 6) return 0;
  return parsed;
}

function WorkspaceMetric({
  label,
  value,
  help,
}: {
  label: string;
  value: string | number;
  help: string;
}) {
  return (
    <article className="rounded-[22px] border border-[var(--color-mid)]/14 bg-white p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{help}</p>
    </article>
  );
}

type TeamWeekCardProps = Attributes & {
  item: TrainingPlanSummary;
  selected: boolean;
  onOpen: () => void;
};

function TeamWeekCard({
  item,
  selected,
  onOpen,
}: TeamWeekCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`rounded-[24px] border p-4 text-left shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-all ${
        selected
          ? 'border-[var(--color-primary)]/22 bg-[var(--color-primary)]/5'
          : 'border-[var(--color-mid)]/14 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{item.teamName}</p>
          <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">
            {item.headline || 'Weekly training plan'}
          </h3>
        </div>
        <span className="rounded-full bg-[var(--color-light)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-dark)]">
          {item.status}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
        {item.objective || 'No objective added yet.'}
      </p>
    </button>
  );
}

export default function TrainingPage() {
  const { user, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState<Array<{ id: string; slug: string; name: string; is_active: boolean }>>([]);
  const [plans, setPlans] = useState<TrainingPlanSummary[]>([]);
  const [workspace, setWorkspace] = useState<TrainingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'draft' | 'publish' | 'archive' | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');

  const weekStart = searchParams.get('week') || getTrainingWeekStart();
  const selectedDayIndex = normalizeDayIndex(searchParams.get('day'));
  const teamId = searchParams.get('team') || '';

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const availableTeams = await fetchTrainingTeams();
        if (!isMounted) return;

        setTeams(availableTeams);

        if (!availableTeams.length) {
          setLoading(false);
          return;
        }

        if (!teamId || !availableTeams.some((team) => team.id === teamId)) {
          const fallbackTeamId = availableTeams[0]?.id;
          if (fallbackTeamId) {
            setSearchParams(
              new URLSearchParams({
                team: fallbackTeamId,
                week: weekStart,
                day: String(selectedDayIndex),
              }),
              { replace: true },
            );
          }
        }
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load training teams.', loadError);
        setError(loadError?.message || 'Failed to load team access.');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [teamId, weekStart, selectedDayIndex, setSearchParams]);

  useEffect(() => {
    if (!teamId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const [weekPlans, planWorkspace] = await Promise.all([
          fetchTrainingPlanSummaries(weekStart),
          fetchTrainingWorkspace(teamId, weekStart),
        ]);

        if (!isMounted) return;
        setPlans(weekPlans);
        setWorkspace(planWorkspace);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load training workspace.', loadError);
        setError(loadError?.message || 'Failed to load the training workspace.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [teamId, weekStart]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const selectedDay = workspace?.days[selectedDayIndex] || null;
  const nextTrainingDay = useMemo(
    () => workspace?.days.find((day) => day.dayType === 'training' && day.startTime) || null,
    [workspace],
  );
  const trainingCount = useMemo(
    () => workspace?.days.filter((day) => day.dayType === 'training').length || 0,
    [workspace],
  );
  const recoveryCount = useMemo(
    () => workspace?.days.filter((day) => day.dayType === 'active_recovery').length || 0,
    [workspace],
  );

  const updateSearch = (next: { teamId?: string; weekStart?: string; dayIndex?: number }) => {
    const params = new URLSearchParams(searchParams);
    if (next.teamId) params.set('team', next.teamId);
    if (next.weekStart) params.set('week', next.weekStart);
    if (typeof next.dayIndex === 'number') params.set('day', String(next.dayIndex));
    setSearchParams(params, { replace: true });
  };

  const handleWeekChange = (value: string) => {
    const normalized = getTrainingWeekStart(new Date(`${value}T09:00:00`));
    updateSearch({ weekStart: normalized, dayIndex: 0 });
  };

  const handleDayChange = (nextDay: TrainingPlanDay) => {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      days: workspace.days.map((day) => (day.dayIndex === nextDay.dayIndex ? nextDay : day)),
    });
  };

  const handleSave = async (action: 'draft' | 'publish' | 'archive') => {
    if (!workspace) return;

    setSavingState(action);
    setError('');
    setWarning('');

    try {
      const result = await saveTrainingPlan(
        {
          teamId: workspace.team.id,
          weekStart: workspace.weekStart,
          headline: workspace.headline,
          objective: workspace.objective,
          days: workspace.days,
        },
        action,
      );

      setWorkspace(result.workspace);
      setPlans(await fetchTrainingPlanSummaries(workspace.weekStart));
      setSuccess(
        action === 'publish'
          ? 'Training plan published.'
          : action === 'archive'
            ? 'Training plan archived.'
            : 'Training plan saved.',
      );
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (saveError: any) {
      console.error('Failed to save training plan.', saveError);
      setError(saveError?.message || 'Failed to save training plan.');
    } finally {
      setSavingState(null);
    }
  };

  const handleCommentSubmit = async (content: string) => {
    if (!workspace?.planId) {
      setError('Save the training plan first, then add comments.');
      return;
    }

    setCommentSaving(true);
    setError('');
    setWarning('');
    try {
      const result = await addTrainingPlanComment(workspace.planId, content, selectedDay?.id || null);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              comments: [result.comment, ...current.comments],
            }
          : current,
      );
      setSuccess('Comment posted.');
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (commentError: any) {
      console.error('Failed to add training comment.', commentError);
      setError(commentError?.message || 'Failed to add comment.');
    } finally {
      setCommentSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-light)] md:flex">
      <AppSidebar current="training" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-4 pb-28 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-5 py-6 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">
                Club Module
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <CalendarRange size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="mwos-display text-[2.2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Training Schedule
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/82 md:text-base">
                    Build the weekly microcycle, adjust sessions live, keep Technical Director feedback in one place and deliver staff reminders without leaving the club workspace.
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
            <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              {warning}
            </section>
          ) : null}

          {success ? (
            <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {success}
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                    Planning scope
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                    {workspace?.team.name || 'Assigned team'}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                    {getTrainingWeekRangeLabel(weekStart)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                      Team
                    </label>
                    <select
                      value={teamId}
                      onChange={(event) => updateSearch({ teamId: event.target.value, dayIndex: 0 })}
                      className="w-full rounded-2xl border border-[var(--color-mid)]/22 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                      Week start
                    </label>
                    <input
                      type="date"
                      value={weekStart}
                      onChange={(event) => handleWeekChange(event.target.value)}
                      className="w-full rounded-2xl border border-[var(--color-mid)]/22 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSave('draft')}
                  disabled={loading || !workspace?.canManage || savingState !== null}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-primary)]/16 bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {savingState === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save plan
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave('publish')}
                  disabled={loading || !workspace?.canManage || savingState !== null}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-primary)] disabled:opacity-50"
                >
                  {savingState === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Publish plan
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave('archive')}
                  disabled={loading || !workspace?.canManage || !workspace?.planId || savingState !== null}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] disabled:opacity-50"
                >
                  {savingState === 'archive' ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Archive
                </button>
              </div>

              {workspace ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <WorkspaceMetric label="Training days" value={trainingCount} help="Sessions scheduled for this microcycle." />
                  <WorkspaceMetric label="Recovery days" value={recoveryCount} help="Active recovery touchpoints prepared for the week." />
                  <WorkspaceMetric
                    label="Next session"
                    value={nextTrainingDay?.startTime || '--:--'}
                    help={nextTrainingDay ? `${nextTrainingDay.weekday}${nextTrainingDay.location ? ` · ${nextTrainingDay.location}` : ''}` : 'Add a training day to surface the next session.'}
                  />
                </div>
              ) : null}
            </article>

            <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                Week overview
              </p>
              <h2 className="mt-2 text-xl font-black text-[var(--color-dark)]">Published plans in this week</h2>
              <div className="mt-4 space-y-3">
                {plans.length ? (
                  plans.map((item) => (
                    <TeamWeekCard
                      key={item.id}
                      item={item}
                      selected={item.teamId === teamId && item.weekStart === weekStart}
                      onOpen={() =>
                        updateSearch({
                          teamId: item.teamId,
                          weekStart: item.weekStart,
                          dayIndex: 0,
                        })
                      }
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] border border-[var(--color-mid)]/14 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                    No saved plans yet for this week. Start from the editor and save the first team plan.
                  </div>
                )}
              </div>
            </article>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading training workspace…</p>
            </section>
          ) : null}

          {!loading && workspace ? (
            <>
              <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                      Weekly headline
                    </label>
                    <input
                      value={workspace.headline}
                      onChange={(event) =>
                        setWorkspace((current) =>
                          current ? { ...current, headline: event.target.value } : current,
                        )
                      }
                      disabled={!workspace.canManage}
                      placeholder="Pre-season speed / match prep / recovery balance"
                      className="w-full rounded-2xl border border-[var(--color-mid)]/22 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                      Weekly objective
                    </label>
                    <textarea
                      value={workspace.objective}
                      onChange={(event) =>
                        setWorkspace((current) =>
                          current ? { ...current, objective: event.target.value } : current,
                        )
                      }
                      disabled={!workspace.canManage}
                      rows={3}
                      placeholder="What is the main aim of this week for the team?"
                      className="w-full rounded-2xl border border-[var(--color-mid)]/22 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-dark)]">
                    Status · {workspace.status}
                  </span>
                  {workspace.publishedAt ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                      Published
                    </span>
                  ) : null}
                  {workspace.canManage ? (
                    <span className="rounded-full bg-[var(--color-primary)]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
                      Coach/Admin editable
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                      Comment-only access
                    </span>
                  )}
                </div>
              </section>

              <TrainingPlanBoard
                days={workspace.days}
                selectedDayIndex={selectedDayIndex}
                onSelect={(index) => updateSearch({ dayIndex: index })}
              />

              <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                {selectedDay ? (
                  <TrainingDayEditor
                    day={selectedDay}
                    canEdit={workspace.canManage}
                    onChange={handleDayChange}
                  />
                ) : (
                  <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
                    <p className="text-sm font-semibold text-[var(--color-mid)]">
                      Choose a day from the board to edit the session details.
                    </p>
                  </article>
                )}

                {workspace.planId ? (
                  <TrainingCommentsPanel
                    comments={workspace.comments}
                    canComment={workspace.canComment}
                    isSubmitting={commentSaving}
                    onSubmit={handleCommentSubmit}
                  />
                ) : (
                  <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 text-[var(--color-primary)]" size={20} />
                      <div>
                        <h2 className="text-lg font-black text-[var(--color-dark)]">Comments unlock after first save</h2>
                        <p className="mt-2 text-sm font-semibold leading-7 text-[var(--color-mid)]">
                          Save or publish the plan first. Once the plan exists in the database, coaches and the Technical Director can discuss it here.
                        </p>
                      </div>
                    </div>
                  </article>
                )}
              </section>
            </>
          ) : null}

          {!loading && !workspace && !error ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-6 shadow-[0_18px_45px_rgba(49,39,131,0.06)]">
              <p className="text-sm font-semibold text-[var(--color-mid)]">
                No team access is configured for this account yet.
              </p>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
