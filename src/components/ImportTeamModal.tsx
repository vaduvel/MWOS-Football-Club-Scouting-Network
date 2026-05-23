import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settings';
import { useReportStore } from '../store/report';
import { Search, Download, X } from 'lucide-react';
import { fetchFootballSquad, fetchUserSettings, saveUserSettings, searchFootballTeams } from '../lib/data';
import { createId } from '../lib/ids';

export default function ImportTeamModal({ isOpen, onClose, teamSide }: { isOpen: boolean, onClose: () => void, teamSide: 'home' | 'away' }) {
  const { football_api_key, football_api_provider, setSettings } = useSettingsStore();
  const { currentReport, addPlayer } = useReportStore();
  
  const [query, setQuery] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(football_api_key);

  useEffect(() => {
    if (isOpen) {
      void (async () => {
        try {
          const data = await fetchUserSettings();
          setSettings(data);
          setApiKeyInput(data.football_api_key);
          if (!data.football_api_key) setShowSettings(true);
        } catch (err: any) {
          setError(err.message);
        }
      })();
    }
  }, [isOpen, setSettings]);

  const handleSaveSettings = async () => {
    try {
      const nextSettings = { football_api_provider: 'api-football', football_api_key: apiKeyInput };
      await saveUserSettings(nextSettings);
      setSettings(nextSettings);
      setShowSettings(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchFootballTeams(query);
      setTeams(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSquad = async (teamId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFootballSquad(teamId);
      
      if (data.length === 0) {
        throw new Error('No squad data found for this team.');
      }

      // Add players to report
      data.forEach((p: any, index: number) => {
        addPlayer({
          id: createId(),
          club_player_id: null,
          team_side: teamSide,
          shirt_number: p.number || index + 1,
          name: p.name,
          subbed: '',
          goal: '',
          rating: '',
          position_x: 50,
          position_y: 50,
        });
      });
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-team-title"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-mid)]/20">
          <h2 id="import-team-title" className="text-lg font-black text-[var(--color-dark)] uppercase tracking-tighter">Import {teamSide} Team</h2>
          <button type="button" onClick={onClose} aria-label="Close import team modal" className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {showSettings ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[var(--color-mid)]">Configure your API-Football key to import real data.</p>
              <div>
                <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">API-Football Key</label>
                <input 
                  type="password" 
                  value={apiKeyInput} 
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] outline-none"
                  placeholder="Enter API key..."
                />
              </div>
              <button type="button" onClick={handleSaveSettings} className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold">Save Settings</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] outline-none font-semibold"
                  placeholder="Search team name (e.g. Arsenal)"
                />
                <button type="button" onClick={handleSearch} disabled={loading} aria-label="Search teams" className="bg-[var(--color-primary)] text-white px-4 rounded-xl font-bold flex items-center justify-center">
                  <Search size={20} />
                </button>
              </div>

              {error && <p className="text-sm font-semibold text-[var(--color-accent)]">{error}</p>}

              <div className="space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between p-3 border border-[var(--color-mid)]/20 rounded-xl hover:bg-[var(--color-light)]">
                    <div className="flex items-center space-x-3">
                      {team.logo && <img src={team.logo} alt={team.name} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />}
                      <span className="font-bold text-[var(--color-dark)]">{team.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportSquad(team.id)}
                      disabled={loading}
                      className="bg-[var(--color-light)] text-[var(--color-primary)] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-primary)] hover:text-white transition-colors flex items-center"
                    >
                      <Download size={14} className="mr-1" /> Import Squad
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="text-center pt-4">
                <button type="button" onClick={() => setShowSettings(true)} className="text-xs text-[var(--color-mid)] hover:text-[var(--color-primary)] font-semibold underline">
                  Provider Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
