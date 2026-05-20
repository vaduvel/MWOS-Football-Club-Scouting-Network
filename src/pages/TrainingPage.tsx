import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownCircle,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Loader2,
  MessageCircleMore,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AppSidebar from '../components/AppSidebar';
import TrainingCommentsPanel from '../components/training/TrainingCommentsPanel';
import TrainingDayEditor from '../components/training/TrainingDayEditor';
import TrainingImportSheet from '../components/training/TrainingImportSheet';
import TrainingIntakeLauncher from '../components/training/TrainingIntakeLauncher';
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
import { getTeamVisualTone } from '../lib/teamVisuals';
import { cn } from '../lib/utils';
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
  className = '',
}: {
  label: string;
  value: string | number;
  help: string;
  className?: string;
}) {
  return (
    <article className={`rounded-[22px] border p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)] ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[var(--color-dark)]">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{help}</p>
    </article>
  );
}

function CoachFlowStep({
  label,
  title,
  helper,
  complete,
  active,
  Icon,
  toneClass,
}: {
  label: string;
  title: string;
  helper: string;
  complete: boolean;
  active: boolean;
  Icon: typeof ClipboardList;
  toneClass: string;
}) {
  return (
    <article
      className={cn(
        'rounded-[24px] border bg-white/82 p-4 shadow-[0_14px_34px_rgba(49,39,131,0.05)] transition-all',
        active ? toneClass : 'border-[var(--color-mid)]/12',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            active ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'bg-[var(--color-light)] text-[var(--color-mid)]',
          )}
        >
          {complete ? <CheckCircle2 size={20} /> : <Icon size={20} />}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{label}</p>
          <h3 className="mt-1 text-base font-black text-[var(--color-dark)]">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-mid)]">{helper}</p>
        </div>
      </div>
    </article>
  );
}

function getCoachPrimaryActionClass(kind: TrainingCoachFlowActionKind) {
  if (kind === 'review_missing_info') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  if (kind === 'share_plan') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-[var(--color-primary)]/18 bg-[var(--color-primary)] text-white';
}

function getCoachPrimaryActionIcon(kind: TrainingCoachFlowActionKind) {
  if (kind === 'add_sessions') return ArrowDownCircle;
  if (kind === 'review_missing_info') return FileSearch;
  if (kind === 'share_plan') return MessageCircleMore;
  return Send;
}

function getCoachPrimaryActionMobileLabel(kind: TrainingCoachFlowActionKind) {
  if (kind === 'add_sessions') return 'Add';
  if (kind === 'review_missing_info') return 'Review';
  if (kind === 'share_plan') return 'Share';
  return 'Publish';
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
  const [mobileDetailView, setMobileDetailView] = useState<'editor' | 'comments'>('editor');

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
  const activeTeamTone = useMemo(
    () => getTeamVisualTone(workspace?.team.name || teams.find((team) => team.id === teamId)?.name || ''),
    [teamId, teams, workspace?.team.name],
  );
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
  const nextTrainingDay = useMemo(
    () => workspace?.days.find((day) => day.dayType === 'training' && day.startTime) || null,
    [workspace],
  );
  const trainingCount = coachFlow?.counts.trainingDays || 0;
  const recoveryCount = coachFlow?.counts.recoveryDays || 0;
  const structuredDayCount = coachFlow?.counts.structuredDays || 0;
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
    const target = document.getElementById('training-start-actions');
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
      setMobileDetailView('comments');
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
    setMobileDetailView('editor');
    setSuccess('Manual editor ready. Pick a day, set the day type to Training, then fill the session details.');
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
      setMobileDetailView('editor');
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

  return (
    <div className="min-h-dvh bg-[var(--color-light)] md:flex">
      <AppSidebar current="training" user={user} onLogout={() => void logout()} />

      <main className="flex-1 overflow-auto p-3 pb-52 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface px-4 py-5 text-white md:px-8 md:py-8">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/68">
                Club Module
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white">
                  <CalendarRange size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="mwos-display text-balance text-[2rem] uppercase leading-none tracking-[0.08em] text-white md:text-[3.4rem]">
                    Training Schedule
                  </h1>
                  <p className="mt-3 max-w-3xl text-pretty text-sm font-semibold leading-6 text-white/82 md:text-base md:leading-7">
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

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className={cn('min-w-0 overflow-hidden rounded-[28px] border bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6', activeTeamTone.cardClass)}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)] shadow-sm">
                    Coach Week Builder
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className={cn('h-4 w-4 rounded-full shadow-[0_0_0_5px_rgba(255,255,255,0.9)]', activeTeamTone.accentClass)} />
                    <h2 className="text-balance text-2xl font-black text-[var(--color-dark)] md:text-3xl">
                      {workspace?.team.name || 'Assigned team'}
                    </h2>
                  </div>
                  <p className="mt-2 text-base font-black text-[var(--color-mid)]">
                    {getTrainingWeekRangeLabel(weekStart)}
                  </p>
                  <p className="mt-3 max-w-2xl text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)] md:text-base md:leading-7">
                    Choose the team and week once, then add the actual sessions with the fastest input available: WhatsApp screenshot, PDF, photo, or manual edit.
                  </p>
                </div>

                <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:max-w-md">
                  <div className="min-w-0">
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                      Team
                    </label>
                    <select
                      value={teamId}
                      onChange={(event) => updateSearch({ teamId: event.target.value, dayIndex: 0 })}
                      className="block w-full min-w-0 max-w-full rounded-2xl border border-[var(--color-mid)]/22 bg-white px-3 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)] sm:text-sm"
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                      Week start
                    </label>
                    <input
                      type="date"
                      value={weekStart}
                      onChange={(event) => handleWeekChange(event.target.value)}
                      className="block w-full min-w-0 max-w-full appearance-none rounded-2xl border border-[var(--color-mid)]/22 bg-white px-3 py-3 text-base font-semibold outline-none focus:border-[var(--color-primary)] sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <CoachFlowStep
                  label="Step 1"
                  title="Team & week"
                  helper="Where this plan belongs."
                  complete={Boolean(workspace)}
                  active={!coachFlow?.progress.sessionsStarted}
                  Icon={ClipboardList}
                  toneClass={activeTeamTone.cardClass}
                />
                <CoachFlowStep
                  label="Step 2"
                  title="Sessions"
                  helper="Scan, import, or type the week."
                  complete={Boolean(coachFlow?.progress.sessionsStarted)}
                  active={Boolean(!coachFlow?.progress.published && coachFlow?.progress.sessionsStarted)}
                  Icon={FileSearch}
                  toneClass="mwos-card-tone-training"
                />
                <CoachFlowStep
                  label="Step 3"
                  title="Publish & share"
                  helper="Make it visible and send WhatsApp."
                  complete={Boolean(coachFlow?.progress.published)}
                  active={Boolean(coachFlow?.progress.readyToPublish || coachFlow?.progress.reviewNeeded)}
                  Icon={Send}
                  toneClass={coachFlow?.progress.reviewNeeded ? 'mwos-card-tone-alert' : 'mwos-card-tone-staff'}
                />
              </div>

              {workspace?.canManage ? (
                <div id="training-start-actions" className="mt-5 scroll-mt-4 rounded-[26px] border border-[var(--color-primary)]/14 bg-white/78 p-3 shadow-[0_12px_30px_rgba(49,39,131,0.05)] md:scroll-mt-6 md:p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                        Add the actual sessions
                      </p>
                      <h3 className="mt-1 text-lg font-black text-[var(--color-dark)]">
                        Start from how the coach already works
                      </h3>
                    </div>
                    <p className="max-w-xl text-sm font-semibold leading-6 text-[var(--color-mid)]">
                      WhatsApp screenshots and PDFs become editable drafts. Manual entry stays available when the plan is simple.
                    </p>
                  </div>
                  <TrainingIntakeLauncher
                    onCreateManual={handleCreateManual}
                    onImportPdf={() => openImportSheet('pdf_import')}
                    onScanPhoto={() => openImportSheet('image_import')}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-[var(--color-mid)]/14 bg-white/74 p-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                  This account can view training content and comments. Coaches and admins edit the week from this builder.
                </div>
              )}

              {workspace ? (
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <WorkspaceMetric
                    className="mwos-card-tone-training"
                    label="Training days"
                    value={trainingCount}
                    help="Sessions scheduled."
                  />
                  <WorkspaceMetric
                    className="mwos-card-tone-transport"
                    label="Recovery days"
                    value={recoveryCount}
                    help="Recovery touchpoints."
                  />
                  <WorkspaceMetric
                    className="mwos-card-tone-report"
                    label="Structured"
                    value={structuredDayCount}
                    help="Days with content."
                  />
                  <WorkspaceMetric
                    className={issueDayCount ? 'mwos-card-tone-alert' : 'mwos-card-tone-staff'}
                    label="Review"
                    value={issueDayCount}
                    help={issueDayCount ? 'Needs completion.' : 'Ready status.'}
                  />
                </div>
              ) : null}
            </article>

            <article className="sticky top-4 h-fit rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                Next best action
              </p>
              <h2 className="mt-3 text-2xl font-black text-[var(--color-dark)]">
                {coachFlow?.primaryAction.label || 'Loading workspace'}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                {coachFlow?.primaryAction.helper || 'Preparing the coach workflow for this team.'}
              </p>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={handleCoachPrimaryAction}
                  disabled={loading || !workspace?.canManage || savingState !== null}
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black disabled:opacity-50',
                    getCoachPrimaryActionClass(primaryActionKind),
                  )}
                >
                  {savingState === 'publish' && primaryActionKind === 'publish_plan' ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <PrimaryActionIcon size={17} />
                  )}
                  {coachFlow?.primaryAction.label || 'Start plan'}
                </button>

                {hasPlanActivity ? (
                  <button
                    type="button"
                    onClick={() => void handleSave('draft')}
                    disabled={loading || !workspace?.canManage || savingState !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-primary)] disabled:opacity-50"
                  >
                    {savingState === 'draft' ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                    Save draft
                  </button>
                ) : null}

                {workspace?.planId ? (
                  <button
                    type="button"
                    onClick={() => void handleSave('archive')}
                    disabled={loading || !workspace?.canManage || savingState !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/60 px-4 py-3 text-sm font-black text-[var(--color-mid)] disabled:opacity-50"
                  >
                    {savingState === 'archive' ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                    Archive plan
                  </button>
                ) : null}
              </div>

              <div className="mt-5 rounded-[24px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                  Current state
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-black text-[var(--color-dark)]">
                  <span>{trainingCount} training</span>
                  <span>{recoveryCount} recovery</span>
                  <span>{structuredDayCount} structured</span>
                  <span>{workspace?.status || 'draft'}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                  {nextTrainingDay
                    ? `Next timed session: ${nextTrainingDay.weekday} at ${nextTrainingDay.startTime}.`
                    : 'No timed training session is set yet.'}
                </p>
              </div>
            </article>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Loading training workspace…</p>
            </section>
          ) : null}

          {!loading && workspace ? (
            <>
              {canViewRawSource && displaySourceCard ? (
                <TrainingSourceCard
                  source={displaySourceCard}
                  canManage={workspace.canManage}
                  onViewSource={() => void handleViewSource()}
                  onReplaceSource={handleReplaceSource}
                  onClearSource={() => void handleClearImport()}
                />
              ) : null}

              <TrainingReviewSummaryCard
                days={workspace.days}
                nextReviewDayLabel={nextReviewDayLabel}
                canManage={workspace.canManage}
                onJumpToNextIssue={() => {
                  setMobileDetailView('editor');
                  updateSearch({ dayIndex: nextReviewDayIndex });
                  window.setTimeout(handleJumpToDayEditor, 80);
                }}
              />

              <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
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
                  <span className="mwos-chip-tone-report rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
                    Status · {workspace.status}
                  </span>
                  {workspace.publishedAt ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                      Published
                    </span>
                  ) : null}
                  {workspace.canManage ? (
                    <span className="mwos-chip-tone-training rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]">
                      Coach/Admin editable
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                      Comment-only access
                    </span>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                      Weekly day cards
                    </p>
                    <h2 className="mt-2 text-balance text-xl font-black text-[var(--color-dark)]">
                      Pick a day, then complete it in the editor
                    </h2>
                    <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
                      Rest days can stay simple. For training days, open a card and set Day type to Training before adding time, venue, objectives and exercises.
                    </p>
                  </div>
                  {workspace.canManage ? (
                    <button
                      type="button"
                      onClick={handleJumpToDayEditor}
                      className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-primary)]/14 bg-[var(--color-light)] px-4 py-3 text-sm font-black text-[var(--color-primary)]"
                    >
                      Edit {selectedDay?.weekday || 'selected day'}
                    </button>
                  ) : null}
                </div>

                <TrainingPlanBoard
                  days={workspace.days}
                  selectedDayIndex={selectedDayIndex}
                  onSelect={(index) => {
                    setMobileDetailView('editor');
                    updateSearch({ dayIndex: index });
                    window.setTimeout(handleJumpToDayEditor, 80);
                  }}
                />
              </section>

              <div className="grid grid-cols-2 gap-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileDetailView('editor')}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-black',
                    mobileDetailView === 'editor'
                      ? 'mwos-card-tone-training text-[var(--color-dark)]'
                      : 'border-[var(--color-mid)]/16 bg-white text-[var(--color-mid)]',
                  )}
                >
                  Day editor
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDetailView('comments')}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-black',
                    mobileDetailView === 'comments'
                      ? 'mwos-card-tone-staff text-[var(--color-dark)]'
                      : 'border-[var(--color-mid)]/16 bg-white text-[var(--color-mid)]',
                  )}
                >
                  Comments{workspace.planId ? ` · ${workspace.comments.length}` : ' · locked'}
                </button>
              </div>

              <section id="training-day-editor-section" className="scroll-mt-4 grid gap-4 xl:grid-cols-[1.2fr,0.8fr] md:scroll-mt-6">
                <div className={cn(mobileDetailView !== 'editor' && 'hidden md:block')}>
                  {selectedDay ? (
                    <TrainingDayEditor
                      day={selectedDay}
                      canEdit={workspace.canManage}
                      onChange={handleDayChange}
                    />
                  ) : (
                    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
                      <p className="text-sm font-semibold text-[var(--color-mid)]">
                        Choose a day from the board to edit the session details.
                      </p>
                    </article>
                  )}
                </div>

                <div className={cn(mobileDetailView !== 'comments' && 'hidden md:block')}>
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
                    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
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
                </div>
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

        {workspace?.canManage ? (
          <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.15rem)] z-40 md:hidden">
            <div
              className={cn(
                'grid gap-2 rounded-[26px] border border-[var(--color-mid)]/12 bg-white/95 p-2 shadow-[0_24px_48px_rgba(15,23,42,0.18)] backdrop-blur',
                hasPlanActivity ? 'grid-cols-2' : 'grid-cols-1',
              )}
            >
              {hasPlanActivity ? (
                <button
                  type="button"
                  onClick={() => void handleSave('draft')}
                  disabled={loading || savingState !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                >
                  {savingState === 'draft' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Save
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCoachPrimaryAction}
                disabled={loading || savingState !== null}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-[0.12em] disabled:opacity-50',
                  getCoachPrimaryActionClass(primaryActionKind),
                )}
              >
                {savingState === 'publish' && primaryActionKind === 'publish_plan' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <PrimaryActionIcon size={15} />
                )}
                {getCoachPrimaryActionMobileLabel(primaryActionKind)}
              </button>
            </div>
          </div>
        ) : null}
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
