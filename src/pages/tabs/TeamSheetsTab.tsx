import React, { useState } from 'react';
import { useReportStore, Player } from '../../store/report';
import { Plus, Trash2, Download } from 'lucide-react';
import ImportTeamModal from '../../components/ImportTeamModal';
import { createId } from '../../lib/ids';

export default function TeamSheetsTab() {
  const { currentReport, addPlayer, updatePlayer, removePlayer } = useReportStore();
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  if (!currentReport) return null;

  const players = currentReport.players.filter(p => p.team_side === activeSide);

  const handleAddPlayer = () => {
    addPlayer({
      id: createId(),
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
                  <input 
                    type="text" 
                    value={player.name} 
                    onChange={e => updatePlayer(player.id, { name: e.target.value })}
                    className="w-full p-2 rounded-md border border-transparent hover:border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:bg-white outline-none font-bold bg-transparent"
                    placeholder="Player Name"
                  />
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
