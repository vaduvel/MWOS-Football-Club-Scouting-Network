import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useReportStore } from '../store/report';
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
  { id: 'match', label: 'Match Report', icon: FileText },
  { id: 'teams', label: 'Team Sheets', icon: Users },
  { id: 'formations', label: 'Formations', icon: LayoutDashboard },
  { id: 'reviews', label: 'Player Reviews', icon: UserCheck },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'export', label: 'Export PDF', icon: Download },
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
  const { token, user } = useAuthStore();
  const { currentReport, setCurrentReport } = useReportStore();
  const [activeTab, setActiveTab] = useState('match');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [persistedReportId, setPersistedReportId] = useState<string | undefined>(id && id !== 'new' ? id : undefined);
  const skipDirtyTrackingRef = useRef(false);
  const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin';
  const isNewReport = !id || id === 'new';
  const canCreateInitialDraft = hasMeaningfulDraftContent(currentReport);

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

  if (!currentReport) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-[var(--color-light)] flex flex-col">
      <header className="mwos-ribbon-surface sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3 md:px-6">
          <img
            src="/branding/mwos-fc-300-2.png"
            alt="MWOS logo"
            className="h-11 w-11 rounded-full border border-white/20 bg-white/10 p-0.5"
          />
        </div>
        <div className="flex items-center justify-between px-4 py-4 text-white md:px-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/')} className="rounded-full p-2 transition-colors hover:bg-white/10">
              <ArrowLeft size={24} className="text-white" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/68">MWOS Match Report</p>
              <h1 className="text-xl font-black text-white">
                {currentReport.home_team && currentReport.away_team 
                  ? `${currentReport.home_team} vs ${currentReport.away_team}` 
                  : 'New Report'}
                </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {currentReport.competition || 'Draft'}
              </p>
              {isAdmin && (currentReport.owner_name || currentReport.owner_email) && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/88">
                  Owner: {currentReport.owner_name || currentReport.owner_email}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
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
              className="flex items-center space-x-2 rounded-xl bg-white px-6 py-2 font-bold text-[var(--color-primary)] shadow-md transition-all hover:bg-white/92 disabled:opacity-50"
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
        <nav className="bg-white border-r border-[var(--color-mid)]/20 w-full md:w-64 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto order-2 md:order-1 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none flex flex-col md:flex-row items-center md:justify-start p-4 md:px-6 md:py-4 transition-colors border-b-2 md:border-b-0 md:border-l-4 ${
                  isActive 
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]' 
                    : 'border-transparent text-[var(--color-mid)] hover:bg-[var(--color-light)] hover:text-[var(--color-dark)]'
                }`}
              >
                <Icon size={20} className="mb-1 md:mb-0 md:mr-3" />
                <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 order-1 md:order-2">
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
    </div>
  );
}
