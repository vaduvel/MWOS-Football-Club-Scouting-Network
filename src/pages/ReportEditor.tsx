import { Suspense, lazy, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useReportStore, type Report } from '../store/report';
import {
  Save,
  ArrowLeft,
  CheckCircle,
  FileText,
  Users,
  LayoutDashboard,
  UserCheck,
  Download,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
const MatchReportTab = lazy(() => import('./tabs/MatchReportTab'));
const TeamSheetsTab = lazy(() => import('./tabs/TeamSheetsTab'));
const FormationsTab = lazy(() => import('./tabs/FormationsTab'));
const PlayerReviewsTab = lazy(() => import('./tabs/PlayerReviewsTab'));
const ExportTab = lazy(() => import('./tabs/ExportTab'));
const CommentsTab = lazy(() => import('./tabs/CommentsTab'));
import { canCreateScoutingReports, fetchReport, saveReport, userHasRole } from '../lib/data';
import { createId } from '../lib/ids';
import { emitDraftSync } from '../lib/pwaEvents';
import { deleteReportDraft, readReportDraft, writeReportDraft } from '../lib/reportDraftStore';
import { buildReportProgress } from '../lib/reportProgressDomain';

const TABS = [
  { id: 'match', label: 'Match Report', mobileLabel: 'Report', icon: FileText },
  { id: 'teams', label: 'Team Sheets', mobileLabel: 'Squad', icon: Users },
  { id: 'formations', label: 'Formations', mobileLabel: 'Shape', icon: LayoutDashboard },
  { id: 'reviews', label: 'Player Reviews', mobileLabel: 'Review', icon: UserCheck },
  { id: 'comments', label: 'Comments', mobileLabel: 'Notes', icon: MessageSquare },
  { id: 'export', label: 'Export PDF', mobileLabel: 'Export', icon: Download },
];

const TAB_PROGRESS_KEYS: Partial<Record<(typeof TABS)[number]['id'], 'match_setup' | 'team_sheets' | 'formations' | 'player_reviews'>> = {
  match: 'match_setup',
  teams: 'team_sheets',
  formations: 'formations',
  reviews: 'player_reviews',
};

function hasMeaningfulDraftContent(report: ReturnType<typeof useReportStore.getState>['currentReport']) {
  if (!report) {
    return false;
  }

  const textFields = [
    report.competition,
    report.venue,
    report.kickoff,
    report.weather,
    report.pitch,
    report.home_team,
    report.away_team,
    report.focus,
    report.general_notes,
    report.home_manager,
    report.away_manager,
  ];

  const hasText = textFields.some((value) => value.trim().length > 0);
  const hasScores = typeof report.home_score === 'number' || typeof report.away_score === 'number';
  const hasPlayers = report.players.some(
    (player) =>
      player.name.trim().length > 0 ||
      typeof player.shirt_number === 'number' ||
      typeof player.rating === 'number' ||
      player.goal.trim().length > 0 ||
      player.subbed.trim().length > 0,
  );
  const hasReviews = report.reviews.some(
    (review) =>
      review.overview.trim().length > 0 ||
      review.strengths.trim().length > 0 ||
      review.areas_to_improve.trim().length > 0 ||
      review.recommendation_verdict.trim().length > 0,
  );

  return hasText || hasScores || hasPlayers || hasReviews;
}

const LOCAL_DRAFT_PREFIX = 'mwos-report-draft';

function getDraftStorageKey(reportId?: string) {
  return `${LOCAL_DRAFT_PREFIX}:${reportId || 'new'}`;
}

async function loadLocalDraft(reportId?: string): Promise<{ report: Report; savedAt: string } | null> {
  try {
    const savedDraft = await readReportDraft(getDraftStorageKey(reportId));
    if (!savedDraft) return null;

    return { report: savedDraft.report, savedAt: savedDraft.savedAt };
  } catch (error) {
    console.error('Failed to load local report draft.', error);
    return null;
  }
}

async function saveLocalDraft(report: Report, reportId?: string) {
  try {
    await writeReportDraft(getDraftStorageKey(reportId), report);
  } catch (error) {
    console.error('Failed to save local report draft.', error);
  }
}

async function clearLocalDraft(reportId?: string) {
  try {
    await deleteReportDraft(getDraftStorageKey(reportId));
  } catch (error) {
    console.error('Failed to clear local report draft.', error);
  }
}

function ReportTabLoadingState() {
  return (
    <div className="rounded-[24px] border border-[var(--color-mid)]/18 bg-white px-5 py-10 text-center shadow-sm">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[var(--color-primary)]/18 border-t-[var(--color-primary)]" />
      <p className="mt-4 text-sm font-semibold text-[var(--color-mid)]">Loading this scouting step…</p>
    </div>
  );
}

export default function ReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user } = useAuthStore();
  const { currentReport, setCurrentReport } = useReportStore();
  const [activeTab, setActiveTab] = useState('match');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [persistedReportId, setPersistedReportId] = useState<string | undefined>(id && id !== 'new' ? id : undefined);
  const [draftNotice, setDraftNotice] = useState('');
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [mobileTabPickerOpen, setMobileTabPickerOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const skipDirtyTrackingRef = useRef(false);
  const isAdmin = userHasRole(user, 'admin');
  const isExecutiveDirector = userHasRole(user, 'executive_director');
  const isTechnicalDirector = userHasRole(user, 'technical_director');
  const canEditReport = canCreateScoutingReports(user);
  const isNewReport = !id || id === 'new';
  const canCreateInitialDraft = hasMeaningfulDraftContent(currentReport);
  const requestedTab = searchParams.get('tab');
  const activeTabIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const currentTabMeta = TABS[activeTabIndex] || TABS[0];
  const canMovePrev = activeTabIndex > 0;
  const canMoveNext = activeTabIndex < TABS.length - 1;
  const progress = useMemo(
    () => (currentReport ? buildReportProgress(currentReport) : null),
    [currentReport],
  );

  useEffect(() => {
    if (!requestedTab || !TABS.some((tab) => tab.id === requestedTab)) {
      return;
    }

    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    const syncNetworkStatus = () => {
      const nextOffline = !navigator.onLine;
      setIsOffline(nextOffline);

      if (nextOffline) {
        emitDraftSync({
          state: 'offline',
          message: 'Offline mode active. Drafts stay on this phone.',
        });
      }
    };

    syncNetworkStatus();
    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);

    return () => {
      window.removeEventListener('online', syncNetworkStatus);
      window.removeEventListener('offline', syncNetworkStatus);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileTabPickerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load initial data
  useEffect(() => {
    skipDirtyTrackingRef.current = true;
    setPersistedReportId(id && id !== 'new' ? id : undefined);
    setDraftNotice('');
    setLoadingReport(true);
    setLoadError('');

    if (!token) {
      setLoadingReport(false);
      return;
    }

    let isMounted = true;

    void (async () => {
      if (id && id !== 'new') {
        const localDraft = await loadLocalDraft(id);

        if (!isMounted) return;

        if (localDraft) {
          setCurrentReport(localDraft.report);
          setPersistedReportId(id);
          setHasUnsavedChanges(true);
          setDraftNotice(`Recovered local draft from ${new Date(localDraft.savedAt).toLocaleTimeString()}.`);
          emitDraftSync({
            state: 'local',
            message: 'Recovered a saved draft from this phone.',
          });
          setLoadingReport(false);
          return;
        }

        try {
          const data = await fetchReport(id);
          if (!isMounted) return;
          setCurrentReport(data);
          setPersistedReportId(id);
          setHasUnsavedChanges(false);
          setLoadingReport(false);
        } catch (error) {
          console.error('Failed to load report.', error);
          if (!isMounted) return;
          setLoadError(error instanceof Error ? error.message : 'This scouting report could not be loaded.');
          setLoadingReport(false);
        }
        return;
      }

      const localDraft = await loadLocalDraft();

      if (!isMounted) return;

      if (localDraft) {
        setCurrentReport(localDraft.report);
        setHasUnsavedChanges(true);
        setDraftNotice(`Recovered local draft from ${new Date(localDraft.savedAt).toLocaleTimeString()}.`);
        emitDraftSync({
          state: 'local',
          message: 'Recovered a draft started on this phone.',
        });
        setLoadingReport(false);
        return;
      }

      setCurrentReport({
        id: createId(),
        competition: '',
        date: new Date().toISOString().split('T')[0],
        venue: '',
        kickoff: '',
        weather: '',
        pitch: '',
        home_team: '',
        home_score: '',
        away_team: '',
        away_score: '',
        scout_name: user?.name || '',
        focus: '',
        general_notes: '',
        home_manager: '',
        away_manager: '',
        formation_home: '4-3-3',
        formation_away: '4-3-3',
        players: [],
        reviews: [],
      });
      setHasUnsavedChanges(false);
      setLoadingReport(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [id, loadAttempt, token, setCurrentReport, user]);

  // Track changes
  useEffect(() => {
    if (currentReport) {
      if (!canEditReport) {
        return;
      }
      if (skipDirtyTrackingRef.current) {
        skipDirtyTrackingRef.current = false;
        return;
      }
      setHasUnsavedChanges(true);
    }
  }, [canEditReport, currentReport]);

  const handleSave = useCallback(async () => {
    if (!canEditReport) return;
    if (!currentReport || !hasUnsavedChanges) return;
    if (!persistedReportId && !hasMeaningfulDraftContent(currentReport)) return;

    setSaving(true);
    emitDraftSync({
      state: 'syncing',
      message: persistedReportId ? 'Syncing report changes…' : 'Creating the first saved report…',
    });

    try {
      const savedId = await saveReport(currentReport);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setPersistedReportId(savedId);
      await Promise.all([
        clearLocalDraft(id && id !== 'new' ? id : undefined),
        clearLocalDraft(savedId),
        clearLocalDraft(),
      ]);
      setDraftNotice('');
      emitDraftSync({
        state: 'synced',
        message: 'Changes synced to the scouting workspace.',
      });

      if (isNewReport) {
        navigate(`/report/${savedId}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save:', err);
      emitDraftSync({
        state: isOffline ? 'offline' : 'error',
        message: isOffline ? 'Offline mode active. The draft stays on this phone.' : 'Could not sync now. The draft stays on this phone.',
      });
    } finally {
      setSaving(false);
    }
  }, [canEditReport, currentReport, hasUnsavedChanges, id, isNewReport, isOffline, navigate, persistedReportId]);

  // Autosave effect
  useEffect(() => {
    if (!canEditReport) return;
    if (!hasUnsavedChanges) return;
    if (!persistedReportId && !canCreateInitialDraft) return;
    if (isOffline) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [canEditReport, currentReport, hasUnsavedChanges, handleSave, persistedReportId, canCreateInitialDraft, isOffline]);

  useEffect(() => {
    if (!canEditReport) return;
    if (!currentReport) return;
    if (!hasMeaningfulDraftContent(currentReport)) return;
    if (!hasUnsavedChanges && !isOffline) return;

    const timeoutId = window.setTimeout(() => {
      void saveLocalDraft(currentReport, persistedReportId).then(() => {
        emitDraftSync({
          state: isOffline ? 'offline' : 'local',
          message: isOffline ? 'Draft saved on this phone while offline.' : 'Backup draft saved on this phone.',
        });
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [canEditReport, currentReport, hasUnsavedChanges, persistedReportId, isOffline]);

  useEffect(() => {
    if (!canEditReport) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [canEditReport, hasUnsavedChanges]);

  const goToTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileTabPickerOpen(false);
  };

  if (loadingReport) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-light)] p-6">
        <ReportTabLoadingState />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-light)] p-6">
        <section role="alert" className="w-full max-w-lg rounded-[28px] border border-[var(--color-accent)]/18 bg-white p-6 text-center shadow-[0_22px_60px_rgba(15,23,42,0.1)]">
          <AlertCircle size={34} className="mx-auto text-[var(--color-accent)]" />
          <h1 className="mt-4 text-2xl font-black text-[var(--color-dark)]">Report unavailable</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            You may not have access to this report, or it may have been removed. The editor stopped safely instead of staying on a loading screen.
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--color-mid)]">{loadError}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => navigate('/scouting')} className="mwos-btn mwos-btn-secondary">
              <ArrowLeft size={16} /> Back to scouting
            </button>
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mwos-btn mwos-btn-primary">
              <RotateCcw size={16} /> Try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!currentReport) return null;

  const showOwnerMeta =
    Boolean(currentReport.owner_name || currentReport.owner_email) &&
    (isAdmin || isExecutiveDirector || isTechnicalDirector);
  const readOnlyPreviewTab = !canEditReport && activeTab !== 'export';

  return (
    <div className="min-h-dvh bg-[var(--color-light)] flex flex-col">
      <header className="mwos-ribbon-surface sticky top-0 z-50 shadow-sm">
        <div className="px-3 py-2.5 text-white md:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/scouting')} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10">
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <img
                src="/branding/mwos-fc-300-2.png"
                alt="MWOS logo"
                className="h-9 w-9 rounded-full border border-white/20 bg-white/10 p-0.5"
              />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/62">MWOS Scouting Workspace</p>
                <h1 className="truncate text-lg font-black leading-none text-white">
                  {currentReport.home_team && currentReport.away_team ? `${currentReport.home_team} vs ${currentReport.away_team}` : 'New Report'}
                </h1>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
                  Match Report · {currentReport.competition || 'Draft'} · {currentTabMeta.mobileLabel}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!canEditReport || saving || isOffline || !hasUnsavedChanges || (!persistedReportId && !canCreateInitialDraft)}
              className="inline-flex h-10 min-w-[84px] flex-shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-white px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--color-primary)] shadow-md transition-all hover:bg-white/92 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{!canEditReport ? 'Review' : saving ? '...' : 'Save'}</span>
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-white/72">
            <div className="truncate">
              {isOffline ? (
                'Offline mode'
              ) : draftNotice ? (
                draftNotice
              ) : !canEditReport ? (
                'Review mode'
              ) : hasUnsavedChanges ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                  Editing
                </span>
              ) : !persistedReportId && !canCreateInitialDraft ? (
                'Add details to save'
              ) : lastSaved ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-[var(--color-primary-soft)]" />
                  Saved
                </span>
              ) : (
                'Ready for scouting notes'
              )}
            </div>
            {showOwnerMeta ? (
              <span className="max-w-[42%] truncate text-right">Owner: {currentReport.owner_name || currentReport.owner_email}</span>
            ) : (
              <span>Step {activeTabIndex + 1}/{TABS.length}</span>
            )}
          </div>
        </div>

        <div className="hidden items-center justify-between gap-4 px-6 py-4 text-white md:flex">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/scouting')} className="rounded-full p-2 transition-colors hover:bg-white/10">
              <ArrowLeft size={22} className="text-white" />
            </button>
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="h-11 w-11 rounded-full border border-white/20 bg-white/10 p-0.5"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68">MWOS Scouting Workspace</p>
              <h1 className="text-xl font-black leading-normal text-white">
                {currentReport.home_team && currentReport.away_team ? `${currentReport.home_team} vs ${currentReport.away_team}` : 'New Report'}
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/74">
                Match Report · {currentReport.competition || 'Draft'}
              </p>
              {showOwnerMeta && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/88">
                  Owner: {currentReport.owner_name || currentReport.owner_email}
                </p>
              )}
              <p className="mt-1 text-xs font-semibold text-white/68">
                Move between match notes, team sheets, reviews and export from one connected scouting flow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isOffline ? (
              <span className="inline-flex items-center text-xs font-semibold text-white/72">
                Offline mode · saving locally in scouting draft storage
              </span>
            ) : draftNotice ? (
              <span className="inline-flex items-center text-xs font-semibold text-white/72">{draftNotice}</span>
            ) : hasUnsavedChanges ? (
              <span className="inline-flex items-center text-xs font-semibold text-white/72">
                <span className="mr-2 h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                Unsaved changes
              </span>
            ) : !persistedReportId && !canCreateInitialDraft ? (
              <span className="inline-flex items-center text-xs font-semibold text-white/72">
                Add match details before first save
              </span>
            ) : lastSaved ? (
              <span className="inline-flex items-center text-xs font-semibold text-white/72">
                <CheckCircle size={14} className="mr-1 text-[var(--color-primary-soft)]" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}

            <button
              onClick={handleSave}
              disabled={saving || isOffline || !hasUnsavedChanges || (!persistedReportId && !canCreateInitialDraft)}
              className="flex min-w-[148px] items-center justify-center space-x-2 rounded-xl bg-white px-6 py-2.5 font-bold text-[var(--color-primary)] shadow-md transition-all hover:bg-white/92 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Report'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Tabs Sidebar (Desktop) / Bottom Nav (Mobile) */}
        <nav className="hidden w-full flex-shrink-0 overflow-x-auto border-t border-[var(--color-mid)]/20 bg-white shadow-[0_-10px_30px_rgba(15,23,42,0.12)] md:static md:flex md:w-64 md:flex-col md:overflow-y-auto md:border-t-0 md:border-r md:shadow-none">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const progressKey = TAB_PROGRESS_KEYS[tab.id];
            const progressItem = progress?.items.find((item) => item.key === progressKey);
            return (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id)}
                className={`flex min-w-[74px] flex-1 flex-col items-center justify-center p-2.5 transition-colors md:min-w-0 md:flex-none md:flex-row md:justify-start md:px-6 md:py-4 border-b-2 md:border-b-0 md:border-l-4 ${
                  isActive 
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]' 
                    : 'border-transparent text-[var(--color-mid)] hover:bg-[var(--color-light)] hover:text-[var(--color-dark)]'
                }`}
              >
                <Icon size={18} className="mb-1 md:mb-0 md:mr-3 md:h-5 md:w-5" />
                <span className="text-[9px] md:text-sm font-bold uppercase tracking-[0.08em] md:tracking-wider">
                  {tab.label}
                </span>
                {progressItem ? (
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full md:ml-auto md:mt-0 ${
                      progressItem.status === 'complete'
                        ? 'bg-[var(--color-primary)]'
                        : 'bg-[var(--color-accent)]'
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <main className="order-1 flex-1 overflow-y-auto p-3 pb-24 md:order-2 md:p-8">
          <div className="max-w-5xl mx-auto">
            {progress ? (
              <section className="mb-4 rounded-[24px] border border-[var(--color-mid)]/20 bg-white p-4 shadow-sm md:mb-6 md:p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                      Report Progress
                    </p>
                    <h2 className="mt-2 text-lg font-black text-[var(--color-dark)] md:text-xl">
                      {progress.completedCount} of {progress.totalCount} core sections ready
                    </h2>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-mid)]">
                    Use the status chips below to see what still needs attention before export.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {progress.items.map((item) => (
                    <article
                      key={item.key}
                      className={`rounded-2xl border p-4 ${
                        item.status === 'complete'
                          ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]/70'
                          : 'border-[var(--color-accent-border)] bg-[var(--color-accent-soft)]/75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-[var(--color-dark)]">{item.label}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            item.status === 'complete'
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-accent)] text-white'
                          }`}
                        >
                          {item.status === 'complete' ? 'Ready' : 'Needs attention'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                        {item.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <Suspense fallback={<ReportTabLoadingState />}>
              {readOnlyPreviewTab ? (
                <div className="mwos-card-tone-alert mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--color-accent-deep)]">
                  Technical Director review mode is active. This report can be inspected and exported here, while editing stays with admins and scouts.
                </div>
              ) : null}
              <div className={readOnlyPreviewTab ? 'pointer-events-none select-none opacity-75' : ''}>
                {activeTab === 'match' && <MatchReportTab />}
                {activeTab === 'teams' && <TeamSheetsTab />}
                {activeTab === 'formations' && <FormationsTab />}
                {activeTab === 'reviews' && <PlayerReviewsTab />}
                {activeTab === 'comments' && <CommentsTab reportId={persistedReportId} />}
                {activeTab === 'export' && <ExportTab />}
              </div>
            </Suspense>
          </div>
        </main>
      </div>

      {mobileTabPickerOpen ? (
        <>
          <button
            type="button"
            onClick={() => setMobileTabPickerOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
            aria-label="Close step picker"
          />
          <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+9.8rem)] z-50 rounded-[26px] border border-[var(--color-mid)]/14 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:hidden">
            <div className="px-3 pb-2 pt-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">Report Steps</p>
            </div>
            <div className="space-y-1">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const progressKey = TAB_PROGRESS_KEYS[tab.id];
                const progressItem = progress?.items.find((item) => item.key === progressKey);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => goToTab(tab.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors ${
                      isActive ? 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]' : 'text-[var(--color-dark)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2 ${isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-light)] text-[var(--color-mid)]'}`}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black uppercase tracking-[0.14em]">Step {index + 1}</p>
                          {progressItem ? (
                            <span
                              className={`h-2 w-2 rounded-full ${
                                progressItem.status === 'complete' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-accent)]'
                              }`}
                            />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm font-bold">{tab.label}</p>
                      </div>
                    </div>
                    {isActive ? <CheckCircle size={16} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.95rem)] z-40 px-3 md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-[22px] border border-[var(--color-mid)]/18 bg-white/96 p-1.5 shadow-[0_-12px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => canMovePrev && goToTab(TABS[activeTabIndex - 1].id)}
            disabled={!canMovePrev}
            className="inline-flex h-12 shrink-0 items-center gap-1 rounded-2xl px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-dark)] disabled:opacity-35"
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <button
            type="button"
            onClick={() => setMobileTabPickerOpen((current) => !current)}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-white shadow-[0_10px_24px_rgba(49,39,131,0.18)]"
          >
            <span className="truncate px-2 text-[11px] font-black uppercase tracking-[0.12em]">
              Step {activeTabIndex + 1} · {currentTabMeta.mobileLabel}
            </span>
            <ChevronDown size={15} className={`mr-3 transition-transform ${mobileTabPickerOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => canMoveNext && goToTab(TABS[activeTabIndex + 1].id)}
            disabled={!canMoveNext}
            className="inline-flex h-12 shrink-0 items-center gap-1 rounded-2xl px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-dark)] disabled:opacity-35"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
