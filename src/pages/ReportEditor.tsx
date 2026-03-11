import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useReportStore } from '../store/report';
import { Save, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, FileText, Users, LayoutDashboard, UserCheck, Download, MessageSquare } from 'lucide-react';
import MatchReportTab from './tabs/MatchReportTab';
import TeamSheetsTab from './tabs/TeamSheetsTab';
import FormationsTab from './tabs/FormationsTab';
import PlayerReviewsTab from './tabs/PlayerReviewsTab';
import ExportTab from './tabs/ExportTab';
import CommentsTab from './tabs/CommentsTab';
import { fetchReport, saveReport } from '../lib/data';
import { createId } from '../lib/ids';

const TABS = [
  { id: 'match', label: 'Match Report', mobileLabel: 'Match', icon: FileText },
  { id: 'teams', label: 'Team Sheets', mobileLabel: 'Team', icon: Users },
  { id: 'formations', label: 'Formations', mobileLabel: 'Shape', icon: LayoutDashboard },
  { id: 'reviews', label: 'Player Reviews', mobileLabel: 'Reviews', icon: UserCheck },
  { id: 'comments', label: 'Comments', mobileLabel: 'Notes', icon: MessageSquare },
  { id: 'export', label: 'Export PDF', mobileLabel: 'PDF', icon: Download },
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
  const [showMobileTabPicker, setShowMobileTabPicker] = useState(false);
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

  // Load initial data
  useEffect(() => {
    skipDirtyTrackingRef.current = true;
    setPersistedReportId(id && id !== 'new' ? id : undefined);

    if (!token) return;

    if (id && id !== 'new') {
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

      if (isNewReport) {
        navigate(`/report/${savedId}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save:', err);
      // Only alert on manual save, not autosave
    } finally {
      setSaving(false);
    }
  }, [currentReport, isNewReport, navigate, hasUnsavedChanges, persistedReportId, setCurrentReport]);

  // Autosave effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (!persistedReportId && !canCreateInitialDraft) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [currentReport, hasUnsavedChanges, handleSave, persistedReportId, canCreateInitialDraft]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setShowMobileTabPicker(false);
  }, [activeTab]);

  const goToTab = (tabId: string) => {
    setActiveTab(tabId);
    setShowMobileTabPicker(false);
  };

  const goToPreviousTab = () => {
    if (activeTabIndex <= 0) return;
    goToTab(TABS[activeTabIndex - 1].id);
  };

  const goToNextTab = () => {
    if (activeTabIndex >= TABS.length - 1) return;
    goToTab(TABS[activeTabIndex + 1].id);
  };

  if (!currentReport) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col">
      <header className="mwos-ribbon-surface sticky top-0 z-50 shadow-sm">
        <div className="hidden items-center gap-4 border-b border-white/10 px-4 py-3 md:flex md:px-6">
          <img
            src="/branding/mwos-fc-300-2.png"
            alt="MWOS logo"
            className="h-11 w-11 rounded-full border border-white/20 bg-white/10 p-0.5"
          />
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 text-white md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <div className="flex items-start gap-3 md:items-center md:space-x-4">
            <button onClick={() => navigate('/')} className="rounded-full p-1.5 transition-colors hover:bg-white/10 md:p-2">
              <ArrowLeft size={22} className="text-white md:h-6 md:w-6" />
            </button>
            <img
              src="/branding/mwos-fc-300-2.png"
              alt="MWOS logo"
              className="h-9 w-9 rounded-full border border-white/20 bg-white/10 p-0.5 md:hidden"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/68 md:tracking-[0.28em]">MWOS Match Report</p>
              <h1 className="text-2xl font-black leading-none text-white md:text-xl md:leading-normal">
                {currentReport.home_team && currentReport.away_team 
                  ? `${currentReport.home_team} vs ${currentReport.away_team}` 
                  : 'New Report'}
                </h1>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/74 md:text-xs md:tracking-wider">
                {currentReport.competition || 'Draft'}
              </p>
              {isAdmin && (currentReport.owner_name || currentReport.owner_email) && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/88 md:text-xs md:tracking-wider">
                  Owner: {currentReport.owner_name || currentReport.owner_email}
                </p>
              )}
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/62 md:hidden">
                Step {activeTabIndex + 1} / {TABS.length} · {currentTabMeta.mobileLabel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-3 md:justify-end md:space-x-4">
            {hasUnsavedChanges ? (
              <span className="hidden items-center text-xs font-semibold text-white/72 md:inline-flex">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>
                Unsaved changes
              </span>
            ) : !persistedReportId && !canCreateInitialDraft ? (
              <span className="hidden items-center text-xs font-semibold text-white/72 md:inline-flex">
                Add match details before first save
              </span>
            ) : lastSaved ? (
              <span className="hidden items-center text-xs font-semibold text-white/72 md:inline-flex">
                <CheckCircle size={14} className="mr-1 text-emerald-300" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
            <button 
              onClick={handleSave} 
              disabled={saving || !hasUnsavedChanges || (!persistedReportId && !canCreateInitialDraft)}
              className="flex min-w-[168px] items-center justify-center space-x-2 rounded-2xl bg-white px-5 py-3 font-bold text-[var(--color-primary)] shadow-md transition-all hover:bg-white/92 disabled:opacity-50 md:min-w-0 md:rounded-xl md:px-6 md:py-2"
            >
              <Save size={18} />
              <span className="text-lg md:text-base">{saving ? 'Saving...' : 'Save Report'}</span>
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-mid)]/20 bg-white/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-14px_32px_rgba(15,23,42,0.16)] backdrop-blur-xl md:hidden">
        {showMobileTabPicker ? (
          <div className="mb-2 grid grid-cols-3 gap-2 rounded-[22px] border border-[var(--color-mid)]/16 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goToTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-light)]/55 text-[var(--color-dark)]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.mobileLabel}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mx-auto grid max-w-lg grid-cols-[68px_minmax(0,1fr)_68px] items-center gap-2 rounded-[24px] border border-[var(--color-mid)]/16 bg-white p-2">
          <button
            type="button"
            onClick={goToPreviousTab}
            disabled={activeTabIndex <= 0}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/50 text-[var(--color-dark)] transition-colors disabled:opacity-35"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={() => setShowMobileTabPicker((current) => !current)}
            className="flex h-12 min-w-0 flex-col items-center justify-center rounded-2xl bg-[var(--color-primary)] px-3 text-white shadow-[0_12px_24px_rgba(49,39,131,0.18)]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-72">
              Step {activeTabIndex + 1} / {TABS.length}
            </span>
            <span className="truncate text-sm font-black uppercase tracking-[0.08em]">
              {currentTabMeta.mobileLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={goToNextTab}
            disabled={activeTabIndex >= TABS.length - 1}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/50 text-[var(--color-dark)] transition-colors disabled:opacity-35"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
