import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarClock, Ruler, ShieldCheck } from 'lucide-react';

import AppSidebar from '../components/AppSidebar';
import PlayerProfilePanel from '../components/players/PlayerProfilePanel';
import { fetchClubPlayerProfileById, fetchClubRosterOverview, type ClubPlayerProfile, type ClubRosterOverview } from '../lib/clubPlayersData';
import {
  addPlayerToWatchlist,
  canAccessMatchDayModule,
  canCreateScoutingReports,
  fetchPlayerHubData,
  removePlayerFromWatchlist,
  type PlayerHubEntry,
  type PlayerHubOverview,
} from '../lib/data';
import { buildMatchDayLinkPath, fetchPlayerMatchDayStatus, type PlayerMatchDayStatus } from '../lib/matchDayData';
import { buildAnthropometricComparisonRows, buildClubRosterSnapshot, type AnthropometricComparisonRow } from '../lib/playerHubDomain';
import { useAuthStore } from '../store/auth';

function formatMetric(value: number | null, suffix: string, digits = 0) {
  if (value === null || Number.isNaN(value)) return `-- ${suffix}`;
  return `${value.toFixed(digits)} ${suffix}`;
}

export default function PlayerProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { playerKey: rawPlayerKey } = useParams();
  const playerKey = decodeURIComponent(rawPlayerKey || '');
  const canCreateReports = canCreateScoutingReports(user);
  const canManageWatchlist = canCreateReports;
  const canViewMatchDayStatus = canAccessMatchDayModule(user);

  const [overview, setOverview] = useState<PlayerHubOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingWatchlistKey, setUpdatingWatchlistKey] = useState<string | null>(null);
  const [clubProfile, setClubProfile] = useState<ClubPlayerProfile | null>(null);
  const [clubProfileLoading, setClubProfileLoading] = useState(false);
  const [teamRosterOverview, setTeamRosterOverview] = useState<ClubRosterOverview | null>(null);
  const [matchDayStatus, setMatchDayStatus] = useState<PlayerMatchDayStatus | null>(null);
  const [matchDayStatusLoading, setMatchDayStatusLoading] = useState(false);

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
        console.error('Failed to load player profile workspace.', loadError);
        setError(loadError.message || 'Failed to load player profile.');
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

  const selectedPlayer = useMemo(
    () => overview?.entries.find((entry) => entry.playerKey === playerKey) || null,
    [overview, playerKey],
  );

  useEffect(() => {
    let isMounted = true;

    if (!selectedPlayer?.linkedClubPlayerId) {
      setClubProfile(null);
      return () => {
        isMounted = false;
      };
    }

    void (async () => {
      setClubProfileLoading(true);
      try {
        const result = await fetchClubPlayerProfileById(selectedPlayer.linkedClubPlayerId || '');
        if (!isMounted) return;
        setClubProfile(result);
      } catch (loadError) {
        if (!isMounted) return;
        console.error('Failed to load linked club player profile.', loadError);
        setClubProfile(null);
      } finally {
        if (isMounted) {
          setClubProfileLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedPlayer?.linkedClubPlayerId]);

  useEffect(() => {
    let isMounted = true;

    if (!clubProfile?.teamId) {
      setTeamRosterOverview(null);
      return () => {
        isMounted = false;
      };
    }

    void (async () => {
      try {
        const result = await fetchClubRosterOverview(clubProfile.teamId);
        if (!isMounted) return;
        setTeamRosterOverview(result);
      } catch (loadError) {
        if (!isMounted) return;
        console.error('Failed to load team roster context.', loadError);
        setTeamRosterOverview(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [clubProfile?.teamId]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedPlayer?.linkedClubPlayerId || !canViewMatchDayStatus) {
      setMatchDayStatus(null);
      return () => {
        isMounted = false;
      };
    }

    void (async () => {
      setMatchDayStatusLoading(true);
      try {
        const result = await fetchPlayerMatchDayStatus(selectedPlayer.linkedClubPlayerId);
        if (!isMounted) return;
        setMatchDayStatus(result);
      } catch (loadError) {
        if (!isMounted) return;
        console.error('Failed to load player match-day status.', loadError);
        setMatchDayStatus(null);
      } finally {
        if (isMounted) {
          setMatchDayStatusLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [canViewMatchDayStatus, selectedPlayer?.linkedClubPlayerId]);

  const relatedEntries = useMemo(() => {
    if (!overview || !selectedPlayer) return [];

    return overview.entries
      .filter((entry) => entry.playerKey !== selectedPlayer.playerKey)
      .sort((left, right) => {
        const sameClubLeft = left.clubLabel === selectedPlayer.clubLabel ? 1 : 0;
        const sameClubRight = right.clubLabel === selectedPlayer.clubLabel ? 1 : 0;

        if (sameClubRight !== sameClubLeft) {
          return sameClubRight - sameClubLeft;
        }

        return right.averageScore - left.averageScore;
      })
      .slice(0, 5);
  }, [overview, selectedPlayer]);

  const teamSnapshot = useMemo(
    () => buildClubRosterSnapshot(teamRosterOverview?.players || []),
    [teamRosterOverview],
  );

  const samePositionCount = useMemo(() => {
    if (!clubProfile || !teamRosterOverview) return 0;
    return teamRosterOverview.players.filter((player) => player.primaryPosition === clubProfile.primaryPosition).length;
  }, [clubProfile, teamRosterOverview]);

  const anthropometricRows = buildAnthropometricComparisonRows([
    {
      label: 'Height',
      value: clubProfile?.heightCm ?? null,
      baseline: teamSnapshot.averageHeightCm,
      unit: 'cm',
      digits: 0,
      tolerance: 12,
    },
    {
      label: 'Weight',
      value: clubProfile?.weightKg ?? null,
      baseline: teamSnapshot.averageWeightKg,
      unit: 'kg',
      digits: 0,
      tolerance: 10,
    },
    {
      label: 'BMI',
      value: clubProfile?.bmi ?? null,
      baseline: teamSnapshot.averageBmi,
      unit: '',
      digits: 1,
      tolerance: 3,
    },
  ]);

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
            <div className="mwos-ribbon-surface relative overflow-hidden px-4 py-5 text-white md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/68">
                    MWOS Player Record
                  </p>
                  <h1 className="mt-2 mwos-display text-[2.4rem] uppercase leading-none tracking-[0.05em] text-white md:text-5xl">
                    {selectedPlayer?.name || 'Player Profile'}
                  </h1>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/78">
                    One player, one surface: scouting trend, latest verdict, roster context and the next decision.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => navigate('/players')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(12,16,53,0.12)] backdrop-blur-sm"
                  >
                    <ArrowLeft size={16} />
                    Back to hub
                  </button>
                  {selectedPlayer?.latestReportId ? (
                    <button
                      onClick={() => navigate(`/report/${selectedPlayer.latestReportId}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[var(--color-primary)] shadow-[0_14px_30px_rgba(12,16,53,0.22)]"
                    >
                      Open report
                      <ArrowRight size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <div className="mwos-card-tone-danger rounded-2xl border p-4 text-sm font-semibold text-[var(--color-accent-deep)]">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-white p-5 text-sm font-semibold text-[var(--color-mid)]">
              Loading player profile…
            </div>
          ) : null}

          {!loading && !selectedPlayer ? (
            <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-white p-5">
              <p className="text-lg font-black text-[var(--color-dark)]">This player is no longer in the current player hub.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                The profile link may be old or the player no longer matches the current filters and records.
              </p>
              <button
                onClick={() => navigate('/players')}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white"
              >
                Return to Player Hub
                <ArrowRight size={16} />
              </button>
            </div>
          ) : null}

          {selectedPlayer ? (
            <>
              <PlayerProfilePanel
                entry={selectedPlayer}
                canManageWatchlist={canManageWatchlist}
                updatingWatchlistKey={updatingWatchlistKey}
                onToggleWatchlist={handleWatchlistToggle}
                onOpenReport={(reportId) => navigate(`/report/${reportId}`)}
              />

              <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                  <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                      <Ruler size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Club context</p>
                      <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Internal roster profile</h2>
                    </div>
                  </div>

                  {selectedPlayer.linkedClubPlayerId ? (
                    clubProfileLoading ? (
                      <div className="mt-5 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                        Loading linked roster profile…
                      </div>
                    ) : clubProfile ? (
                      <div className="mt-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                              {clubProfile.teamName}
                            </p>
                            <h3 className="mt-2 text-2xl font-black text-[var(--color-dark)]">{clubProfile.displayName}</h3>
                            <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                              {clubProfile.primaryPosition}
                              {clubProfile.secondaryPosition ? ` • ${clubProfile.secondaryPosition}` : ''}
                            </p>
                          </div>
                          {clubProfile.squadNumber !== null ? (
                            <div className="rounded-2xl bg-[var(--color-primary)]/8 px-4 py-3 text-center">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">No</p>
                              <p className="mt-1 text-2xl font-black text-[var(--color-primary)]">{clubProfile.squadNumber}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <RosterMetric label="Height" value={formatMetric(clubProfile.heightCm, 'cm')} />
                          <RosterMetric label="Weight" value={formatMetric(clubProfile.weightKg, 'kg')} />
                          <RosterMetric label="BMI" value={clubProfile.bmi === null ? '--' : clubProfile.bmi.toFixed(1)} />
                          <RosterMetric label="Foot" value={clubProfile.dominantFootLabel} />
                        </div>

                        <div className="rounded-[24px] border border-[var(--color-primary-deep)]/14 bg-[linear-gradient(180deg,rgba(34,27,102,0.06),rgba(255,255,255,1))] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                                Against team average
                              </p>
                              <h4 className="mt-2 text-lg font-black text-[var(--color-dark)]">
                                Physical comparison
                              </h4>
                            </div>
                            <div className="rounded-2xl bg-white/82 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary-deep)]">
                              {teamRosterOverview?.selectedTeamName || clubProfile.teamName}
                            </div>
                          </div>

                          <AnthropometricComparisonChart rows={anthropometricRows} />

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/82 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                              {samePositionCount > 0 ? `${samePositionCount} in ${clubProfile.primaryPosition}` : 'Unique position lane'}
                            </span>
                            <span className="rounded-full bg-white/82 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                              {teamSnapshot.completeRate}% team physical completion
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[var(--color-primary)]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">
                            {clubProfile.nationality}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                            {clubProfile.hasCompleteAnthropometrics ? 'Anthropometrics complete' : 'Needs physical data'}
                          </span>
                          {!clubProfile.isActive ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                              Inactive
                            </span>
                          ) : null}
                        </div>

                        {clubProfile.notes ? (
                          <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                            {clubProfile.notes}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                        This player is linked, but no internal roster snapshot was returned.
                      </div>
                    )
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                      This scouting profile is still external-only. Link it from Team Sheets to unlock the internal club record here.
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {canViewMatchDayStatus ? (
                    <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                      <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                          <CalendarClock size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Match Day</p>
                          <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Current squad status</h2>
                        </div>
                      </div>

                      {!selectedPlayer.linkedClubPlayerId ? (
                        <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          Link this player to the club roster first to carry match-day status into the profile.
                        </div>
                      ) : matchDayStatusLoading ? (
                        <div className="mt-5 rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          Loading the next relevant match-day decision…
                        </div>
                      ) : matchDayStatus ? (
                        <div className="mt-5 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                                {matchDayStatus.teamName}
                              </p>
                              <h3 className="mt-2 text-2xl font-black text-[var(--color-dark)]">
                                vs {matchDayStatus.opponent}
                              </h3>
                              <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                                {matchDayStatus.matchDate}
                                {matchDayStatus.kickoffTime ? ` • ${matchDayStatus.kickoffTime}` : ''}
                                {matchDayStatus.venue ? ` • ${matchDayStatus.venue}` : ''}
                              </p>
                            </div>
                            <span className="rounded-full bg-[var(--color-primary)]/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                              {formatStatusLabel(matchDayStatus.workflowStatus)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${availabilityToneClass(matchDayStatus.availabilityStatus)}`}>
                              {formatStatusLabel(matchDayStatus.availabilityStatus)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${selectionToneClass(matchDayStatus.selectionStatus)}`}>
                              {formatStatusLabel(matchDayStatus.selectionStatus)}
                            </span>
                            {matchDayStatus.competition ? (
                              <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">
                                {matchDayStatus.competition}
                              </span>
                            ) : null}
                          </div>

                          {matchDayStatus.notes ? (
                            <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                              {matchDayStatus.notes}
                            </div>
                          ) : null}

                          <button
                            onClick={() => navigate(buildMatchDayLinkPath(matchDayStatus.teamId, matchDayStatus.matchDayId))}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white"
                          >
                            Open match-day board
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          No current match-day decision has been recorded for this player yet.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                    <div className="flex items-center gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary-deep)]/10 text-[var(--color-primary-deep)]">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Decision lane</p>
                        <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Recommended next move</h2>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <DecisionCard
                        title={selectedPlayer.isWatchlisted ? 'Already shortlisted' : 'Consider shortlist'}
                        body={
                          selectedPlayer.isWatchlisted
                            ? 'This player is already saved for follow-up. Use the linked report and roster view to move into trial or match-day decisions.'
                            : 'The profile is not yet in the shortlist. Save it once you are confident this player deserves trial or follow-up attention.'
                        }
                      />
                      <DecisionCard
                        title="Review latest evidence"
                        body={`Latest verdict: ${selectedPlayer.latestVerdict}`}
                      />
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-mid)]/12 pb-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">Nearby profiles</p>
                        <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">Related players</h2>
                      </div>
                      <div className="rounded-2xl bg-[var(--color-light)] px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                        {relatedEntries.length} shown
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {relatedEntries.map((entry) => (
                        <button
                          key={entry.playerKey}
                          onClick={() => navigate(`/players/${encodeURIComponent(entry.playerKey)}`)}
                          className="w-full rounded-[22px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/50 p-4 text-left transition-all hover:border-[var(--color-primary)]/18 hover:bg-[var(--color-primary)]/4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-[var(--color-dark)]">{entry.name}</p>
                              <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                                {entry.clubLabel} • {entry.bestPotential}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">Avg</p>
                              <p className="mt-1 text-lg font-black text-[var(--color-primary)]">{entry.averageScore.toFixed(1)}</p>
                            </div>
                          </div>
                        </button>
                      ))}

                      {relatedEntries.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-[var(--color-light)]/55 p-4 text-sm font-semibold text-[var(--color-mid)]">
                          More tracked players will appear here as the hub grows.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function RosterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-1 text-sm font-black text-[var(--color-dark)]">{value}</p>
    </div>
  );
}

function DecisionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 p-4">
      <p className="text-sm font-black text-[var(--color-dark)]">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">{body}</p>
    </div>
  );
}

function AnthropometricComparisonChart({ rows }: { rows: AnthropometricComparisonRow[] }) {
  return (
    <div className="mt-4 space-y-3 rounded-[22px] border border-white/70 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
      {rows.map((row) => (
        <div key={row.label}>
          <AnthropometricComparisonRowView row={row} />
        </div>
      ))}
    </div>
  );
}

function AnthropometricComparisonRowView({ row }: { row: AnthropometricComparisonRow }) {
  const markerClass =
    row.tone === 'above'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : row.tone === 'below'
        ? 'border-[var(--color-accent)]/18 bg-[var(--color-accent-soft)] text-[var(--color-accent-deep)]'
        : row.tone === 'level'
          ? 'border-[var(--color-primary)]/16 bg-[var(--color-primary)]/6 text-[var(--color-primary)]'
          : 'border-[var(--color-mid)]/14 bg-white text-[var(--color-mid)]';

  const playerPercent = row.playerPercent ?? 50;
  const baselinePercent = row.baselinePercent ?? 50;

  return (
    <div className="rounded-[20px] border border-[var(--color-mid)]/10 bg-white/76 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
            {row.label}
          </p>
          <p className="mt-1 text-lg font-black text-[var(--color-dark)]">{row.valueLabel}</p>
        </div>
        <div className={`rounded-2xl border px-3 py-2 text-right ${markerClass}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]">Team</p>
          <p className="mt-0.5 text-xs font-black">{row.baselineLabel}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="relative h-8 rounded-full bg-[linear-gradient(90deg,rgba(190,23,23,0.10),rgba(49,39,131,0.08),rgba(16,185,129,0.12))]">
          <span
            className="absolute top-1/2 h-7 w-px -translate-y-1/2 rounded-full bg-[var(--color-mid)]/40"
            style={{ left: `${baselinePercent}%` }}
          />
          {row.playerPercent !== null ? (
            <span
              className="absolute top-1/2 flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary)] px-2 text-[10px] font-black text-white shadow-[0_8px_20px_rgba(49,39,131,0.22)]"
              style={{ left: `${playerPercent}%` }}
            >
              {row.difference === null ? '--' : row.difference > 0 ? `+${row.difference}` : row.difference}
            </span>
          ) : (
            <span className="absolute inset-y-1 left-3 flex items-center rounded-full bg-white/74 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
              Needs data
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
          <span>Below avg</span>
          <span>Team avg</span>
          <span>Above avg</span>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">{row.context}</p>
    </div>
  );
}

function formatStatusLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function availabilityToneClass(value: PlayerMatchDayStatus['availabilityStatus']) {
  if (value === 'unavailable') return 'bg-rose-50 text-rose-700';
  if (value === 'doubtful') return 'bg-amber-50 text-amber-700';
  return 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]';
}

function selectionToneClass(value: PlayerMatchDayStatus['selectionStatus']) {
  if (value === 'starter') return 'bg-emerald-50 text-emerald-700';
  if (value === 'bench') return 'bg-slate-100 text-slate-700';
  return 'bg-[var(--color-primary-deep)]/8 text-[var(--color-primary-deep)]';
}
