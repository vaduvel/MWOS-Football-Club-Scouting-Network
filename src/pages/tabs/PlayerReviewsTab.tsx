import { useEffect, useState } from 'react';
import { useReportStore, PlayerReview } from '../../store/report';
import { Plus, Trash2, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { createId } from '../../lib/ids';

export default function PlayerReviewsTab() {
  const { currentReport, addReview, updateReview, removeReview } = useReportStore();
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  if (!currentReport) return null;

  useEffect(() => {
    const syncCompactMode = () => {
      setIsCompact(window.innerWidth < 768);
    };

    syncCompactMode();
    window.addEventListener('resize', syncCompactMode);
    return () => window.removeEventListener('resize', syncCompactMode);
  }, []);

  const handleAddReview = () => {
    const newReview: PlayerReview = {
      id: createId(),
      player_id: '',
      overview: '',
      strengths: '',
      areas_to_improve: '',
      pace: 3, strength: 3, stamina: 3, agility: 3,
      decision_making: 3, composure: 3, work_rate: 3, positioning: 3,
      recommendation_verdict: '',
      potential_level: 'Academy'
    };
    addReview(newReview);
    setExpandedId(newReview.id);
  };

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderRating = (review: PlayerReview, field: keyof PlayerReview, label: string) => (
    <div className="rounded-xl bg-[var(--color-light)] p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-dark)]">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(val => (
          <button
            key={val}
            onClick={() => updateReview(review.id, { [field]: val })}
            className={`flex ${isCompact ? 'h-9 w-9' : 'h-10 w-10'} items-center justify-center rounded text-xs font-black transition-colors ${
              (review[field] as number) >= val 
                ? 'bg-[var(--color-primary)] text-white' 
                : 'bg-white text-[var(--color-mid)] border border-[var(--color-mid)]/30'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 md:space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-mid)]/20 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between md:gap-4 md:p-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-[var(--color-dark)] md:text-2xl">Player Reviews</h2>
          <p className="mt-1 text-xs font-semibold text-[var(--color-mid)] md:text-sm">Score players, verdicts and next-step recommendations.</p>
        </div>
        <button onClick={handleAddReview} className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 md:w-auto md:rounded-xl md:px-6">
          <Plus size={20} />
          <span>Add Review</span>
        </button>
      </div>

      <div className="space-y-4">
        {currentReport.reviews.map((review, index) => {
          const isExpanded = expandedId === review.id;
          const player = currentReport.players.find(p => p.id.toString() === review.player_id.toString());
          
          return (
            <div key={review.id} className="overflow-hidden rounded-2xl border border-[var(--color-mid)]/20 bg-white shadow-sm transition-all">
              {/* Header (Click to expand) */}
              <div 
                className="flex cursor-pointer items-start justify-between gap-3 p-4 transition-colors hover:bg-[var(--color-light)]/50 md:p-6"
                onClick={() => toggleExpand(review.id)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-lg font-black text-[var(--color-primary)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-[var(--color-dark)] md:text-lg">
                      {player ? `${player.name} (${player.shirt_number})` : 'Select Player'}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[var(--color-primary)]/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        {review.potential_level}
                      </span>
                      <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)]">
                        {review.recommendation_verdict || 'No verdict'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeReview(review.id); }}
                    className="rounded-lg p-2 text-[var(--color-mid)] transition-colors hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
                  >
                    <Trash2 size={18} />
                  </button>
                  {isExpanded ? <ChevronUp size={20} className="text-[var(--color-mid)]" /> : <ChevronDown size={20} className="text-[var(--color-mid)]" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-4 border-t border-[var(--color-mid)]/20 bg-[var(--color-light)]/30 p-4 md:space-y-8 md:p-6">
                  
                  {/* Player Selection */}
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mid)]">Select Player</label>
                    <select 
                      value={review.player_id} 
                      onChange={e => updateReview(review.id, { player_id: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-bold bg-white"
                    >
                      <option value="">-- Select a player from team sheets --</option>
                      <optgroup label="Home Team">
                        {currentReport.players.filter(p => p.team_side === 'home').map(p => (
                          <option key={p.id} value={p.id}>{p.shirt_number} - {p.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Away Team">
                        {currentReport.players.filter(p => p.team_side === 'away').map(p => (
                          <option key={p.id} value={p.id}>{p.shirt_number} - {p.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Text Areas */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mid)]">Overview</label>
                      <textarea 
                        value={review.overview} 
                        onChange={e => updateReview(review.id, { overview: e.target.value })}
                        rows={isCompact ? 4 : 3} 
                        className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-none md:resize-y bg-white" 
                        placeholder="General summary of performance..." 
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mid)]">Strengths</label>
                      <textarea 
                        value={review.strengths} 
                        onChange={e => updateReview(review.id, { strengths: e.target.value })}
                        rows={isCompact ? 3 : 4} 
                        className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-none md:resize-y bg-white" 
                        placeholder="- Good vision&#10;- Strong in the air" 
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mid)]">Areas to Improve</label>
                      <textarea 
                        value={review.areas_to_improve} 
                        onChange={e => updateReview(review.id, { areas_to_improve: e.target.value })}
                        rows={isCompact ? 3 : 4} 
                        className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-none md:resize-y bg-white" 
                        placeholder="- Weak foot crossing&#10;- Tracking back" 
                      />
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                    <div className="rounded-xl border border-[var(--color-mid)]/20 bg-white p-4 shadow-sm">
                      <h4 className="mb-3 border-b border-[var(--color-mid)]/20 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">Physical</h4>
                      <div className="space-y-2">
                        {renderRating(review, 'pace', 'Pace')}
                        {renderRating(review, 'strength', 'Strength')}
                        {renderRating(review, 'stamina', 'Stamina')}
                        {renderRating(review, 'agility', 'Agility')}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--color-mid)]/20 bg-white p-4 shadow-sm">
                      <h4 className="mb-3 border-b border-[var(--color-mid)]/20 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">Mental</h4>
                      <div className="space-y-2">
                        {renderRating(review, 'decision_making', 'Decision Making')}
                        {renderRating(review, 'composure', 'Composure')}
                        {renderRating(review, 'work_rate', 'Work Rate')}
                        {renderRating(review, 'positioning', 'Positioning')}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 md:p-6">
                    <h4 className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">Recommendation</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mid)]">Short Verdict</label>
                        <input 
                          type="text" 
                          value={review.recommendation_verdict} 
                          onChange={e => updateReview(review.id, { recommendation_verdict: e.target.value })}
                          className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-bold bg-white" 
                          placeholder="e.g. Sign immediately, Monitor progress" 
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-mid)]">Potential Level</label>
                        <select 
                          value={review.potential_level} 
                          onChange={e => updateReview(review.id, { potential_level: e.target.value })}
                          className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-bold bg-white"
                        >
                          <option value="Academy">Academy</option>
                          <option value="Semi-pro">Semi-pro</option>
                          <option value="Pro">Pro</option>
                          <option value="Elite">Elite</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
        
        {currentReport.reviews.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/20 bg-white py-10 text-center">
            <UserCheck size={48} className="mx-auto mb-4 text-[var(--color-mid)] opacity-50" />
            <p className="text-lg font-bold text-[var(--color-dark)]">No player reviews yet</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-mid)]">Add the first review to start rating players.</p>
          </div>
        )}
      </div>
    </div>
  );
}
