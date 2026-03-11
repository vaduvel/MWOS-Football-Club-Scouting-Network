import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useReportStore, type Report } from '../store/report';
import { Save, ArrowLeft, CheckCircle, FileText, Users, LayoutDashboard, UserCheck, Download, MessageSquare } from 'lucide-react';
import MatchReportTab from './tabs/MatchReportTab';
import TeamSheetsTab from './tabs/TeamSheetsTab';
import FormationsTab from './tabs/FormationsTab';
import PlayerReviewsTab from './tabs/PlayerReviewsTab';
import ExportTab from './tabs/ExportTab';
import CommentsTab from './tabs/CommentsTab';
import { fetchReport, saveReport } from '../lib/data';
import { createId } from '../lib/ids';

const TABS = [
  { id: 'match', label: 'Match Report', mobileLabel: 'Report', icon: FileText },
  { id: 'teams', label: 'Team Sheets', mobileLabel: 'Squad', icon: Users },
  { id: 'formations', label: 'Formations', mobileLabel: 'Shape', icon: LayoutDashboard },
  { id: 'reviews', label: 'Player Reviews', mobileLabel: 'Review', icon: UserCheck },
  { id: 'comments', label: 'Comments', mobileLabel: 'Notes', icon: MessageSquare },
  { id: 'export', label: 'Export PDF', mobileLabel: 'Export', icon: Download },
];

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

function loadLocalDraft(reportId?: string): { report: Report; savedAt: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(reportId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { report?: Report; savedAt?: string };
    if (!parsed.report || !parsed.savedAt) return null;

    return { report: parsed.report, savedAt: parsed.savedAt };
  } catch (error) {
    console.error('Failed to load local report draft.', error);
    return null;
  }
}

function saveLocalDraft(report: Report, reportId?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getDraftStorageKey(reportId),
    JSON.stringify({
      report,
      savedAt: new Date().toISOString(),
    }),
  );
}

