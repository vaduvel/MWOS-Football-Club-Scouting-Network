import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileDown,
  Footprints,
  GitCompareArrows,
  Minus,
  Plus,
  Ruler,
  Search,
  SlidersHorizontal,
  Scale,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import ClubRosterSection from '../components/players/ClubRosterSection';
import PlayerProfilePanel from '../components/players/PlayerProfilePanel';
import {
  fetchClubRosterOverview,
  saveClubRosterPlayer,
  type ClubRosterOverview,
} from '../lib/clubPlayersData';
import type { ClubPlayerDraft } from '../lib/clubPlayersDomain';
import {
  addPlayerToWatchlist,
  canCreateScoutingReports,
  fetchPlayerHubData,
  removePlayerFromWatchlist,
  type PlayerHubEntry,
  type PlayerHubOverview,
  userHasAnyRole,
} from '../lib/data';
import {
  buildTeamRosterAnalytics,
  type TeamRosterAnalytics,
} from '../lib/playerHubDomain';
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
      className: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary-border)]',
    };
  }

  if (entry.trend === 'down') {
    return {
      icon: TrendingDown,
      label: `Needs follow-up ${entry.trendDelta.toFixed(1)}`,
      className: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent-border)]',
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

function TeamAnalyticsPanel({
  analytics,
  loading,
  teamName,
}: {
  analytics: TeamRosterAnalytics;
  loading: boolean;
  teamName: string;
}) {
  const statCards = [
    {
      label: 'Squad size',
      value: analytics.totalPlayers.toString(),
      detail: teamName || 'Selected team',
      icon: Users,
      className: 'border-[var(--color-primary)]/16 bg-[rgba(49,39,131,0.05)]',
    },
    {
      label: 'Data complete',
      value: `${analytics.completeRate}%`,
      detail: `${analytics.completePlayers} ready profiles`,
      icon: ShieldCheck,
      className: 'border-[var(--color-success)]/24 bg-[rgba(30,132,73,0.06)]',
    },
    {
      label: 'Needs data',
      value: analytics.missingPlayers.toString(),
      detail: analytics.dataHealthLabel,
      icon: Activity,
      className: 'border-[var(--color-accent)]/18 bg-[rgba(190,23,23,0.05)]',
    },
  ];
  const physicalIcons = [Ruler, Scale, Activity];

  return (
    <section className="rounded-[28px] border border-[var(--color-primary)]/16 bg-[linear-gradient(180deg,rgba(49,39,131,0.055),rgba(255,255,255,0.96))] p-4 shadow-[0_18px_45px_rgba(49,39,131,0.07)] md:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[0_12px_26px_rgba(49,39,131,0.2)]">
          <BarChart3 size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--color-primary)]">Team analytics</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-[var(--color-dark)]">Roster health at a glance</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Position mix, data readiness and physical averages for {teamName || 'the selected team'}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-[22px] border border-[var(--color-mid)]/10 bg-white/70"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`rounded-[22px] border p-4 ${card.className}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">
                        {card.label}
                      </p>
                      <p className="mt-2 text-3xl font-black leading-none text-[var(--color-dark)]">
                        {card.value}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-[0_10px_22px_rgba(49,39,131,0.08)]">
                      <Icon size={18} />
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">
                    {card.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-white/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Position mix</p>
                  <h3 className="mt-1 text-lg font-black text-[var(--color-dark)]">Shape of the squad</h3>
                </div>
                <Footprints className="text-[var(--color-primary)]" size={20} />
              </div>

              <div className="mt-4 space-y-3">
                {analytics.positionRows.length > 0 ? (
                  analytics.positionRows.map((row) => (
                    <div key={row.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                        <span className="min-w-0 truncate">{row.label}</span>
                        <span className="shrink-0 text-[var(--color-dark)]">
                          {row.count} · {row.percent}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-primary)]/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-primary-deep))]"
                          style={{ width: `${row.barPercent}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-[var(--color-light)]/65 p-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                    Add roster players to see the team position distribution.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-white/82 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Physical baseline</p>
                <div className="mt-3 grid gap-2">
                  {analytics.physicalRows.map((row, index) => {
                    const Icon = physicalIcons[index] || Activity;
                    return (
                      <div
                        key={row.label}
                        className="flex items-center gap-3 rounded-2xl border border-[var(--color-mid)]/10 bg-[var(--color-light)]/48 p-3"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-[0_8px_18px_rgba(49,39,131,0.06)]">
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-[var(--color-dark)]">{row.valueLabel}</p>
                          <p className="text-xs font-semibold text-[var(--color-mid)]">{row.label} · {row.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--color-mid)]/12 bg-white/82 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Foot balance</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analytics.footRows.length > 0 ? (
                    analytics.footRows.map((row) => (
                      <span
                        key={row.label}
                        className="rounded-2xl border border-[var(--color-primary)]/12 bg-[var(--color-primary)]/6 px-3 py-2 text-xs font-black text-[var(--color-primary)]"
                      >
                        {row.label}: {row.count}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-[var(--color-light)]/65 px-3 py-2 text-xs font-black text-[var(--color-mid)]">
                      No foot data yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function PlayersPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const canCreateReports = canCreateScoutingReports(user);
  const canManageWatchlist = canCreateReports;
  const canManageRoster = userHasAnyRole(user, ['admin', 'technical_director']);

  const [overview, setOverview] = useState<PlayerHubOverview | null>(null);
  const [clubRoster, setClubRoster] = useState<ClubRosterOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [error, setError] = useState('');
  const [rosterError, setRosterError] = useState('');
  const [search, setSearch] = useState('');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [potentialFilter, setPotentialFilter] = useState('all');
  const [rosterTeamId, setRosterTeamId] = useState('');
  const [comparisonLeft, setComparisonLeft] = useState('');
  const [comparisonRight, setComparisonRight] = useState('');
  const [selectedPlayerKey, setSelectedPlayerKey] = useState('');
  const [updatingWatchlistKey, setUpdatingWatchlistKey] = useState<string | null>(null);
  const [savingRosterPlayerId, setSavingRosterPlayerId] = useState<string | null>(null);
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
    let isMounted = true;

    void (async () => {
      setRosterLoading(true);
      setRosterError('');
      try {
        const result = await fetchClubRosterOverview(rosterTeamId || undefined);
        if (!isMounted) return;
        setClubRoster(result);
        if (!rosterTeamId && result.selectedTeamId) {
          setRosterTeamId(result.selectedTeamId);
        }
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load club roster.', loadError);
        setRosterError(loadError.message || 'Failed to load club roster.');
      } finally {
        if (isMounted) {
          setRosterLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [rosterTeamId]);

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
  const selectedPlayer = filteredEntries.find((entry) => entry.playerKey === selectedPlayerKey) || filteredEntries[0] || null;
  const primaryExportReportId =
    shortlistedEntries[0]?.latestReportId || recentReports[0]?.id || allEntries[0]?.latestReportId || '';
  const teamRosterAnalytics = buildTeamRosterAnalytics(
    (clubRoster?.players || []).map((player) => ({
      primaryPosition: player.primaryPosition,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      bmi: player.bmi,
      hasCompleteAnthropometrics: player.hasCompleteAnthropometrics,
      dominantFoot: player.dominantFoot,
    })),
  );

  useEffect(() => {
    if (!filteredEntries.length) {
      if (selectedPlayerKey) {
        setSelectedPlayerKey('');
      }
      return;
    }

    if (!selectedPlayerKey || !filteredEntries.some((entry) => entry.playerKey === selectedPlayerKey)) {
      setSelectedPlayerKey(filteredEntries[0].playerKey);
    }
  }, [filteredEntries, selectedPlayerKey]);

  const handleCreateReport = (tab: 'match' | 'teams' = 'match') => {
    navigate(tab === 'match' ? '/scouting/report/new' : `/scouting/report/new?tab=${tab}`);
  };

  const handleOpenReport = (reportId: string) => {
    navigate(`/report/${reportId}`);
  };

  const handleOpenPlayerProfilePage = (entry: PlayerHubEntry) => {
    navigate(`/players/${encodeURIComponent(entry.playerKey)}`);
  };

  const handleOpenComparison = () => {
    setShowMobileComparison(true);
    comparisonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenExport = () => {
    if (primaryExportReportId) {
      navigate(`/scouting/report/${primaryExportReportId}?tab=export`);
      return;
    }

    if (canCreateReports) {
      handleCreateReport();
      return;
    }

    navigate('/scouting');
  };

  const handleWatchlistToggle = async (entry: PlayerHubEntry) => {
    if (!canManageWatchlist) {
      return;
    }

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
      setError('Failed to update watchlist. Please try again.');
    } finally {
      setUpdatingWatchlistKey(null);
    }
  };

  const handleSaveRosterPlayer = async (draft: ClubPlayerDraft, playerId?: string) => {
    const targetTeamId = clubRoster?.selectedTeamId || rosterTeamId;
    const savingId = playerId || 'new';
    setSavingRosterPlayerId(savingId);
    setRosterError('');
    setError('');

    try {
      await saveClubRosterPlayer({
        teamId: targetTeamId,
        draft,
        playerId,
      });

      const [nextRoster, nextOverview] = await Promise.all([
        fetchClubRosterOverview(targetTeamId || undefined),
        fetchPlayerHubData(),
      ]);
      setClubRoster(nextRoster);
      setOverview(nextOverview);
      if (nextRoster.selectedTeamId) {
        setRosterTeamId(nextRoster.selectedTeamId);
      }
    } catch (saveError: any) {
      console.error('Failed to save club roster player.', saveError);
      setRosterError(saveError.message || 'Failed to save this roster player.');
      throw saveError;
    } finally {
      setSavingRosterPlayerId(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-light)] md:flex-row">
      <AppSidebar
        current="players"
        user={user}
        onLogout={() => void logout()}
      />

      <main className="flex-1 overflow-auto p-3 pb-24 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--color-mid)]/18 bg-white shadow-[0_20px_55px_rgba(49,39,131,0.08)]">
            <div className="mwos-ribbon-surface relative overflow-hidden text-white">
              <div className="space-y-3 px-4 py-4 md:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/65">
                      MWOS Scouting Workspace
                    </p>
                    <h1 className="mt-1 mwos-display text-[2.2rem] uppercase leading-none tracking-[0.04em] text-white">
                      Player Hub
                    </h1>
                    <p className="mt-2 max-w-[17rem] text-xs font-semibold leading-5 text-white/76">
                      Track, shortlist and compare players from the same workspace where reports are filed and follow-up is decided.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(canCreateReports ? '/scouting/report/new' : '/scouting')}
                    className="inline-flex h-11 min-w-[92px] items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-black text-[var(--color-primary)] shadow-[0_14px_30px_rgba(12,16,53,0.22)]"
                  >
                    <Plus size={15} />
                    {canCreateReports ? 'Report' : 'Scouting'}
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <div className="flex items-center rounded-2xl border border-white/12 bg-white/10 px-3 py-2.5 shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm">
                    <Search className="mr-2 text-white/68" size={16} />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search players or reports..."
                      className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/60 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowMobileFilters((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-3 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm"
                  >
                    <SlidersHorizontal size={15} />
                    Filter
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {canCreateReports ? (
                    <button
                      onClick={() => handleCreateReport('teams')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white"
                    >
                      <Plus size={15} />
                      Add Player
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/oversight')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white"
                    >
                      <ArrowRight size={15} />
                      Oversight
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/scouting')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white"
                  >
                    <ArrowRight size={15} />
                    Workspace
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenComparison}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white"
                  >
                    <GitCompareArrows size={15} />
                    Compare
                  </button>
                  <button
                    onClick={handleOpenExport}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white"
                  >
                    <FileDown size={15} />
                    Export
                  </button>
                </div>

                <div className={`${showMobileFilters ? 'grid' : 'hidden'} gap-2`}>
                  <select
                    value={potentialFilter}
                    onChange={(event) => setPotentialFilter(event.target.value)}
                    className="mwos-select-field mwos-select-field-inverse rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white outline-none backdrop-blur-sm"
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

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setWatchlistOnly((current) => !current)}
                      className={`rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                        watchlistOnly
                          ? 'bg-white text-[var(--color-primary)] shadow-[0_16px_32px_rgba(12,16,53,0.22)]'
                          : 'border border-white/12 bg-white/10 text-white'
                      }`}
                    >
                      Shortlist
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
              </div>

              <div className="hidden px-6 py-5 md:block">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/65">
                      MWOS Scouting Workspace
                    </p>
                    <h1 className="mt-2 mwos-display text-4xl uppercase leading-none tracking-[0.08em] text-white">
                      Player Hub
                    </h1>
                    <p className="mt-2 max-w-xl text-sm font-semibold leading-5 text-white/76">
                      Track players, compare reports and drive follow-up from the same scouting module that feeds club decisions.
                    </p>
                  </div>

                  <div className="grid w-full grid-cols-3 gap-2 xl:w-auto xl:min-w-[520px]">
                    <button
                      onClick={() => navigate('/scouting')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm transition-all hover:bg-white/16"
                    >
                      <ArrowRight size={16} />
                      Scouting Workspace
                    </button>
                    {canCreateReports ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => navigate('/oversight')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-black text-[var(--color-primary)] shadow-[0_14px_30px_rgba(12,16,53,0.22)] transition-opacity hover:opacity-92"
                      >
                        <ArrowRight size={16} />
                        Oversight
                      </button>
                    )}
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

                <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                  <select
                    value={potentialFilter}
                    onChange={(event) => setPotentialFilter(event.target.value)}
                    className="mwos-select-field mwos-select-field-inverse rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white outline-none backdrop-blur-sm"
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
                    onClick={handleOpenExport}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-white/16"
                  >
                    Export dossier
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
            </div>
          </section>

          <section className="md:hidden">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <div className="min-w-[148px] rounded-[22px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(49,39,131,0.06)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Tracked</p>
                <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.totalTrackedPlayers || 0}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Players</p>
              </div>
              <div className="min-w-[148px] rounded-[22px] border border-[var(--color-primary-deep)]/16 bg-[linear-gradient(180deg,rgba(34,27,102,0.06),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(34,27,102,0.05)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Shortlist</p>
                <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.watchlistCount || 0}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Ready now</p>
              </div>
              <div className="min-w-[148px] rounded-[22px] border border-[var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(190,23,23,0.05),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(190,23,23,0.05)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">Review</p>
                <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.pendingReviewCount || 0}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Need check</p>
              </div>
              <div className="min-w-[148px] rounded-[22px] border border-[var(--color-primary-border)] bg-[linear-gradient(180deg,rgba(49,39,131,0.08),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(49,39,131,0.05)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">This Week</p>
                <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.reportsThisWeek || 0}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Reports</p>
              </div>
            </div>
          </section>

          <section className="hidden grid-cols-2 gap-3 xl:grid-cols-4 md:grid">
            <div className="rounded-[22px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.06),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(49,39,131,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Tracked Players</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.totalTrackedPlayers || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Player profiles tracked.</p>
            </div>
            <div className="rounded-[22px] border border-[var(--color-primary-deep)]/16 bg-[linear-gradient(180deg,rgba(34,27,102,0.06),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(34,27,102,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Shortlisted</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.watchlistCount || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Ready for follow-up.</p>
            </div>
            <div className="rounded-[22px] border border-[var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(190,23,23,0.05),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(190,23,23,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Pending Review</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.pendingReviewCount || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Need another look.</p>
            </div>
            <div className="rounded-[22px] border border-[var(--color-primary-border)] bg-[linear-gradient(180deg,rgba(49,39,131,0.08),rgba(255,255,255,1))] p-4 shadow-[0_12px_28px_rgba(49,39,131,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Reports This Week</p>
              <p className="mt-2 text-3xl font-black text-[var(--color-dark)]">{overview?.reportsThisWeek || 0}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-mid)] md:text-sm">Recent scouting activity.</p>
            </div>
          </section>

          {error && (
            <div className="mwos-card-tone-danger rounded-2xl border p-4 text-sm font-semibold text-[var(--color-accent-deep)]">
              {error}
            </div>
          )}

          {rosterError && (
            <div className="mwos-card-tone-danger rounded-2xl border p-4 text-sm font-semibold text-[var(--color-accent-deep)]">
              {rosterError}
            </div>
          )}

          <TeamAnalyticsPanel
            analytics={teamRosterAnalytics}
            loading={rosterLoading}
            teamName={clubRoster?.selectedTeamName || 'Club roster'}
          />

          <ClubRosterSection
            overview={clubRoster}
            loading={rosterLoading}
            search={search}
            teamId={rosterTeamId}
            canManageRoster={canManageRoster}
            savingPlayerId={savingRosterPlayerId}
            onTeamChange={setRosterTeamId}
            onSavePlayer={handleSaveRosterPlayer}
          />

          <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
            <PlayerProfilePanel
              entry={selectedPlayer}
              canManageWatchlist={canManageWatchlist}
              updatingWatchlistKey={updatingWatchlistKey}
              onToggleWatchlist={handleWatchlistToggle}
              onOpenReport={handleOpenReport}
            />

            <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Selection tray</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Who needs focus now</h2>
                </div>
                <div className="rounded-2xl bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  {filteredEntries.length} active
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {filteredEntries.slice(0, 6).map((entry) => {
                  const isSelected = entry.playerKey === selectedPlayer?.playerKey;
                  return (
                    <button
                      key={entry.playerKey}
                      type="button"
                      onClick={() => setSelectedPlayerKey(entry.playerKey)}
                      className={`w-full rounded-[22px] border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-[var(--color-primary)]/24 bg-[linear-gradient(180deg,rgba(49,39,131,0.07),rgba(255,255,255,1))] shadow-[0_14px_28px_rgba(49,39,131,0.08)]'
                          : 'border-[var(--color-mid)]/12 bg-[var(--color-light)]/50 hover:border-[var(--color-primary)]/18 hover:bg-[var(--color-primary)]/4'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--color-dark)]">{entry.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                            {entry.clubLabel} • {entry.bestPotential}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">Score</p>
                          <p className="mt-1 text-lg font-black text-[var(--color-primary)]">
                            {entry.averageScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                          {entry.reportCount} reports
                        </span>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                          {entry.trend === 'up' ? 'Trending up' : entry.trend === 'down' ? 'Needs follow-up' : 'Stable'}
                        </span>
                        {entry.linkedClubPlayerId ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                            Linked roster
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}

                {!loading && filteredEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-5 text-sm font-semibold text-[var(--color-mid)]">
                    No players match the current filters, so there is nothing to pin in the focus tray.
                  </div>
                ) : null}
              </div>
            </div>
          </section>

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
                {canCreateReports ? (
                  <>
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
                  </>
                ) : (
                  <button
                    onClick={() => navigate('/oversight')}
                    className="inline-flex items-center justify-between rounded-[22px] border border-[var(--color-accent)]/14 bg-[linear-gradient(180deg,rgba(190,23,23,0.05),rgba(255,255,255,1))] px-4 py-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-black text-[var(--color-dark)]">Open Oversight</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Return to the leadership workspace for planning and follow-up.</p>
                    </div>
                    <ArrowRight size={18} className="text-[var(--color-accent)]" />
                  </button>
                )}

                <button
                  onClick={handleOpenComparison}
                  className="inline-flex items-center justify-between rounded-[22px] border border-[var(--color-primary-deep)]/16 bg-[linear-gradient(180deg,rgba(34,27,102,0.08),rgba(255,255,255,1))] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--color-dark)]">Compare Players</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">Open the comparison panel to decide between candidates.</p>
                  </div>
                  <GitCompareArrows size={18} className="text-[var(--color-primary-deep)]" />
                </button>

                <button
                  onClick={handleOpenExport}
                  className="inline-flex items-center justify-between rounded-[22px] border border-[var(--color-primary-border)] bg-[linear-gradient(180deg,rgba(49,39,131,0.08),rgba(255,255,255,1))] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--color-dark)]">Export Dossier</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                      {primaryExportReportId ? 'Jump straight into export for the strongest available report.' : 'Create a report first, then export a player dossier.'}
                    </p>
                  </div>
                  <FileDown size={18} className="text-[var(--color-primary)]" />
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
                          : 'border-[var(--color-primary-deep)]/18 bg-[linear-gradient(180deg,rgba(34,27,102,0.08),rgba(255,255,255,1))]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">
                          {entry.clubLabel}
                        </p>
                        <h3 className="mt-2 text-xl font-black text-[var(--color-dark)]">{entry.name}</h3>
                      </div>
                      {canManageWatchlist ? (
                        <button
                          onClick={() => void handleWatchlistToggle(entry)}
                          disabled={updatingWatchlistKey === entry.playerKey}
                          className={`rounded-full border p-2 transition-colors ${
                            entry.isWatchlisted
                              ? 'border-[var(--color-primary-deep)]/40 bg-[var(--color-primary-deep)]/12 text-[var(--color-primary-deep)]'
                              : 'border-[var(--color-mid)]/20 text-[var(--color-mid)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)]'
                          }`}
                        >
                          <Star size={16} fill={entry.isWatchlisted ? 'currentColor' : 'none'} />
                        </button>
                      ) : null}
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

                    {entry.latestReportId ? (
                      <button
                        onClick={() => navigate(`/report/${entry.latestReportId}`)}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)] transition-opacity hover:opacity-80"
                      >
                        Open latest report
                        <ArrowRight size={16} />
                      </button>
                    ) : null}
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
                  className="mwos-select-field w-full rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
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
                  className="mwos-select-field w-full rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
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
                              <span className="rounded-full bg-[var(--color-primary-deep)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary-deep)]">
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
                            {canManageWatchlist ? (
                              <button
                                onClick={() => void handleWatchlistToggle(entry)}
                                disabled={updatingWatchlistKey === entry.playerKey}
                                className={`col-span-2 rounded-2xl px-4 py-3 text-sm font-black transition-all sm:col-span-1 ${
                                  entry.isWatchlisted
                                    ? 'bg-[var(--color-primary-deep)] text-white shadow-[0_14px_30px_rgba(34,27,102,0.22)]'
                                    : 'border border-[var(--color-mid)]/20 bg-white text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'
                                }`}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Star size={16} fill={entry.isWatchlisted ? 'currentColor' : 'none'} />
                                  {entry.isWatchlisted ? 'Shortlisted' : 'Add to watchlist'}
                                </span>
                              </button>
                            ) : null}
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
                            onClick={() => setSelectedPlayerKey(entry.playerKey)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/20 bg-white px-4 py-2.5 text-sm font-black text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5"
                          >
                            Open profile
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenPlayerProfilePage(entry)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary-deep)]/18 bg-[var(--color-primary-deep)]/6 px-4 py-2.5 text-sm font-black text-[var(--color-primary-deep)] transition-all hover:border-[var(--color-primary-deep)]/30 hover:bg-[var(--color-primary-deep)]/10"
                          >
                            Full page
                            <ArrowRight size={16} />
                          </button>
                          {entry.latestReportId ? (
                            <button
                              onClick={() => navigate(`/report/${entry.latestReportId}`)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(49,39,131,0.2)] transition-opacity hover:opacity-90"
                            >
                              Open latest report
                              <ArrowRight size={16} />
                            </button>
                          ) : null}
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
                  <div className="rounded-2xl bg-[var(--color-primary-deep)]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary-deep)]">
                    {overview?.watchlistCount || 0} saved
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {(overview?.watchlist || []).map((entry) => (
                    <div
                      key={entry.playerKey}
                      className="rounded-2xl border border-[var(--color-primary-deep)]/16 bg-[linear-gradient(180deg,rgba(34,27,102,0.08),rgba(255,255,255,1))] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-[var(--color-dark)]">{entry.name}</h3>
                          <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">{entry.clubLabel}</p>
                        </div>
                        {canManageWatchlist ? (
                          <button
                            onClick={() => void handleWatchlistToggle(entry)}
                            className="rounded-full bg-white/80 p-2 text-[var(--color-primary-deep)] transition-opacity hover:opacity-80"
                          >
                            <Star size={15} fill="currentColor" />
                          </button>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm font-semibold text-[var(--color-mid)]">{entry.latestVerdict}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {entry.latestReportId ? (
                          <>
                            <button
                              onClick={() => navigate(`/report/${entry.latestReportId}`)}
                              className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)] transition-opacity hover:opacity-80"
                            >
                              Open supporting report
                              <ArrowRight size={15} />
                            </button>
                            <button
                              onClick={() => navigate(`/report/${entry.latestReportId}?tab=export`)}
                              className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary-deep)] transition-opacity hover:opacity-80"
                            >
                              Export dossier
                              <FileDown size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenPlayerProfilePage(entry)}
                            className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)] transition-opacity hover:opacity-80"
                          >
                            Open roster profile
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {!loading && (overview?.watchlist || []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-5 text-sm font-semibold text-[var(--color-mid)]">
                      Use the star on a player card to build your shortlist.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
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
