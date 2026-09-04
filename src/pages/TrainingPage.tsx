import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  FileSearch,
  FileText,
  LayoutGrid,
  Loader2,
  MessageCircleMore,
  PenSquare,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import TrainingCommentsPanel from '../components/training/TrainingCommentsPanel';
import TrainingDayEditor from '../components/training/TrainingDayEditor';
import TrainingImportSheet from '../components/training/TrainingImportSheet';
import TrainingPlanBoard from '../components/training/TrainingPlanBoard';
import TrainingReviewSummaryCard from '../components/training/TrainingReviewSummaryCard';
import TrainingSourceCard from '../components/training/TrainingSourceCard';
import TrainingWhatsAppShareSheet from '../components/training/TrainingWhatsAppShareSheet';
import { userHasAnyRole } from '../lib/data';
import {
  addTrainingPlanComment,
  clearTrainingPlanSource,
  createTrainingSourceSignedUrl,
  fetchTrainingTeams,
  fetchTrainingWorkspace,
  getTrainingWeekRangeLabel,
  getTrainingWeekStart,
  saveTrainingPlan,
  type TrainingPlanDay,
  type TrainingPlanSourceDraftInput,
  type TrainingWorkspace,
} from '../lib/trainingData';
import { prepareTrainingImportDraft } from '../lib/trainingImportClient';
import type { ImportedTrainingDraft, TrainingImportKind } from '../lib/trainingImportDomain';
import {
  getTrainingCoachFlowState,
  type TrainingCoachFlowActionKind,
} from '../lib/trainingCoachFlowDomain';
import { buildTrainingWhatsAppMessage } from '../lib/trainingShareDomain';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/auth';

function normalizeDayIndex(value: string | null) {
  const parsed = Number(value ?? '0');
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 6) return 0;
  return parsed;
}

function getCoachPrimaryActionClass(kind: TrainingCoachFlowActionKind) {
  if (kind === 'review_missing_info') {
    return 'mwos-btn-warning';
  }
  if (kind === 'share_plan') {
    return 'mwos-btn-success';
  }
  return 'mwos-btn-primary';
}

function getCoachPrimaryActionIcon(kind: TrainingCoachFlowActionKind) {
  if (kind === 'add_sessions') return PenSquare;
  if (kind === 'review_missing_info') return FileSearch;
  if (kind === 'share_plan') return MessageCircleMore;
  return Send;
}

function getCoachPrimaryActionMobileLabel(kind: TrainingCoachFlowActionKind) {
  if (kind === 'add_sessions') return 'Continue';
  if (kind === 'review_missing_info') return 'Review day';
  if (kind === 'share_plan') return 'Share';
  return 'Publish';
}

function getCoachMobileActionCopy(kind: TrainingCoachFlowActionKind) {
  if (kind === 'review_missing_info') {
    return {
      eyebrow: 'Review first',
      title: 'Fix the highlighted days before you publish',
      helper:
        'Open the first flagged session, complete the missing details, then come back to publish the week.',
    };
  }

  if (kind === 'share_plan') {
    return {
      eyebrow: 'Plan is live',
      title: 'Share only when staff need the final message',
      helper:
        'The training week is already published. Save changes inside the editor, then use Share when the WhatsApp summary is needed.',
    };
  }

  return {
    eyebrow: 'Plan actions',
    title: 'Save progress first, then publish the week',
    helper:
      'Use Save while you are editing. Use the main action only when the day details are ready for staff visibility.',
  };
}

function buildImportedSourceCard(source: TrainingPlanSourceDraftInput) {
  return {
    sourceKind: source.sourceKind,
    fileName: source.fileName,
    previewText: source.previewText,
    extractionStatus: source.extractionStatus || 'draft_generated',
  };
}

function clearImportMetadata(days: TrainingPlanDay[]) {
  return days.map((day) => ({
    ...day,
    importReviewState: 'ready' as const,
    importedExcerpt: '',
  }));
}

