import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileDown,
  GitCompareArrows,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import {
  addPlayerToWatchlist,
  fetchPlayerHubData,
  removePlayerFromWatchlist,
  type PlayerHubEntry,
  type PlayerHubOverview,
} from '../lib/data';
import { useAuthStore } from '../store/auth';

const COMPARISON_FIELDS: Array<{ key: keyof PlayerHubEntry['metrics']; label: string }> = [
  { key: 'pace', label: 'Pace' },
  { key: 'strength', label: 'Strength' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'agility', label: 'Agility' },
  { key: 'decision_making', label: 'Decision' },
  { key: 'composure', label: 'Composure' },
];

function formatDisplayDate(value: string) {
  if (!value) return 'No date';

  const normalizedValue = value.includes('T') ? value : `${value}T12:00:00`;
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

function getTrendMeta(entry: PlayerHubEntry) {
  if (entry.trend === 'up') {
    return {
      icon: TrendingUp,
      label: `Improving +${entry.trendDelta.toFixed(1)}`,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (entry.trend === 'down') {
    return {
      icon: TrendingDown,
      label: `Needs follow-up ${entry.trendDelta.toFixed(1)}`,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    icon: Minus,
    label: 'Stable trend',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function ComparisonMetricRow({
  label,
  leftValue,
  rightValue,
}: {
  label: string;
  leftValue: number;
  rightValue: number;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-3">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
        <span>{label}</span>
        <span>
          {leftValue.toFixed(1)} / {rightValue.toFixed(1)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-primary)]/10">
          <div
            className="h-full rounded-full bg-[var(--color-primary)]"
            style={{ width: `${Math.max(8, (leftValue / 5) * 100)}%` }}
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-accent)]/10">
          <div
            className="ml-auto h-full rounded-full bg-[var(--color-accent)]"
            style={{ width: `${Math.max(8, (rightValue / 5) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlayersPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin';

  const [overview, setOverview] = useState<PlayerHubOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [potentialFilter, setPotentialFilter] = useState('all');
  const [comparisonLeft, setComparisonLeft] = useState('');
  const [comparisonRight, setComparisonRight] = useState('');
  const [updatingWatchlistKey, setUpdatingWatchlistKey] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileComparison, setShowMobileComparison] = useState(false);
  const comparisonSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchPlayerHubData();
        if (!isMounted) return;
        setOverview(result);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load player hub.', loadError);
        setError(loadError.message || 'Failed to load player hub.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!overview || overview.entries.length === 0) {
      return;
    }

    if (!comparisonLeft || !overview.entries.some((entry) => entry.playerKey === comparisonLeft)) {
      setComparisonLeft(overview.entries[0].playerKey);
    }

    if (!comparisonRight || !overview.entries.some((entry) => entry.playerKey === comparisonRight)) {
      setComparisonRight(overview.entries[1]?.playerKey || overview.entries[0].playerKey);
    }
  }, [overview, comparisonLeft, comparisonRight]);

  const allEntries = overview?.entries || [];
  const recentReports = overview?.recentReports || [];
  const shortlistedEntries = overview?.watchlist || [];
  const filteredEntries = allEntries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.clubLabel.toLowerCase().includes(search.toLowerCase()) ||
      entry.latestCompetition.toLowerCase().includes(search.toLowerCase()) ||
      entry.latestFixture.toLowerCase().includes(search.toLowerCase());
    const matchesWatchlist = !watchlistOnly || entry.isWatchlisted;
    const matchesPotential = potentialFilter === 'all' || entry.bestPotential === potentialFilter;

    return matchesSearch && matchesWatchlist && matchesPotential;
  });

  const leftPlayer = allEntries.find((entry) => entry.playerKey === comparisonLeft) || null;
  const rightPlayer = allEntries.find((entry) => entry.playerKey === comparisonRight) || null;
  const primaryExportReportId =
    shortlistedEntries[0]?.latestReportId || recentReports[0]?.id || allEntries[0]?.latestReportId || '';

  const handleCreateReport = (tab: 'match' | 'teams' = 'match') => {
    navigate(tab === 'match' ? '/report/new' : `/report/new?tab=${tab}`);
  };

  const handleOpenComparison = () => {
    setShowMobileComparison(true);
    comparisonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenExport = () => {
    if (primaryExportReportId) {
      navigate(`/report/${primaryExportReportId}?tab=export`);
      return;
    }

    handleCreateReport();
  };

  const handleWatchlistToggle = async (entry: PlayerHubEntry) => {
    setUpdatingWatchlistKey(entry.playerKey);

    try {
      const nextWatchlistId = entry.isWatchlisted
        ? undefined
        : await addPlayerToWatchlist({
            playerKey: entry.playerKey,
            name: entry.name,
            clubLabel: entry.clubLabel,
            latestPlayerId: entry.latestPlayerId,
            latestReportId: entry.latestReportId,
          });

      if (entry.isWatchlisted) {
        await removePlayerFromWatchlist(entry.playerKey);
      }

      setOverview((current) => {
        if (!current) return current;

        const nextEntries = current.entries.map((item) =>
          item.playerKey === entry.playerKey
            ? {
                ...item,
                isWatchlisted: !entry.isWatchlisted,
                watchlistId: nextWatchlistId,
              }
            : item,
        );

        return {
          ...current,
          entries: nextEntries,
          watchlistCount: nextEntries.filter((item) => item.isWatchlisted).length,
          watchlist: nextEntries.filter((item) => item.isWatchlisted),
          topReported: nextEntries
            .filter((item) => item.averageScore >= 3.2 || ['Pro', 'Elite'].includes(item.bestPotential))
            .slice(0, 6),
        };
      });
    } catch (watchlistError) {
      console.error('Failed to update watchlist.', watchlistError);
      window.alert('Failed to update watchlist.');
    } finally {
      setUpdatingWatchlistKey(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-light)] md:flex-row">
      <AppSidebar
        current="players"
        isAdmin={isAdmin}
        userName={user?.name}
        organization={user?.organization}
        onNavigateReports={() => navigate('/')}
        onNavigatePlayers={() => navigate('/players')}
        onNavigateSettings={() => navigate('/settings')}
        onLogout={() => void logout()}
      />

      <main className="flex-1 overflow-auto p-3 pb-24 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-4 text-white md:px-6 md:py-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/65">
                    MWOS Player Intelligence
                  </p>
                  <h1 className="mt-1 mwos-display text-[2.35rem] uppercase leading-none tracking-[0.05em] text-white md:mt-2 md:text-4xl md:tracking-[0.08em]">
                    Player Hub
                  </h1>
                  <p className="mt-2 max-w-xl text-[13px] font-semibold leading-5 text-white/76 md:text-sm">
                    Track players, compare reports and manage follow-up.
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 xl:w-auto xl:min-w-[320px]">
                  <button
                    onClick={() => handleCreateReport('teams')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm transition-all hover:bg-white/16"
                  >
                    <Plus size={16} />
                    Add Player
                  </button>
                  <button
                    onClick={() => handleCreateReport('match')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-black text-[var(--color-primary)] shadow-[0_14px_30px_rgba(12,16,53,0.22)] transition-opacity hover:opacity-92"
                  >
                    <Plus size={16} />
                    New Report
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex items-center rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm">
                  <Search className="mr-3 text-white/68" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tracked players, reports or notes..."
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/60 outline-none"
                  />
                </div>

                <div className="sm:hidden">
                  <button
                    onClick={() => setShowMobileFilters((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm"
                  >
                    <SlidersHorizontal size={16} />
                    Filters
                    {showMobileFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              <div className={`${showMobileFilters ? 'grid' : 'hidden'} mt-2 gap-2 sm:grid md:grid-cols-[1fr_auto_auto]`}>
                <select
                  value={potentialFilter}
                  onChange={(event) => setPotentialFilter(event.target.value)}
                  className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white outline-none backdrop-blur-sm"
                >
                  <option value="all" className="text-slate-900">
                    All potential levels
                  </option>
                  <option value="Academy" className="text-slate-900">
                    Academy
                  </option>
                  <option value="Semi-pro" className="text-slate-900">
                    Semi-pro
                  </option>
                  <option value="Pro" className="text-slate-900">
                    Pro
                  </option>
                  <option value="Elite" className="text-slate-900">
                    Elite
                  </option>
                </select>

                <button
                  onClick={() => setWatchlistOnly((current) => !current)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                    watchlistOnly
                      ? 'bg-white text-[var(--color-primary)] shadow-[0_16px_32px_rgba(12,16,53,0.22)]'
                      : 'border border-white/12 bg-white/10 text-white'
                  }`}
                >
                  Shortlist only
                </button>

                <button
                  onClick={() => {
                    setSearch('');
                    setPotentialFilter('all');
                    setWatchlistOnly(false);
                  }}
                  className="rounded-2xl border border-white/12 bg-transparent px-4 py-2.5 text-sm font-black text-white/86 transition-colors hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-[22px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(49,39,131,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Tracked Players</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.totalTrackedPlayers || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Player profiles tracked.</p>
            </div>
            <div className="rounded-[22px] border border-[#d5aa4d]/20 bg-[linear-gradient(180deg,rgba(213,170,77,0.08),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(213,170,77,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Shortlisted</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.watchlistCount || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Ready for follow-up.</p>
            </div>
            <div className="rounded-[22px] border border-[var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(190,23,23,0.05),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(190,23,23,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Pending Review</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.pendingReviewCount || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Need another look.</p>
            </div>
            <div className="rounded-[22px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(16,185,129,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Reports This Week</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.reportsThisWeek || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Recent scouting activity.</p>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/12 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Recent Activity</p>
                  <h2 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">Recent Reports</h2>
                </div>
                <div className="rounded-2xl bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  {recentReports.length} live
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {recentReports.map((report, index) => (
                  <article
                    key={report.id}
                    className={`rounded-[22px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
                      index === 0
                        ? 'border-[var(--color-primary)]/16 bg-[linear-gradient(180deg,rgba(49,39,131,0.05),rgba(255,255,255,1))]'
                        : 'border-[var(--color-mid)]/12 bg-[var(--color-light)]/45'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]">
                            {report.competition}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-mid)]">
                            {formatDisplayDate(report.date)}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black text-[var(--color-dark)]">{report.fixture}</h3>
                        <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                          {report.venue} • {report.scoutName}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-[var(--color-mid)]">
                          {report.focus || 'Open the report to add focus notes and match observations.'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:min-w-[160px]">
                        <button
                          onClick={() => navigate(`/report/${report.id}`)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(49,39,131,0.18)] transition-opacity hover:opacity-90"
                        >
                          Open Report
                          <ArrowRight size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/report/${report.id}?tab=export`)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-2.5 text-sm font-black text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5"
                        >
                          Export Dossier
                          <FileDown size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {!loading && recentReports.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-5 text-sm font-semibold text-[var(--color-mid)]">
                    Your latest reports will appear here as soon as scouts start saving match evaluations.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="border-b border-[var(--color-mid)]/12 pb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Quick Actions</p>
                <h2 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">Next best action</h2>
              </div>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => handleCreateReport('teams')}
                  className="inline-flex items-center justify-between rounded-[22px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--color-dark)]">Add Player</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Open team sheets and start logging a new squad.</p>
                  </div>
                  <Plus size={18} className="text-[var(--color-primary)]" />
                </button>

                <button
                  onClick={() => handleCreateReport('match')}
                  className="inline-flex items-center justify-between rounded-[22px] border border-[var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(190,23,23,0.05),rgba(255,255,255,1))] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--color-dark)]">New Report</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Start a fresh match report for the next fixture.</p>
                  </div>
                  <ArrowRight size={18} className="text-[var(--color-accent)]" />
                </button>

                <button
                  onClick={handleOpenComparison}
                  className="inline-flex items-center justify-between rounded-[22px] border border-[#d5aa4d]/18 bg-[linear-gradient(180deg,rgba(213,170,77,0.08),rgba(255,255,255,1))] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--color-dark)]">Compare Players</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Open the comparison panel to decide between candidates.</p>
                  </div>
                  <GitCompareArrows size={18} className="text-[#7c5b11]" />
                </button>

                <button
                  onClick={handleOpenExport}
                  className="inline-flex items-center justify-between rounded-[22px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,1))] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--color-dark)]">Export Dossier</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                      {primaryExportReportId ? 'Jump straight into export for the strongest available report.' : 'Create a report first, then export a player dossier.'}
                    </p>
                  </div>
                  <FileDown size={18} className="text-emerald-700" />
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/12 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Highlights</p>
                  <h2 className="mt-2 text-xl font-black text-[var(--color-dark)] md:text-2xl">Players Reported Well</h2>
                </div>
                <div className="rounded-2xl bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Board-ready shortlist
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(overview?.topReported || []).slice(0, 3).map((entry, index) => (
                  <article
                    key={entry.playerKey}
                    className={`rounded-[24px] border p-5 shadow-[0_12px_26px_rgba(15,23,42,0.05)] ${
                      index === 0
                        ? 'border-[var(--color-primary)]/18 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))]'
                        : index === 1
                          ? 'border-[var(--color-accent)]/16 bg-[linear-gradient(180deg,rgba(190,23,23,0.05),rgba(255,255,255,1))]'
                          : 'border-[#d5aa4d]/18 bg-[linear-gradient(180deg,rgba(213,170,77,0.08),rgba(255,255,255,1))]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">
                          {entry.clubLabel}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-[var(--color-dark)]">{entry.name}</h3>
                      </div>
                      <button
                        onClick={() => void handleWatchlistToggle(entry)}
                        disabled={updatingWatchlistKey === entry.playerKey}
                        className={`rounded-full border p-2 transition-colors ${
                          entry.isWatchlisted
                            ? 'border-[#d5aa4d]/40 bg-[#d5aa4d]/12 text-[#7c5b11]'
                            : 'border-[var(--color-mid)]/20 text-[var(--color-mid)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)]'
                        }`}
                      >
                        <Star size={16} fill={entry.isWatchlisted ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Average score</p>
                        <p className="mt-1 text-3xl font-black text-[var(--color-dark)]">{entry.averageScore.toFixed(1)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 px-3 py-2 text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Potential</p>
                        <p className="mt-1 text-sm font-black text-[var(--color-primary)]">{entry.bestPotential}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[var(--color-mid)]">{entry.latestVerdict}</p>

                    <button
                      onClick={() => navigate(`/report/${entry.latestReportId}`)}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)] transition-opacity hover:opacity-80"
                    >
                      Open latest report
                      <ArrowRight size={16} />
                    </button>
                  </article>
                ))}

                {!loading && (overview?.topReported || []).length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-6 text-sm font-semibold text-[var(--color-mid)] md:col-span-2 xl:col-span-3">
                    Report a few players with reviews and ratings to unlock the top performers board.
                  </div>
                )}
              </div>
            </div>

            <div
              ref={(node) => {
                comparisonSectionRef.current = node;
              }}
              className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]"
            >
              <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                  <GitCompareArrows size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Comparison</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Player Comparison</h2>
                </div>
              </div>

              <div className="mt-5 xl:hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileComparison((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-mid)]/18 bg-[var(--color-light)]/55 px-4 py-3 text-sm font-black text-[var(--color-primary)]"
                >
                  {showMobileComparison ? 'Hide comparison' : 'Open comparison'}
                  {showMobileComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              <div className={`${showMobileComparison ? 'block' : 'hidden'} mt-5 space-y-4 xl:block`}>
                <select
                  value={comparisonLeft}
                  onChange={(event) => setComparisonLeft(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  {allEntries.map((entry) => (
                    <option key={entry.playerKey} value={entry.playerKey}>
                      {entry.name} • {entry.clubLabel}
                    </option>
                  ))}
                </select>

                <select
                  value={comparisonRight}
                  onChange={(event) => setComparisonRight(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  {allEntries.map((entry) => (
                    <option key={entry.playerKey} value={entry.playerKey}>
                      {entry.name} • {entry.clubLabel}
                    </option>
                  ))}
                </select>
              </div>

              {leftPlayer && rightPlayer ? (
                <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--color-primary)]/14 bg-[var(--color-primary)]/5 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Left</p>
                    <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">{leftPlayer.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{leftPlayer.clubLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-accent)]/14 bg-[var(--color-accent)]/5 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Right</p>
                      <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">{rightPlayer.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{rightPlayer.clubLabel}</p>
                    </div>
                  </div>

                  {COMPARISON_FIELDS.map((field) => (
                    <div key={field.key}>
                      <ComparisonMetricRow
                        label={field.label}
                        leftValue={leftPlayer.metrics[field.key]}
                        rightValue={rightPlayer.metrics[field.key]}
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/50 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Verdict</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-dark)]">{leftPlayer.latestVerdict}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/50 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Verdict</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-dark)]">{rightPlayer.latestVerdict}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-5 text-sm font-semibold text-[var(--color-mid)]">
                  Add more player reports to unlock comparison.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
            <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-mid)]/12 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Database</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Tracked Players</h2>
                </div>
                <div className="rounded-2xl bg-[var(--color-light)] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                  {filteredEntries.length} shown
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {loading && (
                  <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/60 p-5 text-sm font-semibold text-[var(--color-mid)]">
                    Loading player hub...
                  </div>
                )}

                {!loading &&
                  filteredEntries.map((entry) => {
                    const trendMeta = getTrendMeta(entry);
                    const TrendIcon = trendMeta.icon;

                    return (
                      <article
                        key={entry.playerKey}
                        className="rounded-[26px] border border-[var(--color-mid)]/14 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[var(--color-primary)]/9 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-primary)]">
                                {entry.clubLabel}
                              </span>
                              <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${trendMeta.className}`}>
                                <TrendIcon size={12} className="mr-1 inline-flex" />
                                {trendMeta.label}
                              </span>
                              <span className="rounded-full bg-[#d5aa4d]/18 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#7c5b11]">
                                {entry.bestPotential}
                              </span>
                            </div>

                            <h3 className="mt-3 text-2xl font-black text-[var(--color-dark)]">{entry.name}</h3>
                            <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                              {entry.latestCompetition} • {entry.latestFixture} • Last seen {formatDisplayDate(entry.latestReportDate)}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
                            <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-4 py-3 text-center">
                              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Avg score</p>
                              <p className="mt-1 text-2xl font-black text-[var(--color-dark)]">{entry.averageScore.toFixed(1)}</p>
                            </div>
                            <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-4 py-3 text-center">
                              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Reports</p>
                              <p className="mt-1 text-2xl font-black text-[var(--color-dark)]">{entry.reportCount}</p>
                            </div>
                            <button
                              onClick={() => void handleWatchlistToggle(entry)}
                              disabled={updatingWatchlistKey === entry.playerKey}
                              className={`col-span-2 rounded-2xl px-4 py-3 text-sm font-black transition-all sm:col-span-1 ${
                                entry.isWatchlisted
                                  ? 'bg-[#d5aa4d] text-[#3b2d06] shadow-[0_14px_30px_rgba(213,170,77,0.22)]'
                                  : 'border border-[var(--color-mid)]/20 bg-white text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Star size={16} fill={entry.isWatchlisted ? 'currentColor' : 'none'} />
                                {entry.isWatchlisted ? 'Shortlisted' : 'Add to watchlist'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {COMPARISON_FIELDS.slice(0, 4).map((field) => (
                            <div key={field.key} className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                                {field.label}
                              </p>
                              <p className="mt-2 text-xl font-black text-[var(--color-dark)]">{entry.metrics[field.key].toFixed(1)}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                          <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-white p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Latest verdict</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--color-dark)]">{entry.latestVerdict}</p>
                            <p className="mt-3 text-sm leading-6 text-[var(--color-mid)]">{entry.strengths}</p>
                          </div>
                          <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-white p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Improvement focus</p>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-mid)]">{entry.improvementAreas}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {entry.trendPoints.slice(-4).map((point) => (
                                <span
                                  key={`${entry.playerKey}-${point.reportId}`}
                                  className="rounded-full bg-[var(--color-primary)]/8 px-3 py-1 text-[11px] font-black text-[var(--color-primary)]"
                                >
                                  {formatDisplayDate(point.date)} • {point.score.toFixed(1)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          <button
                            onClick={() => navigate(`/report/${entry.latestReportId}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(49,39,131,0.2)] transition-opacity hover:opacity-90"
                          >
                            Open latest report
                            <ArrowRight size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setComparisonLeft(entry.playerKey);
                              if (comparisonRight === entry.playerKey && allEntries[0]) {
                                const fallback = allEntries.find((item) => item.playerKey !== entry.playerKey);
                                if (fallback) {
                                  setComparisonRight(fallback.playerKey);
                                }
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-2.5 text-sm font-black text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5"
                          >
                            Compare in panel
                            <BarChart3 size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}

                {!loading && filteredEntries.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-8 text-center">
                    <Users size={42} className="mx-auto text-[var(--color-mid)]/55" />
                    <p className="mt-4 text-lg font-black text-[var(--color-dark)]">No players match these filters</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                      Reset the search or add more player reviews to grow the player database.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Trial Shortlist</p>
                    <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Priority Follow-up</h2>
                  </div>
                  <div className="rounded-2xl bg-[#d5aa4d]/18 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#7c5b11]">
                    {overview?.watchlistCount || 0} saved
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {(overview?.watchlist || []).map((entry) => (
                    <div
                      key={entry.playerKey}
                      className="rounded-2xl border border-[var(--color-mid)]/12 bg-[linear-gradient(180deg,rgba(213,170,77,0.08),rgba(255,255,255,1))] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-[var(--color-dark)]">{entry.name}</h3>
                          <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{entry.clubLabel}</p>
                        </div>
                        <button
                          onClick={() => void handleWatchlistToggle(entry)}
                          className="rounded-full bg-white/80 p-2 text-[#7c5b11] transition-opacity hover:opacity-80"
                        >
                          <Star size={15} fill="currentColor" />
                        </button>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-[var(--color-mid)]">{entry.latestVerdict}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => navigate(`/report/${entry.latestReportId}`)}
                          className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)] transition-opacity hover:opacity-80"
                        >
                          Open supporting report
                          <ArrowRight size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/report/${entry.latestReportId}?tab=export`)}
                          className="inline-flex items-center gap-2 text-sm font-black text-[#7c5b11] transition-opacity hover:opacity-80"
                        >
                          Export dossier
                          <FileDown size={15} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!loading && (overview?.watchlist || []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-5 text-sm font-semibold text-[var(--color-mid)]">
                      Use the star button on a player card to build a shortlist without adding storage-heavy features.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Trend Notes</p>
                    <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Development Signal</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {allEntries
                    .filter((entry) => entry.trend !== 'steady' || entry.trendPoints.length >= 2)
                    .slice(0, 4)
                    .map((entry) => {
                      const trendMeta = getTrendMeta(entry);
                      const TrendIcon = trendMeta.icon;
                      return (
                        <div key={entry.playerKey} className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-black text-[var(--color-dark)]">{entry.name}</h3>
                              <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{entry.clubLabel}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${trendMeta.className}`}>
                              <TrendIcon size={12} className="mr-1 inline-flex" />
                              {entry.trend}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[var(--color-mid)]">
                            Latest note: {entry.improvementAreas}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