function clearLocalDraft(reportId?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getDraftStorageKey(reportId));
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
  const skipDirtyTrackingRef = useRef(false);
  const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin';
  const isNewReport = !id || id === 'new';
  const canCreateInitialDraft = hasMeaningfulDraftContent(currentReport);
  const requestedTab = searchParams.get('tab');
  const activeTabIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const currentTabMeta = TABS[activeTabIndex] || TABS[0];

  useEffect(() => {
    if (!requestedTab || !TABS.some((tab) => tab.id === requestedTab)) {
      return;
    }

    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    const syncNetworkStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    syncNetworkStatus();
    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);

    return () => {
      window.removeEventListener('online', syncNetworkStatus);
      window.removeEventListener('offline', syncNetworkStatus);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    skipDirtyTrackingRef.current = true;
    setPersistedReportId(id && id !== 'new' ? id : undefined);
    setDraftNotice('');

    if (!token) return;

    if (id && id !== 'new') {
      const localDraft = loadLocalDraft(id);

      if (localDraft) {
        setCurrentReport(localDraft.report);
        setPersistedReportId(id);
        setHasUnsavedChanges(true);
        setDraftNotice(`Recovered local draft from ${new Date(localDraft.savedAt).toLocaleTimeString()}.`);
        return;
      }

      void (async () => {
        try {
          const data = await fetchReport(id);
          setCurrentReport(data);
          setPersistedReportId(id);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Failed to load report.', error);
        }
      })();
      return;
    }

    const localDraft = loadLocalDraft();

    if (localDraft) {
      setCurrentReport(localDraft.report);
      setHasUnsavedChanges(true);
      setDraftNotice(`Recovered local draft from ${new Date(localDraft.savedAt).toLocaleTimeString()}.`);
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
  }, [id, token, setCurrentReport, user]);

  // Track changes
  useEffect(() => {
    if (currentReport) {
      if (skipDirtyTrackingRef.current) {
        skipDirtyTrackingRef.current = false;
        return;
      }
      setHasUnsavedChanges(true);
    }
  }, [currentReport]);

  const handleSave = useCallback(async () => {
    if (!currentReport || !hasUnsavedChanges) return;
    if (!persistedReportId && !hasMeaningfulDraftContent(currentReport)) return;
    setSaving(true);

    try {
      const savedId = await saveReport(currentReport);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setPersistedReportId(savedId);
      clearLocalDraft(id && id !== 'new' ? id : undefined);
      clearLocalDraft(savedId);
      clearLocalDraft();
      setDraftNotice('');

      if (isNewReport) {
        navigate(`/report/${savedId}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save:', err);
      // Only alert on manual save, not autosave
    } finally {
      setSaving(false);
    }
  }, [currentReport, hasUnsavedChanges, id, isNewReport, navigate, persistedReportId]);

  // Autosave effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (!persistedReportId && !canCreateInitialDraft) return;
    if (isOffline) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [currentReport, hasUnsavedChanges, handleSave, persistedReportId, canCreateInitialDraft, isOffline]);

  useEffect(() => {
    if (!currentReport) return;
    if (!hasMeaningfulDraftContent(currentReport)) return;
    if (!hasUnsavedChanges && !isOffline) return;

    const timeoutId = window.setTimeout(() => {
      saveLocalDraft(currentReport, persistedReportId);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [currentReport, hasUnsavedChanges, persistedReportId, isOffline]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const goToTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  if (!currentReport) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col">
      <header className="mwos-ribbon-surface sticky top-0 z-50 shadow-sm">
        <div className="px-3 py-3 text-white md:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10">
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <img
                src="/branding/mwos-fc-300-2.png"
                alt="MWOS logo"
                className="h-10 w-10 rounded-full border border-white/20 bg-white/10 p-0.5"
              />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/62">MWOS Match Report</p>
                <h1 className="truncate text-xl font-black leading-none text-white">
                  {currentReport.home_team && currentReport.away_team ? `${currentReport.home_team} vs ${currentReport.away_team}` : 'New Report'}
                </h1>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
                  {currentReport.competition || 'Draft'} · {currentTabMeta.mobileLabel}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || isOffline || !hasUnsavedChanges || (!persistedReportId && !canCreateInitialDraft)}
              className="inline-flex h-11 min-w-[88px] flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-black text-[var(--color-primary)] shadow-md transition-all hover:bg-white/92 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saving ? '...' : 'Save'}</span>
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-white/72">
            <div className="truncate">
              {isOffline ? (
                'Offline mode · changes stay on this device'
              ) : draftNotice ? (
                draftNotice
              ) : hasUnsavedChanges ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                  Unsaved changes
                </span>
              ) : !persistedReportId && !canCreateInitialDraft ? (
                'Add details before first save'
              ) : lastSaved ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-emerald-300" />
                  Saved
                </span>
              ) : (
                'Ready to scout'
              )}
            </div>
            {isAdmin && (currentReport.owner_name || currentReport.owner_email) ? (
              <span className="max-w-[42%] truncate text-right">Owner: {currentReport.owner_name || currentReport.owner_email}</span>
            ) : (
              <span>Step {activeTabIndex + 1}/{TABS.length}</span>
            )}
          </div>
        </div>

        <div className="hidden items-center justify-between gap-4 px-6 py-4 text-white md:flex">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="rounded-full p-2 transition-colors hover:bg-white/10">
              <ArrowLeft size={22} className="text-white" />
            </button>
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="h-11 w-11 rounded-full border border-white/20 bg-white/10 p-0.5"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68">MWOS Match Report</p>
              <h1 className="text-xl font-black leading-normal text-white">
                {currentReport.home_team && currentReport.away_team ? `${currentReport.home_team} vs ${currentReport.away_team}` : 'New Report'}
              </h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/74">
                {currentReport.competition || 'Draft'}
              </p>
              {isAdmin && (currentReport.owner_name || currentReport.owner_email) && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/88">
                  Owner: {currentReport.owner_name || currentReport.owner_email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isOffline ? (
              <span className="inline-flex items-center text-xs font-semibold text-white/72">
                Offline mode · saving locally
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
                <CheckCircle size={14} className="mr-1 text-emerald-300" />
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
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <main className="order-1 flex-1 overflow-y-auto p-3 pb-24 md:order-2 md:p-8">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'match' && <MatchReportTab />}
            {activeTab === 'teams' && <TeamSheetsTab />}
            {activeTab === 'formations' && <FormationsTab />}
            {activeTab === 'reviews' && <PlayerReviewsTab />}
            {activeTab === 'comments' && <CommentsTab reportId={persistedReportId} />}
            {activeTab === 'export' && <ExportTab />}
          </div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-mid)]/18 bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 shadow-[0_-12px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md gap-2 overflow-x-auto rounded-[22px] border border-[var(--color-mid)]/16 bg-white p-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goToTab(tab.id)}
                className={`flex min-w-[72px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-[0_10px_24px_rgba(49,39,131,0.18)]'
                    : 'text-[var(--color-mid)]'
                }`}
              >
                <Icon size={16} />
                <span>{tab.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