function mergeImportedTrainingDays(currentDays: TrainingPlanDay[], importedDraft: ImportedTrainingDraft): TrainingPlanDay[] {
  return currentDays.map((currentDay, dayIndex) => {
    const importedDay = importedDraft.days[dayIndex];
    if (!importedDay) {
      return currentDay;
    }

    return {
      ...currentDay,
      ...importedDay,
      id: currentDay.id,
      planId: currentDay.planId,
      reminderSentAt: currentDay.reminderSentAt,
      lastImportantChangeAt: currentDay.lastImportantChangeAt,
      updatedAt: currentDay.updatedAt,
      importReviewState: importedDay.reviewState,
      importedExcerpt: importedDay.importedExcerpt,
    };
  });
}

function resolveImportedFocusDay(days: TrainingPlanDay[]) {
  return (
    days.find((day) => day.importReviewState === 'missing_info')?.dayIndex ??
    days.find((day) => day.importReviewState === 'needs_review')?.dayIndex ??
    days.find((day) => day.dayType !== 'rest')?.dayIndex ??
    0
  );
}

function hasTrainingShareContent(day: TrainingPlanDay) {
  return day.dayType !== 'rest' || Boolean(day.startTime || day.endTime || day.location || day.notes);
}

export default function TrainingPage() {
  const { user, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState<Array<{ id: string; slug: string; name: string; is_active: boolean }>>([]);
  const [workspace, setWorkspace] = useState<TrainingWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'draft' | 'publish' | 'archive' | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importMode, setImportMode] = useState<TrainingImportKind>('pdf_import');
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [draftSource, setDraftSource] = useState<TrainingPlanSourceDraftInput | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState('');

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
        const planWorkspace = await fetchTrainingWorkspace(teamId, weekStart);

        if (!isMounted) return;
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
  const coachFlow = useMemo(
    () =>
      workspace
        ? getTrainingCoachFlowState({
            days: workspace.days,
            status: workspace.status,
            publishedAt: workspace.publishedAt,
            hasSource: Boolean(draftSource || workspace.source),
          })
        : null,
    [draftSource, workspace],
  );
  const issueDayCount = (coachFlow?.counts.missingInfoDays || 0) + (coachFlow?.counts.reviewDays || 0);
  const hasPlanActivity = useMemo(
    () =>
      Boolean(
        draftSource ||
          workspace?.source ||
          workspace?.planId ||
          workspace?.headline?.trim() ||
          workspace?.objective?.trim() ||
          workspace?.days.some((day) => hasTrainingShareContent(day) || day.importReviewState !== 'ready'),
      ),
    [draftSource, workspace],
  );
  const canViewRawSource = useMemo(
    () => userHasAnyRole(user, ['admin', 'coach', 'technical_director']),
    [user],
  );
  const displaySourceCard = useMemo(
    () => (draftSource ? buildImportedSourceCard(draftSource) : workspace?.source),
    [draftSource, workspace?.source],
  );
  const dayLabelsById = useMemo(
    () =>
      workspace?.days.reduce<Record<string, string>>((accumulator, day) => {
        if (day.id) {
          accumulator[day.id] = day.weekday;
        }
        return accumulator;
      }, {}) || {},
    [workspace?.days],
  );
  const nextReviewDayIndex = useMemo(
    () => (workspace ? resolveImportedFocusDay(workspace.days) : 0),
    [workspace],
  );
  const nextReviewDayLabel = useMemo(() => {
    if (!workspace) return null;
    return workspace.days.find((day) => day.dayIndex === nextReviewDayIndex)?.weekday || null;
  }, [nextReviewDayIndex, workspace]);

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

  const handleJumpToTrainingIntake = () => {
    const target = document.getElementById('training-day-editor-section');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleJumpToDayEditor = () => {
    const target = document.getElementById('training-day-editor-section');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      const sourcePayload = draftSource
        ? {
            ...draftSource,
            extractionStatus:
              action === 'publish'
                ? 'reviewed'
                : draftSource.extractionStatus || 'draft_generated',
          }
        : undefined;

      const result = await saveTrainingPlan(
        {
          teamId: workspace.team.id,
          weekStart: workspace.weekStart,
          headline: workspace.headline,
          objective: workspace.objective,
          days: workspace.days,
          source: sourcePayload,
        },
        action,
      );

      setWorkspace(result.workspace);
      setDraftSource(null);
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

  const openImportSheet = (mode: TrainingImportKind) => {
    setImportMode(mode);
    setSelectedImportFile(null);
    setImportError('');
    setImportSheetOpen(true);
  };

  const applyImportedDraft = (draft: ImportedTrainingDraft, source: TrainingPlanSourceDraftInput) => {
    if (!workspace) {
      return;
    }

    const mergedDays = mergeImportedTrainingDays(workspace.days, draft);
    const importedObjective = draft.days.find((day) => day.objectives.trim())?.objectives || '';

    setWorkspace({
      ...workspace,
      headline: workspace.headline.trim() || `${workspace.team.name} weekly training plan`,
      objective: workspace.objective.trim() || importedObjective,
      days: mergedDays,
    });
    setDraftSource(source);
    setShareOpen(false);
    setImportSheetOpen(false);
    setSelectedImportFile(null);
    setImportError('');
    setWarning('');
    setSuccess('Imported draft ready. Review the highlighted days before publishing.');
    updateSearch({ dayIndex: resolveImportedFocusDay(mergedDays) });
  };

  const handleCreateManual = () => {
    const nextDayIndex = workspace ? resolveImportedFocusDay(workspace.days) : 0;

    setDraftSource(null);
    setImportSheetOpen(false);
    setSelectedImportFile(null);
    setImportError('');
    setWarning('');
    setSuccess('Manual form ready. Choose the day and fill the session in one place.');
    updateSearch({ dayIndex: nextDayIndex });
    window.setTimeout(handleJumpToDayEditor, 80);
  };

  const handleImportSource = async () => {
    if (!workspace) return;

    if (!selectedImportFile) {
      setImportError('Choose a file first.');
      return;
    }

    setImporting(true);
    setImportError('');
    setError('');

    try {
      const prepared = await prepareTrainingImportDraft(selectedImportFile, workspace.weekStart);
      applyImportedDraft(prepared.draft, prepared.source);
    } catch (loadError: any) {
      console.error('Failed to import training source.', loadError);
      setImportError(loadError?.message || 'The training source could not be imported.');
    } finally {
      setImporting(false);
    }
  };

  const openLocalSourcePreview = (file: File) => {
    const objectUrl = window.URL.createObjectURL(file);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
  };

  const handleViewSource = async () => {
    try {
      if (draftSource?.file) {
        openLocalSourcePreview(draftSource.file);
        return;
      }

      if (!workspace?.source?.storagePath) {
        setWarning('No original training source is attached yet.');
        return;
      }

      const signedUrl = await createTrainingSourceSignedUrl(workspace.source.storagePath);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (viewError: any) {
      console.error('Failed to open training source.', viewError);
      setError(viewError?.message || 'The source file could not be opened.');
    }
  };

  const handleReplaceSource = () => {
    const sourceKind = draftSource?.sourceKind || workspace?.source?.sourceKind || 'pdf_import';
    openImportSheet(sourceKind === 'image_import' ? 'image_import' : 'pdf_import');
  };

  const handleClearImport = async () => {
    if (!workspace) return;

    setError('');
    setWarning('');
    setImportError('');

    if (draftSource) {
      setDraftSource(null);
      setWorkspace({
        ...workspace,
        days: clearImportMetadata(workspace.days),
      });
      setSuccess('Imported draft cleared. The manual editor is ready again.');
      return;
    }

    if (!workspace.planId || !workspace.source) {
      setWarning('There is no imported source to clear.');
      return;
    }

    setImporting(true);
    try {
      await clearTrainingPlanSource(workspace.planId, workspace.source);
      setWorkspace({
        ...workspace,
        source: null,
        days: clearImportMetadata(workspace.days),
      });
      setSuccess('Imported source cleared. The saved plan is now back to manual editing.');
    } catch (clearError: any) {
      console.error('Failed to clear training import.', clearError);
      setError(clearError?.message || 'The imported source could not be cleared.');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenWhatsAppShare = () => {
    if (!workspace) return;

    const shareableDays = workspace.days.filter(hasTrainingShareContent);
    if (!shareableDays.length) {
      setWarning('Add at least one training day before creating a WhatsApp message.');
      return;
    }

    const mode = shareableDays.length === 1 ? 'single_day' : 'weekly_summary';
    const nextText = buildTrainingWhatsAppMessage({
      mode,
      teamName: workspace.team.name,
      weekLabel: getTrainingWeekRangeLabel(workspace.weekStart),
      days: shareableDays,
    });

    setShareText(nextText);
    setShareOpen(true);
  };

  const handleCoachPrimaryAction = () => {
    if (!coachFlow) {
      handleJumpToTrainingIntake();
      return;
    }

    if (coachFlow.primaryAction.kind === 'add_sessions') {
      handleJumpToTrainingIntake();
      return;
    }

    if (coachFlow.primaryAction.kind === 'review_missing_info') {
      updateSearch({ dayIndex: coachFlow.primaryAction.targetDayIndex ?? nextReviewDayIndex });
      window.setTimeout(handleJumpToDayEditor, 80);
      return;
    }

    if (coachFlow.primaryAction.kind === 'publish_plan') {
      void handleSave('publish');
      return;
    }

    handleOpenWhatsAppShare();
  };

  const primaryActionKind = coachFlow?.primaryAction.kind || 'add_sessions';
  const PrimaryActionIcon = getCoachPrimaryActionIcon(primaryActionKind);
  const shareIsPrimary = primaryActionKind === 'share_plan';
  const showCoachMobileActionCard =
    workspace?.canManage && hasPlanActivity && primaryActionKind !== 'add_sessions';
  const coachMobileActionCopy = getCoachMobileActionCopy(primaryActionKind);

  return (
    <div className="min-h-dvh bg-[var(--color-light)] md:flex">
      <AppSidebar current="training" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto px-3 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)] md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <section className="hidden overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)] sm:block">
            <div className="mwos-ribbon-surface px-4 py-4 text-white md:px-8 md:py-8">
              <p className="mwos-hero-kicker text-white/68">
                Club Module
              </p>
              <div className="mwos-surface-intro mt-4">
                <div className="mwos-surface-intro-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white md:h-12 md:w-12">
                  <CalendarRange size={20} />
                </div>
                <div className="mwos-surface-intro-copy">
                  <h1 className="mwos-display mwos-hero-title text-white">
                    Training Schedule
                  </h1>
                  <p className="mwos-hero-copy mt-2.5 hidden max-w-3xl text-pretty text-white/82 sm:block md:mt-3">
                    Build the weekly microcycle, adjust sessions live, keep Technical Director feedback in one place and deliver staff reminders without leaving the club workspace.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <section className="mwos-card-tone-danger rounded-[24px] border p-4 text-sm font-semibold text-[var(--color-accent-deep)]">
              {error}
            </section>
          ) : null}

          {warning ? (
            <section className="mwos-card-tone-alert rounded-[24px] border p-4 text-sm font-semibold text-[var(--color-accent)]">
              {warning}
            </section>
          ) : null}

          {success ? (
            <section className="mwos-card-tone-training rounded-[24px] border p-4 text-sm font-semibold text-[var(--color-primary-deep)]">
              {success}
            </section>
          ) : null}

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading training workspace…</p>
            </section>
          ) : null}

          {!loading && workspace ? (
            <>
              {workspace.matchContext ? (
                <section className="rounded-[28px] border border-[var(--color-primary)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="mwos-surface-intro">
                      <div className="mwos-surface-intro-icon flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                        <CalendarRange size={18} />
                      </div>
                      <div className="mwos-surface-intro-copy">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
                          Match week context
                        </p>
                        <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">
                          {workspace.matchContext.opponent}
                          {workspace.matchContext.competition ? ` · ${workspace.matchContext.competition}` : ''}
                        </h2>
                        <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                          {workspace.matchContext.matchDate}
                          {workspace.matchContext.kickoffTime ? ` · ${workspace.matchContext.kickoffTime}` : ''}
                          {workspace.matchContext.venue ? ` · ${workspace.matchContext.venue}` : ''}
                        </p>
                      </div>
                    </div>

                    <a
                      href={workspace.matchContext.linkPath}
                      className="mwos-btn mwos-btn-secondary w-full justify-center md:w-auto"
                    >
                      <ArrowRight size={16} />
                      Open Match Day
                    </a>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-[var(--color-primary)]/10 bg-[var(--color-primary)]/5 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Build-up sessions</p>
                      <p className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                        {workspace.matchContext.preMatchSessionCount}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[var(--color-primary)]/10 bg-[var(--color-primary)]/5 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Post-match sessions</p>
                      <p className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                        {workspace.matchContext.postMatchSessionCount}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[var(--color-primary)]/10 bg-[var(--color-primary)]/5 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Recovery after match</p>
                      <p className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                        {workspace.matchContext.postMatchRecoveryCount}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {issueDayCount ? (
                <TrainingReviewSummaryCard
                  days={workspace.days}
                  nextReviewDayLabel={nextReviewDayLabel}
                  canManage={workspace.canManage}
                  onJumpToNextIssue={() => {
                    updateSearch({ dayIndex: nextReviewDayIndex });
                    window.setTimeout(handleJumpToDayEditor, 80);
                  }}
                />
              ) : null}

              <section id="training-day-editor-section" className="scroll-mt-4 md:scroll-mt-6">
                {selectedDay ? (
                  <TrainingDayEditor
                    day={selectedDay}
                    canEdit={workspace.canManage}
                    onChange={handleDayChange}
                    teams={teams}
                    teamId={teamId}
                    days={workspace.days}
                    teamName={workspace.team.name}
                    weekStart={workspace.weekStart}
                    weekLabel={getTrainingWeekRangeLabel(workspace.weekStart)}
                    onSelectTeam={(nextTeamId) => {
                      updateSearch({ teamId: nextTeamId, dayIndex: 0 });
                    }}
                    onSelectWeek={handleWeekChange}
                    onSelectDay={(index) => {
                      updateSearch({ dayIndex: index });
                    }}
                    onScanPhoto={() => openImportSheet('image_import')}
                    onImportPdf={() => openImportSheet('pdf_import')}
                    onTypeManual={handleCreateManual}
                    issueDayCount={issueDayCount}
                    onSaveDraft={() => void handleSave('draft')}
                    isSavingDraft={savingState === 'draft'}
                  />
                ) : (
                  <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
                    <p className="text-sm font-semibold text-[var(--color-mid)]">
                      Choose a day to edit the session details.
                    </p>
                  </article>
                )}
              </section>

              {showCoachMobileActionCard ? (
                <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:hidden">
                  <div className="mwos-surface-intro">
                    <div className="mwos-surface-intro-icon flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                      <ArrowRight size={18} />
                    </div>
                    <div className="mwos-surface-intro-copy">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
                        {coachMobileActionCopy.eyebrow}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-[var(--color-dark)]">
                        {coachMobileActionCopy.title}
                      </h2>
                      <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                        {coachMobileActionCopy.helper}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'mt-4 grid gap-2',
                      'grid-cols-2',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void handleSave('draft')}
                      disabled={loading || savingState !== null}
                      className="mwos-btn mwos-btn-secondary w-full uppercase tracking-[0.12em]"
                    >
                      {savingState === 'draft' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={handleCoachPrimaryAction}
                      disabled={loading || savingState !== null}
                      className={cn(
                        'mwos-btn w-full uppercase tracking-[0.12em]',
                        getCoachPrimaryActionClass(primaryActionKind),
                      )}
                    >
                      {savingState === 'publish' && primaryActionKind === 'publish_plan' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <PrimaryActionIcon size={16} />
                      )}
                      {getCoachPrimaryActionMobileLabel(primaryActionKind)}
                    </button>
                  </div>
                </section>
              ) : null}

              <details className="group hidden rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:block md:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div className="mwos-surface-intro">
                    <div className="mwos-surface-intro-icon flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                      <FileText size={18} />
                    </div>
                    <div className="mwos-surface-intro-copy">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
                        Optional weekly context
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">
                        Add extra context only if staff need it
                      </h2>
                      <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-mid)]">
                        Keep this light. Coaches should spend most of their time in the daily session form, not in extra weekly copy or duplicate review surfaces.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-xs font-black text-[var(--color-primary)]">
                    Open
                  </span>
                </summary>
                <div className="mt-5 grid gap-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mwos-form-label text-[var(--color-mid)]">
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
                      <label className="mwos-form-label text-[var(--color-mid)]">
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

                  <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/45 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                        <LayoutGrid size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                          Week preview
                        </p>
                        <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
                          This is a read-only preview of the week. The form above stays the only place where a coach edits the plan.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <TrainingPlanBoard
                        days={workspace.days}
                        selectedDayIndex={selectedDayIndex}
                        onSelect={(index) => {
                          updateSearch({ dayIndex: index });
                          window.setTimeout(handleJumpToDayEditor, 80);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </details>

              {canViewRawSource && displaySourceCard ? (
                <TrainingSourceCard
                  source={displaySourceCard}
                  canManage={workspace.canManage}
                  onViewSource={() => void handleViewSource()}
                  onReplaceSource={handleReplaceSource}
                  onClearSource={() => void handleClearImport()}
                />
              ) : null}

              <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <article className="hidden rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:block md:p-6">
                  <div className="mwos-surface-intro">
                    <div className="mwos-surface-intro-icon flex size-9 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                      <Save size={18} />
                    </div>
                    <div className="mwos-surface-intro-copy">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
                        Plan actions
                      </p>
                      <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">
                        Keep one forward action active at a time
                      </h2>
                      <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-mid)]">
                        Save while you edit. Publish when staff should rely on the plan. Share only after the plan is ready to be seen in WhatsApp.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void handleSave('draft')}
                      disabled={!workspace.canManage || savingState !== null}
                      className="mwos-btn mwos-btn-secondary"
                    >
                      {savingState === 'draft' ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave('publish')}
                      disabled={!workspace.canManage || savingState !== null}
                      className={cn('mwos-btn', shareIsPrimary ? 'mwos-btn-secondary' : 'mwos-btn-primary')}
                    >
                      {savingState === 'publish' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                      Publish
                    </button>
                  </div>

                  {workspace.planId ? (
                    <div className="mt-4 space-y-3 border-t border-[var(--color-mid)]/10 pt-4">
                      <div className="rounded-[20px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/45 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                          After publish
                        </p>
                        <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                          Use WhatsApp only when the saved plan is ready for staff to act on. Archive stays a back-office action.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleOpenWhatsAppShare}
                          disabled={savingState !== null}
                          className={cn('mwos-btn', shareIsPrimary ? 'mwos-btn-primary' : 'mwos-btn-tertiary')}
                        >
                          <MessageCircleMore size={17} />
                          Share WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSave('archive')}
                          disabled={!workspace.canManage || savingState !== null}
                          className="mwos-btn mwos-btn-danger"
                        >
                          {savingState === 'archive' ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                          Archive
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                      WhatsApp sharing unlocks after the first save.
                    </p>
                  )}
                </article>

                {workspace.planId ? (
                  <TrainingCommentsPanel
                    comments={workspace.comments}
                    canComment={workspace.canComment}
                    isSubmitting={commentSaving}
                    onSubmit={handleCommentSubmit}
                    selectedDayLabel={selectedDay?.weekday || null}
                    dayLabelsById={dayLabelsById}
                  />
                ) : (
                  <article className="hidden rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:block md:p-6">
                    <div className="mwos-surface-intro">
                      <div className="mwos-surface-intro-icon mt-0.5 text-[var(--color-primary)]">
                        <AlertCircle size={20} />
                      </div>
                      <div className="mwos-surface-intro-copy">
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
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <p className="text-sm font-semibold text-[var(--color-mid)]">
                No team access is configured for this account yet.
              </p>
            </section>
          ) : null}
        </div>
      </main>

      <TrainingImportSheet
        open={importSheetOpen}
        mode={importMode}
        file={selectedImportFile}
        importing={importing}
        error={importError}
        onClose={() => setImportSheetOpen(false)}
        onSelectFile={setSelectedImportFile}
        onImport={() => void handleImportSource()}
      />
      <TrainingWhatsAppShareSheet
        open={shareOpen}
        initialText={shareText}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
