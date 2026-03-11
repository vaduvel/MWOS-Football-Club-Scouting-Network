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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Team Toggle */}
      <div className="flex p-1 bg-[var(--color-mid)]/20 rounded-xl w-full max-w-md mx-auto">
        <button
          onClick={() => setActiveSide('home')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
            activeSide === 'home' 
              ? 'bg-white text-[var(--color-primary)] shadow-sm' 
              : 'text-[var(--color-dark)]/60 hover:text-[var(--color-dark)]'
          }`}
        >
          {currentReport.home_team || 'Home Team'}
        </button>
        <button
          onClick={() => setActiveSide('away')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
            activeSide === 'away' 
              ? 'bg-white text-[var(--color-accent)] shadow-sm' 
              : 'text-[var(--color-dark)]/60 hover:text-[var(--color-dark)]'
          }`}
        >
          {currentReport.away_team || 'Away Team'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-mid)]/20 overflow-x-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-black text-[var(--color-dark)] uppercase tracking-tighter">
            {activeSide === 'home' ? 'Home' : 'Away'} Squad
          </h2>
          <div className="flex space-x-2">
            <button onClick={() => setIsImportModalOpen(true)} className="bg-[var(--color-light)] text-[var(--color-primary)] px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-[var(--color-mid)]/20 transition-all text-sm border border-[var(--color-primary)]/20">
              <Download size={16} />
              <span>Import</span>
            </button>
            <button onClick={handleAddPlayer} className="bg-[var(--color-dark)] text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-opacity-90 transition-all text-sm">
              <Plus size={16} />
              <span>Add Player</span>
            </button>
          </div>
        </div>

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
      
      <ImportTeamModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} teamSide={activeSide} />
    </div>
  );
}
