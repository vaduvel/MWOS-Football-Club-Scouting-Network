import { Database, Footprints, Ruler, ShieldAlert, Users } from 'lucide-react';

import type { ClubRosterOverview } from '../../lib/clubPlayersData';
import { formatClubPlayerMetric } from '../../lib/clubPlayersDomain';
import { buildClubRosterSnapshot } from '../../lib/playerHubDomain';

type ClubRosterSectionProps = {
  overview: ClubRosterOverview | null;
  loading: boolean;
  search: string;
  teamId: string;
  onTeamChange: (teamId: string) => void;
};

export default function ClubRosterSection({
  overview,
  loading,
  search,
  teamId,
  onTeamChange,
}: ClubRosterSectionProps) {
  const filteredPlayers = (overview?.players || []).filter((player) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;

    return [
      player.displayName,
      player.nationality,
      player.primaryPosition,
      player.secondaryPosition,
      player.dominantFootLabel,
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
  const snapshot = buildClubRosterSnapshot(filteredPlayers);

  return (
    <section className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_16px_45px_rgba(49,39,131,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-mid)]/12 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="mwos-surface-intro">
          <div className="mwos-surface-intro-icon flex size-10 items-center justify-center rounded-2xl bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
            <Database size={20} />
          </div>
          <div className="mwos-surface-intro-copy">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
              Club Database
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-dark)] md:text-2xl">
              Club Roster
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
              Use this as the internal source of truth for squad records, anthropometrics and future match-day selection.
            </p>
          </div>
        </div>

        <div className="min-w-0 md:min-w-[220px]">
          <label className="mwos-form-label text-[var(--color-mid)]">Team</label>
          <select
            value={teamId}
            onChange={(event) => onTeamChange(event.target.value)}
            className="mwos-select-field mwos-mobile-input"
          >
            {(overview?.teams || []).map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {overview?.setupNotice ? (
        <div className="mwos-card-tone-alert mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--color-accent-deep)]">
          {overview.setupNotice}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className="mwos-subcard mwos-subcard-training p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mwos-subcard-kicker">Roster</p>
              <p className="mwos-subcard-value mt-2 tabular-nums">{overview?.stats.totalPlayers || 0}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-2xl bg-white/82 text-[var(--color-primary)]">
              <Users size={16} />
            </div>
          </div>
          <p className="mwos-subcard-copy mt-2">Active players in {overview?.selectedTeamName || 'this squad'}.</p>
        </article>

        <article className="mwos-subcard mwos-subcard-success p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mwos-subcard-kicker">Complete</p>
              <p className="mwos-subcard-value mt-2 tabular-nums">{overview?.stats.completeDataCount || 0}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-2xl bg-white/82 text-[var(--color-primary)]">
              <Ruler size={16} />
            </div>
          </div>
          <p className="mwos-subcard-copy mt-2">Height, weight and BMI already available.</p>
        </article>

        <article className="mwos-subcard mwos-subcard-alert p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mwos-subcard-kicker">Missing data</p>
              <p className="mwos-subcard-value mt-2 tabular-nums">{overview?.stats.missingDataCount || 0}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-2xl bg-white/82 text-[var(--color-accent)]">
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className="mwos-subcard-copy mt-2">Players that still need anthropometric completion.</p>
        </article>

        <article className="mwos-subcard mwos-subcard-staff p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mwos-subcard-kicker">Two-footed</p>
              <p className="mwos-subcard-value mt-2 tabular-nums">{overview?.stats.dualFootedCount || 0}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-2xl bg-white/82 text-[var(--color-primary)]">
              <Footprints size={16} />
            </div>
          </div>
          <p className="mwos-subcard-copy mt-2">Useful immediately for planning and match-day flexibility.</p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[24px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.05),rgba(255,255,255,1))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                Squad profile
              </p>
              <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">Team snapshot</h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-white/82 text-[var(--color-primary)]">
              <Ruler size={16} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SnapshotMetric label="Avg height" value={snapshot.averageHeightCm === null ? '-- cm' : `${snapshot.averageHeightCm.toFixed(1)} cm`} />
            <SnapshotMetric label="Avg weight" value={snapshot.averageWeightKg === null ? '-- kg' : `${snapshot.averageWeightKg.toFixed(1)} kg`} />
            <SnapshotMetric label="Complete data" value={`${snapshot.completeRate}%`} />
            <SnapshotMetric label="Left / both" value={`${snapshot.footCounts.left + snapshot.footCounts.both}`} />
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--color-primary-deep)]/14 bg-[linear-gradient(180deg,rgba(34,27,102,0.06),rgba(255,255,255,1))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
                Position mix
              </p>
              <h3 className="mt-2 text-lg font-black text-[var(--color-dark)]">Where the squad is built</h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-white/82 text-[var(--color-primary-deep)]">
              <Users size={16} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {snapshot.positionMix.length ? (
              snapshot.positionMix.map((item) => (
                <span
                  key={`${item.label}-${item.count}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-mid)]/16 bg-white/82 px-3 py-2 text-xs font-black text-[var(--color-dark)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                >
                  <span className="text-[var(--color-primary)]">{item.label}</span>
                  <span className="text-[var(--color-mid)]">{item.count}</span>
                </span>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/22 bg-white/72 px-4 py-3 text-sm font-semibold text-[var(--color-mid)]">
                Add players to this team to unlock the role mix.
              </div>
            )}
          </div>
        </article>
      </div>

      {loading ? (
        <div className="mwos-mobile-note mt-5">Loading club roster…</div>
      ) : null}

      {!loading && !filteredPlayers.length ? (
        <div className="mwos-mobile-note mt-5">
          {search.trim()
            ? 'No roster players match this search yet.'
            : 'No club roster has been imported for this team yet.'}
        </div>
      ) : null}

      {!loading && filteredPlayers.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlayers.map((player) => (
            <article
              key={player.id}
              className="rounded-[24px] border border-[var(--color-mid)]/14 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mwos-pill mwos-pill-training">
                      {player.primaryPosition}
                    </span>
                    {player.secondaryPosition ? (
                      <span className="mwos-pill mwos-pill-neutral">
                        {player.secondaryPosition}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-xl font-black text-[var(--color-dark)]">
                    {player.displayName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">
                    {player.nationality}
                  </p>
                </div>

                {player.squadNumber !== null ? (
                  <div className="rounded-2xl bg-[var(--color-primary)]/8 px-3 py-2 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
                      No
                    </p>
                    <p className="mt-1 text-lg font-black text-[var(--color-primary)]">
                      {player.squadNumber}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                    Height
                  </p>
                  <p className="mt-1 text-sm font-black text-[var(--color-dark)]">
                    {formatClubPlayerMetric(player.heightCm, 'cm')}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                    Weight
                  </p>
                  <p className="mt-1 text-sm font-black text-[var(--color-dark)]">
                    {formatClubPlayerMetric(player.weightKg, 'kg')}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-[var(--color-light)]/55 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
                    BMI
                  </p>
                  <p className="mt-1 text-sm font-black text-[var(--color-dark)]">
                    {player.bmi === null ? '--' : player.bmi.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="mwos-pill mwos-pill-staff">
                  {player.dominantFootLabel}
                </span>
                {!player.hasCompleteAnthropometrics ? (
                  <span className="mwos-pill mwos-pill-alert">
                    Needs update
                  </span>
                ) : null}
                {!player.isActive ? (
                  <span className="mwos-pill mwos-pill-neutral">
                    Inactive
                  </span>
                ) : null}
              </div>

              {player.notes ? (
                <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                  {player.notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-mid)]/12 bg-white/78 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">{label}</p>
      <p className="mt-1 text-sm font-black text-[var(--color-dark)]">{value}</p>
    </div>
  );
}
