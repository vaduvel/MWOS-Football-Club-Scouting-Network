import { useState } from 'react';
import { useReportStore, PlayerReview } from '../../store/report';
import { Plus, Trash2, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { createId } from '../../lib/ids';

export default function PlayerReviewsTab() {
  const { currentReport, addReview, updateReview, removeReview } = useReportStore();
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (!currentReport) return null;

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
    <div className="flex items-center justify-between bg-[var(--color-light)] p-2 rounded-lg">
      <span className="text-xs font-bold text-[var(--color-dark)] uppercase tracking-wider">{label}</span>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(val => (
          <button
            key={val}
            onClick={() => updateReview(review.id, { [field]: val })}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black transition-colors ${
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
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-mid)]/20">
        <div>
          <h2 className="text-2xl font-black text-[var(--color-dark)] uppercase tracking-tighter">Player Reviews</h2>
          <p className="text-sm text-[var(--color-mid)] font-semibold mt-1">Detailed analysis of specific players.</p>
        </div>
        <button onClick={handleAddReview} className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-opacity-90 transition-all shadow-md">
          <Plus size={20} />
          <span className="hidden sm:inline">Add Review</span>
        </button>
      </div>

      <div className="space-y-4">
        {currentReport.reviews.map((review, index) => {
          const isExpanded = expandedId === review.id;
          const player = currentReport.players.find(p => p.id.toString() === review.player_id.toString());
          
          return (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-[var(--color-mid)]/20 overflow-hidden transition-all">
              {/* Header (Click to expand) */}
              <div 
                className="p-4 md:p-6 flex items-center justify-between cursor-pointer hover:bg-[var(--color-light)]/50 transition-colors"
                onClick={() => toggleExpand(review.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-black text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--color-dark)]">
                      {player ? `${player.name} (${player.shirt_number})` : 'Select Player'}
                    </h3>
                    <p className="text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider">
                      {review.potential_level} • {review.recommendation_verdict || 'No verdict'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeReview(review.id); }}
                    className="p-2 text-[var(--color-mid)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  {isExpanded ? <ChevronUp size={20} className="text-[var(--color-mid)]" /> : <ChevronDown size={20} className="text-[var(--color-mid)]" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 md:p-6 border-t border-[var(--color-mid)]/20 bg-[var(--color-light)]/30 space-y-8">
                  
                  {/* Player Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Select Player</label>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Overview</label>
                      <textarea 
                        value={review.overview} 
                        onChange={e => updateReview(review.id, { overview: e.target.value })}
                        rows={3} 
                        className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-y bg-white" 
                        placeholder="General summary of performance..." 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Strengths</label>
                      <textarea 
                        value={review.strengths} 
                        onChange={e => updateReview(review.id, { strengths: e.target.value })}
                        rows={4} 
                        className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-y bg-white" 
                        placeholder="- Good vision&#10;- Strong in the air" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Areas to Improve</label>
                      <textarea 
                        value={review.areas_to_improve} 
                        onChange={e => updateReview(review.id, { areas_to_improve: e.target.value })}
                        rows={4} 
                        className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-semibold resize-y bg-white" 
                        placeholder="- Weak foot crossing&#10;- Tracking back" 
                      />
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-4 rounded-xl border border-[var(--color-mid)]/20 shadow-sm">
                      <h4 className="text-sm font-black text-[var(--color-primary)] uppercase tracking-wider mb-4 border-b border-[var(--color-mid)]/20 pb-2">Physical Attributes</h4>
                      <div className="space-y-2">
                        {renderRating(review, 'pace', 'Pace')}
                        {renderRating(review, 'strength', 'Strength')}
                        {renderRating(review, 'stamina', 'Stamina')}
                        {renderRating(review, 'agility', 'Agility')}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[var(--color-mid)]/20 shadow-sm">
                      <h4 className="text-sm font-black text-[var(--color-primary)] uppercase tracking-wider mb-4 border-b border-[var(--color-mid)]/20 pb-2">Mental Attributes</h4>
                      <div className="space-y-2">
                        {renderRating(review, 'decision_making', 'Decision Making')}
                        {renderRating(review, 'composure', 'Composure')}
                        {renderRating(review, 'work_rate', 'Work Rate')}
                        {renderRating(review, 'positioning', 'Positioning')}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-[var(--color-primary)]/5 p-6 rounded-xl border border-[var(--color-primary)]/20">
                    <h4 className="text-sm font-black text-[var(--color-primary)] uppercase tracking-wider mb-4">Overall Recommendation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Short Verdict</label>
                        <input 
                          type="text" 
                          value={review.recommendation_verdict} 
                          onChange={e => updateReview(review.id, { recommendation_verdict: e.target.value })}
                          className="w-full p-3 rounded-xl border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all font-bold bg-white" 
                          placeholder="e.g. Sign immediately, Monitor progress" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--color-mid)] uppercase tracking-wider mb-2">Potential Level</label>
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
          <div className="text-center py-12 bg-white rounded-2xl border border-[var(--color-mid)]/20 border-dashed">
            <UserCheck size={48} className="mx-auto mb-4 text-[var(--color-mid)] opacity-50" />
            <p className="text-lg font-bold text-[var(--color-dark)]">No player reviews yet</p>
            <p className="text-sm text-[var(--color-mid)] font-semibold mt-1">Click "Add Review" to start analyzing players.</p>
          </div>
        )}
      </div>
    </div>
  );
}
