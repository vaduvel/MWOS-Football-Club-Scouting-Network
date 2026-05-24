import React, { useEffect, useState } from 'react';
import { useReportStore, Player } from '../../store/report';
import { Plus, Trash2, Download, Link2, Unlink2 } from 'lucide-react';
import ImportTeamModal from '../../components/ImportTeamModal';
import { createId } from '../../lib/ids';
import {
  fetchClubPlayerMatchCandidates,
  type ClubPlayerRosterMatchCandidate,
} from '../../lib/clubPlayersData';
import { suggestClubPlayerMatches } from '../../lib/playerIdentityDomain';

export default function TeamSheetsTab() {
  const { currentReport, addPlayer, updatePlayer, removePlayer } = useReportStore();
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [clubCandidates, setClubCandidates] = useState<ClubPlayerRosterMatchCandidate[]>([]);
  const [clubCandidatesLoading, setClubCandidatesLoading] = useState(true);
  const [clubCandidatesError, setClubCandidatesError] = useState('');
  const players = currentReport?.players.filter(p => p.team_side === activeSide) || [];

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      setClubCandidatesLoading(true);
      setClubCandidatesError('');

      try {
        const result = await fetchClubPlayerMatchCandidates();
        if (!isMounted) return;
        setClubCandidates(result);
      } catch (error: any) {
        if (!isMounted) return;
        setClubCandidates([]);
        setClubCandidatesError(error.message || 'Could not load the internal player roster.');
      } finally {
        if (isMounted) {
          setClubCandidatesLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddPlayer = () => {
    addPlayer({
      id: createId(),
      club_player_id: null,
      team_side: activeSide,
      shirt_number: '',
      name: '',
      subbed: '',
      goal: '',
      rating: '',
      position_x: 50,
      position_y: 50,
    });
  };

  const getLinkedCandidate = (player: Player) =>
    clubCandidates.find((candidate) => candidate.id === player.club_player_id) || null;

  const getSuggestions = (player: Player) =>
    suggestClubPlayerMatches<ClubPlayerRosterMatchCandidate>(
      {
        name: player.name,
        shirtNumber: typeof player.shirt_number === 'number' ? player.shirt_number : null,
      },
      clubCandidates,
      2,
    );

  const handleClubPlayerLink = (player: Player, candidateId: string) => {
    const candidate = clubCandidates.find((item) => item.id === candidateId);
    if (!candidate) {
      updatePlayer(player.id, { club_player_id: null });
      return;
    }

    updatePlayer(player.id, {
      club_player_id: candidate.id,
      name: player.name.trim() ? player.name : candidate.displayName,
      shirt_number: player.shirt_number || candidate.squadNumber || '',
    });
  };

  const renderManualRosterSelect = (player: Player, helperText: string) => {
    if (clubCandidates.length === 0) {
      return null;
    }

    return (
      <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-white/78 px-3 py-3">
        <label className="block">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
            <Link2 size={12} />
            Manual roster link
          </span>
          <select
            value={player.club_player_id || ''}
            onChange={(event) => handleClubPlayerLink(player, event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--color-mid)]/18 bg-white px-3 py-3 text-sm font-bold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
          >
            <option value="">Keep as external player</option>
            {clubCandidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.teamName} · {candidate.squadNumber ? `#${candidate.squadNumber} · ` : ''}
                {candidate.displayName}
                {candidate.primaryPosition ? ` · ${candidate.primaryPosition}` : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[11px] font-semibold leading-5 text-[var(--color-mid)]">{helperText}</p>
      </div>
    );
  };

  const renderRosterMatchPanel = (player: Player) => {
    const linkedCandidate = getLinkedCandidate(player);
    const suggestions = linkedCandidate ? [] : getSuggestions(player);
    const hasName = player.name.trim().length >= 2;

    if (clubCandidatesLoading) {
      return (
        <div className="rounded-2xl border border-[var(--color-mid)]/14 bg-white/80 px-3 py-2 text-[11px] font-semibold text-[var(--color-mid)]">
          Loading internal roster suggestions…
        </div>
      );
    }

    if (clubCandidatesError) {
      return (
        <div className="rounded-2xl border border-[var(--color-accent)]/18 bg-[var(--color-accent)]/6 px-3 py-2 text-[11px] font-semibold text-[var(--color-accent)]">
          {clubCandidatesError}
        </div>
      );
    }

    if (linkedCandidate) {
      return (
        <div className="rounded-2xl border border-[var(--color-primary)]/18 bg-[var(--color-primary)]/8 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                <Link2 size={12} />
                Linked to club roster
              </p>
              <p className="mt-1 text-sm font-black text-[var(--color-dark)]">
                {linkedCandidate.displayName}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                {linkedCandidate.teamName}
                {linkedCandidate.squadNumber ? ` · #${linkedCandidate.squadNumber}` : ''}
                {linkedCandidate.primaryPosition ? ` · ${linkedCandidate.primaryPosition}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePlayer(player.id, { club_player_id: null })}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)]/18 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/8"
            >
              <Unlink2 size={12} />
              Clear
            </button>
          </div>
        </div>
      );
    }

    if (!hasName) {
      return renderManualRosterSelect(
        player,
        'If this is an MWOS player, link the roster profile first and the name/number will fill in automatically.',
      );
    }

    if (suggestions.length === 0) {
      return (
        <div className="space-y-2">
          <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/18 bg-white/72 px-3 py-2 text-[11px] font-semibold text-[var(--color-mid)]">
            No confident internal roster match yet. Keep this player external or choose the roster profile manually.
          </div>
          {renderManualRosterSelect(player, 'Use this when the scout spelling does not match the internal roster exactly.')}
        </div>
      );
    }

    return (
      <div className="space-y-2 rounded-2xl border border-[var(--color-primary)]/16 bg-[var(--color-primary)]/6 px-3 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
          Suggested internal match
        </p>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-white/70 bg-white/88 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--color-dark)]">{suggestion.displayName}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-mid)]">
                {suggestion.teamName}
                {suggestion.squadNumber ? ` · #${suggestion.squadNumber}` : ''}
                {suggestion.primaryPosition ? ` · ${suggestion.primaryPosition}` : ''}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-primary)]">
                {suggestion.matchReason}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleClubPlayerLink(player, suggestion.id)}
              className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
            >
              Confirm
            </button>
          </div>
        ))}
        {renderManualRosterSelect(player, 'Not the right suggestion? Select the exact internal player here.')}
      </div>
    );
  };

  if (!currentReport) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 md:space-y-6">
      
      {/* Team Toggle */}
      <div className="mx-auto flex w-full max-w-md rounded-2xl bg-[var(--color-mid)]/18 p-1">
        <button
          onClick={() => setActiveSide('home')}
          className={`flex-1 rounded-[14px] px-3 py-2.5 text-sm font-bold uppercase tracking-[0.14em] transition-all ${
            activeSide === 'home' 
              ? 'bg-white text-[var(--color-primary)] shadow-sm' 
              : 'text-[var(--color-dark)]/60 hover:text-[var(--color-dark)]'
          }`}
        >
          {currentReport.home_team || 'Home Team'}
        </button>
        <button
          onClick={() => setActiveSide('away')}
          className={`flex-1 rounded-[14px] px-3 py-2.5 text-sm font-bold uppercase tracking-[0.14em] transition-all ${
            activeSide === 'away' 
              ? 'bg-white text-[var(--color-accent)] shadow-sm' 
              : 'text-[var(--color-dark)]/60 hover:text-[var(--color-dark)]'
          }`}
        >
          {currentReport.away_team || 'Away Team'}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--color-mid)]/20 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">
              {activeSide === 'home' ? currentReport.home_team || 'Home team' : currentReport.away_team || 'Away team'}
            </p>
            <h2 className="mt-1 text-base font-black uppercase tracking-tight text-[var(--color-dark)] md:text-xl">
              Squad List
            </h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap">
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center space-x-2 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-light)] px-3 py-2.5 text-sm font-bold text-[var(--color-primary)] transition-all hover:bg-[var(--color-mid)]/20">
              <Download size={16} />
              <span>Import</span>
            </button>
            <button onClick={handleAddPlayer} className="flex items-center justify-center space-x-2 rounded-2xl bg-[var(--color-dark)] px-3 py-2.5 text-sm font-bold text-white transition-all hover:bg-opacity-90">
              <Plus size={16} />
              <span>Add Player</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {players.map((player, index) => (
            <article
              key={player.id}
              className="rounded-[20px] border border-[var(--color-mid)]/16 bg-[var(--color-light)]/50 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white ${activeSide === 'home' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-accent)]'}`}>
                    {player.shirt_number || index + 1}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Player</p>
                    <p className="mt-1 text-[15px] font-black text-[var(--color-dark)]">{player.name || 'Unnamed player'}</p>
                  </div>
                </div>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="rounded-full p-2 text-[var(--color-mid)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Player Name</label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={e => updatePlayer(player.id, { name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--color-mid)]/20 bg-white p-3 font-bold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="Player Name"
                  />
                </div>
                <div className="col-span-2">
                  {renderRosterMatchPanel(player)}
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Shirt Number</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={player.shirt_number}
                    onChange={e => updatePlayer(player.id, { shirt_number: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full rounded-xl border border-[var(--color-mid)]/20 bg-white p-3 font-bold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="#"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Sub (Min)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={player.subbed}
                    onChange={e => updatePlayer(player.id, { subbed: e.target.value })}
                    className="w-full rounded-xl border border-[var(--color-mid)]/20 bg-white p-3 text-center font-semibold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="75"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Rating</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="1"
                    max="10"
                    value={player.rating}
                    onChange={e => updatePlayer(player.id, { rating: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full rounded-xl border border-[var(--color-mid)]/20 bg-white p-3 text-center font-black text-[var(--color-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="1-10"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">Goal (Min)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={player.goal}
                    onChange={e => updatePlayer(player.id, { goal: e.target.value })}
                    className="w-full rounded-xl border border-[var(--color-mid)]/20 bg-white p-3 font-semibold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="12, 45"
                  />
                </div>
              </div>
            </article>
          ))}

          {players.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-6 text-center text-sm font-semibold text-[var(--color-mid)]">
              No players added yet. Tap “Add Player” or “Import” to build the squad.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b-2 border-[var(--color-dark)] text-[var(--color-dark)]">
              <th className="p-3 font-black uppercase tracking-wider text-xs w-16">No.</th>
              <th className="p-3 font-black uppercase tracking-wider text-xs">Player Name</th>
              <th className="p-3 font-black uppercase tracking-wider text-xs w-24">Sub (Min)</th>
              <th className="p-3 font-black uppercase tracking-wider text-xs w-24">Goal (Min)</th>
              <th className="p-3 font-black uppercase tracking-wider text-xs w-24">Rating</th>
              <th className="p-3 font-black uppercase tracking-wider text-xs w-12"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id} className="border-b border-[var(--color-mid)]/20 hover:bg-[var(--color-light)] transition-colors">
                <td className="p-2">
                  <input 
                    type="number" 
                    value={player.shirt_number} 
                    onChange={e => updatePlayer(player.id, { shirt_number: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full p-2 rounded-md border border-transparent hover:border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:bg-white outline-none font-mono font-bold text-center bg-transparent"
                    placeholder="#"
                  />
                </td>
                <td className="p-2">
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={player.name} 
                      onChange={e => updatePlayer(player.id, { name: e.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent p-2 font-bold outline-none hover:border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:bg-white"
                      placeholder="Player Name"
                    />
                    {renderRosterMatchPanel(player)}
                  </div>
                </td>
                <td className="p-2">
                  <input 
                    type="text" 
                    value={player.subbed} 
                    onChange={e => updatePlayer(player.id, { subbed: e.target.value })}
                    className="w-full p-2 rounded-md border border-transparent hover:border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:bg-white outline-none font-semibold text-center bg-transparent"
                    placeholder="e.g. 75"
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="text" 
                    value={player.goal} 
                    onChange={e => updatePlayer(player.id, { goal: e.target.value })}
                    className="w-full p-2 rounded-md border border-transparent hover:border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:bg-white outline-none font-semibold text-center bg-transparent"
                    placeholder="e.g. 12, 45"
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    step="0.5"
                    min="1"
                    max="10"
                    value={player.rating} 
                    onChange={e => updatePlayer(player.id, { rating: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full p-2 rounded-md border border-transparent hover:border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:bg-white outline-none font-black text-center bg-transparent text-[var(--color-primary)]"
                    placeholder="1-10"
                  />
                </td>
                <td className="p-2 text-center">
                  <button onClick={() => removePlayer(player.id)} className="p-2 text-[var(--color-mid)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--color-mid)] font-semibold">
                  No players added yet. Click "Add Player" or "Import" to start building the squad.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      
      <ImportTeamModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} teamSide={activeSide} />
    </div>
  );
}
