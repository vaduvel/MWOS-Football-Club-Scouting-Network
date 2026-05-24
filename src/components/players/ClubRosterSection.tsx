import { useState } from 'react';
import { Database, Edit3, Footprints, Ruler, Save, ShieldAlert, UserPlus, Users, X } from 'lucide-react';

import type { ClubRosterOverview, ClubRosterPlayer } from '../../lib/clubPlayersData';
import {
  buildClubPlayerSavePayload,
  createEmptyClubPlayerDraft,
  formatClubPlayerMetric,
  toClubPlayerDraft,
  type ClubPlayerDraft,
  type ClubPlayerFoot,
} from '../../lib/clubPlayersDomain';
import { buildClubRosterSnapshot } from '../../lib/playerHubDomain';

type ClubRosterSectionProps = {
  overview: ClubRosterOverview | null;
  loading: boolean;
  search: string;
  teamId: string;
  canManageRoster?: boolean;
  savingPlayerId?: string | null;
  onTeamChange: (teamId: string) => void;
  onSavePlayer?: (draft: ClubPlayerDraft, playerId?: string) => Promise<void>;
};

export default function ClubRosterSection({
  overview,
  loading,
  search,
  teamId,
  canManageRoster = false,
  savingPlayerId = null,
  onTeamChange,
  onSavePlayer,
}: ClubRosterSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClubPlayerDraft>(() => createEmptyClubPlayerDraft());
  const [formError, setFormError] = useState('');
  const activeTeamId = overview?.selectedTeamId || teamId;
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
  const isSaving = savingPlayerId === (editingPlayerId || 'new');

  const updateDraft = <Key extends keyof ClubPlayerDraft>(key: Key, value: ClubPlayerDraft[Key]) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreateForm = () => {
    setDraft(createEmptyClubPlayerDraft());
    setEditingPlayerId(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (player: ClubRosterPlayer) => {
    setDraft(toClubPlayerDraft(player));
    setEditingPlayerId(player.id);
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingPlayerId(null);
    setDraft(createEmptyClubPlayerDraft());
    setFormError('');
  };

  const submitForm = async () => {
    if (!onSavePlayer) return;

    const validation = buildClubPlayerSavePayload(activeTeamId, draft);
    if (validation.errors.length) {
      setFormError(validation.errors.join(' '));
      return;
    }

    setFormError('');
    try {
      await onSavePlayer(draft, editingPlayerId || undefined);
      closeForm();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save this player.';
      setFormError(message);
    }
  };

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

        <div className="grid gap-3 md:min-w-[220px]">
          <div className="min-w-0">
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

          {canManageRoster ? (
            <button
              type="button"
              onClick={openCreateForm}
              disabled={loading || !activeTeamId}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(49,39,131,0.18)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
            >
              <UserPlus size={17} />
              {loading || !activeTeamId ? 'Loading roster' : 'Add player'}
            </button>
          ) : null}
        </div>
      </div>

      {overview?.setupNotice ? (
        <div className="mwos-card-tone-alert mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--color-accent-deep)]">
          {overview.setupNotice}
        </div>
      ) : null}

      {canManageRoster && formOpen ? (
        <div className="mt-5 rounded-[26px] border border-[var(--color-primary)]/18 bg-[linear-gradient(180deg,rgba(49,39,131,0.07),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_42px_rgba(49,39,131,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-mid)]">
                {editingPlayerId ? 'Edit roster profile' : 'Manual roster entry'}
              </p>
              <h3 className="mt-1 text-xl font-black text-[var(--color-dark)]">
                {editingPlayerId ? 'Update player details' : 'Add a player to this team'}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                Keep this lightweight: identity, position and anthropometrics are enough to feed Player Hub, Match Day and future development charts.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-mid)]/16 bg-white/80 text-[var(--color-primary)]"
              aria-label="Close roster player form"
            >
              <X size={18} />
            </button>
          </div>

          {formError ? (
            <div className="mt-4 rounded-2xl border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/8 px-4 py-3 text-sm font-bold leading-6 text-[var(--color-accent-deep)]">
              {formError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <RosterTextField label="First name" value={draft.firstName} onChange={(value) => updateDraft('firstName', value)} />
            <RosterTextField label="Last name" value={draft.lastName} onChange={(value) => updateDraft('lastName', value)} />
            <RosterTextField label="Display name" value={draft.displayName} onChange={(value) => updateDraft('displayName', value)} placeholder="Optional override" />
            <RosterTextField label="Squad no." value={draft.squadNumber} onChange={(value) => updateDraft('squadNumber', value)} inputMode="numeric" />
            <RosterTextField label="Primary position" value={draft.primaryPosition} onChange={(value) => updateDraft('primaryPosition', value)} />
            <RosterTextField label="Secondary position" value={draft.secondaryPosition} onChange={(value) => updateDraft('secondaryPosition', value)} />
            <RosterTextField label="Nationality" value={draft.nationality} onChange={(value) => updateDraft('nationality', value)} />
            <div>
              <label className="mwos-form-label text-[var(--color-mid)]">Dominant foot</label>
              <select
                value={draft.dominantFoot}
                onChange={(event) => updateDraft('dominantFoot', event.target.value as ClubPlayerFoot)}
                className="mwos-select-field mwos-mobile-input"
              >
                <option value="unknown">Unknown</option>
                <option value="right">Right foot</option>
                <option value="left">Left foot</option>
                <option value="both">Both feet</option>
              </select>
            </div>
            <RosterTextField label="Height cm" value={draft.heightCm} onChange={(value) => updateDraft('heightCm', value)} inputMode="decimal" />
            <RosterTextField label="Weight kg" value={draft.weightKg} onChange={(value) => updateDraft('weightKg', value)} inputMode="decimal" />
            <RosterTextField label="BMI" value={draft.bmi} onChange={(value) => updateDraft('bmi', value)} inputMode="decimal" placeholder="Auto if empty" />
            <label className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-[var(--color-mid)]/14 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)]">
              Active player
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => updateDraft('isActive', event.target.checked)}
                className="size-5 accent-[var(--color-primary)]"
              />
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <label className="mwos-form-label text-[var(--color-mid)]">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(event) => updateDraft('notes', event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none transition-all placeholder:text-[var(--color-mid)]/62 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/12"
                placeholder="Medical, development or registration notes..."
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={submitForm}
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(49,39,131,0.18)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <Save size={17} />
              {isSaving ? 'Saving player...' : editingPlayerId ? 'Save changes' : 'Add to roster'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/18 bg-white px-5 py-3 text-sm font-black text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 disabled:cursor-wait disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
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

              {canManageRoster ? (
                <button
                  type="button"
                  onClick={() => openEditForm(player)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary)]/16 bg-[var(--color-primary)]/6 px-4 py-2.5 text-sm font-black text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/28 hover:bg-[var(--color-primary)]/10"
                >
                  <Edit3 size={16} />
                  Edit roster details
                </button>
              ) : null}

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

function RosterTextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
}) {
  return (
    <div>
      <label className="mwos-form-label text-[var(--color-mid)]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="mwos-mobile-input w-full rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-dark)] outline-none transition-all placeholder:text-[var(--color-mid)]/62 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/12"
      />
    </div>
  );
}
