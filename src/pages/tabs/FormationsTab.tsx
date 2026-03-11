import React, { useState, useRef, useEffect } from 'react';
import { useReportStore, Player } from '../../store/report';
import { Lock, Unlock, Undo2, Redo2 } from 'lucide-react';

const FORMATIONS: Record<string, { id: string, x: number, y: number }[]> = {
  '4-3-3': [
    { id: 'gk', x: 50, y: 90 },
    { id: 'rb', x: 85, y: 75 },
    { id: 'rcb', x: 65, y: 80 },
    { id: 'lcb', x: 35, y: 80 },
    { id: 'lb', x: 15, y: 75 },
    { id: 'cdm', x: 50, y: 60 },
    { id: 'rcm', x: 70, y: 45 },
    { id: 'lcm', x: 30, y: 45 },
    { id: 'rw', x: 85, y: 25 },
    { id: 'st', x: 50, y: 15 },
    { id: 'lw', x: 15, y: 25 },
  ],
  '4-4-2': [
    { id: 'gk', x: 50, y: 90 },
    { id: 'rb', x: 85, y: 75 },
    { id: 'rcb', x: 65, y: 80 },
    { id: 'lcb', x: 35, y: 80 },
    { id: 'lb', x: 15, y: 75 },
    { id: 'rm', x: 85, y: 50 },
    { id: 'rcm', x: 65, y: 50 },
    { id: 'lcm', x: 35, y: 50 },
    { id: 'lm', x: 15, y: 50 },
    { id: 'rst', x: 65, y: 20 },
    { id: 'lst', x: 35, y: 20 },
  ],
  '3-5-2': [
    { id: 'gk', x: 50, y: 90 },
    { id: 'rcb', x: 75, y: 80 },
    { id: 'cb', x: 50, y: 80 },
    { id: 'lcb', x: 25, y: 80 },
    { id: 'rwb', x: 85, y: 50 },
    { id: 'rcm', x: 65, y: 55 },
    { id: 'cdm', x: 50, y: 65 },
    { id: 'lcm', x: 35, y: 55 },
    { id: 'lwb', x: 15, y: 50 },
    { id: 'rst', x: 65, y: 20 },
    { id: 'lst', x: 35, y: 20 },
  ],
  '4-2-3-1': [
    { id: 'gk', x: 50, y: 90 },
    { id: 'rb', x: 85, y: 75 },
    { id: 'rcb', x: 65, y: 80 },
    { id: 'lcb', x: 35, y: 80 },
    { id: 'lb', x: 15, y: 75 },
    { id: 'rcdm', x: 65, y: 60 },
    { id: 'lcdm', x: 35, y: 60 },
    { id: 'rm', x: 85, y: 40 },
    { id: 'cam', x: 50, y: 40 },
    { id: 'lm', x: 15, y: 40 },
    { id: 'st', x: 50, y: 15 },
  ],
  '3-4-3': [
    { id: 'gk', x: 50, y: 90 },
    { id: 'rcb', x: 75, y: 80 },
    { id: 'cb', x: 50, y: 80 },
    { id: 'lcb', x: 25, y: 80 },
    { id: 'rm', x: 85, y: 50 },
    { id: 'rcm', x: 65, y: 50 },
    { id: 'lcm', x: 35, y: 50 },
    { id: 'lm', x: 15, y: 50 },
    { id: 'rw', x: 80, y: 25 },
    { id: 'st', x: 50, y: 15 },
    { id: 'lw', x: 20, y: 25 },
  ],
  '5-3-2': [
    { id: 'gk', x: 50, y: 90 },
    { id: 'rwb', x: 85, y: 70 },
    { id: 'rcb', x: 70, y: 80 },
    { id: 'cb', x: 50, y: 80 },
    { id: 'lcb', x: 30, y: 80 },
    { id: 'lwb', x: 15, y: 70 },
    { id: 'rcm', x: 65, y: 50 },
    { id: 'cdm', x: 50, y: 55 },
    { id: 'lcm', x: 35, y: 50 },
    { id: 'rst', x: 65, y: 20 },
    { id: 'lst', x: 35, y: 20 },
  ],
  'Custom': []
};

const SLOT_LABELS: Record<string, string> = {
  gk: 'GK',
  rb: 'RB',
  rcb: 'RCB',
  cb: 'CB',
  lcb: 'LCB',
  lb: 'LB',
  rwb: 'RWB',
  lwb: 'LWB',
  cdm: 'DM',
  rcdm: 'RDM',
  lcdm: 'LDM',
  rcm: 'RCM',
  lcm: 'LCM',
  rm: 'RM',
  lm: 'LM',
  cam: 'CAM',
  rw: 'RW',
  lw: 'LW',
  st: 'ST',
  rst: 'RST',
  lst: 'LST',
};

export default function FormationsTab() {
  const { currentReport, updatePlayer, updateReportField, undo, redo, historyIndex, history } = useReportStore();
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');
  const [isLocked, setIsLocked] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPos, setTempPos] = useState<{x: number, y: number} | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{id: string, x: number, y: number} | null>(null);

  if (!currentReport) return null;

  const players = currentReport.players.filter(p => p.team_side === activeSide);
  const formationKey = activeSide === 'home' ? currentReport.formation_home : currentReport.formation_away;
  const currentFormation = FORMATIONS[formationKey] || FORMATIONS['4-3-3'];
  const selectedSlot = currentFormation.find((slot) => slot.id === selectedSlotId) || null;

  useEffect(() => {
    const syncCompactMode = () => {
      setIsCompact(window.innerWidth < 768);
    };

    syncCompactMode();
    window.addEventListener('resize', syncCompactMode);
    return () => window.removeEventListener('resize', syncCompactMode);
  }, []);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [activeSide, formationKey, isCompact]);

  const getSlotOccupant = (slot: { id: string; x: number; y: number }) =>
    players.find((player) => Math.abs(player.position_x - slot.x) < 2 && Math.abs(player.position_y - slot.y) < 2);

  const getPlayerSlotLabel = (player: Player) => {
    const slot = currentFormation.find(
      (formationSlot) =>
        Math.abs(player.position_x - formationSlot.x) < 2 &&
        Math.abs(player.position_y - formationSlot.y) < 2,
    );

    return slot ? SLOT_LABELS[slot.id] || slot.id.toUpperCase() : 'Free';
  };

  const assignPlayerToSlot = (playerId: string | number, slot: { id: string; x: number; y: number }) => {
    const selectedPlayer = players.find((player) => player.id === playerId);
    if (!selectedPlayer) return;

    const occupant = getSlotOccupant(slot);
    if (occupant && occupant.id !== playerId) {
      updatePlayer(occupant.id, {
        position_x: selectedPlayer.position_x,
        position_y: selectedPlayer.position_y,
      });
    }

    updatePlayer(playerId, { position_x: slot.x, position_y: slot.y });
    setSelectedSlotId(null);
  };

  const handlePointerDown = (e: React.PointerEvent, player: Player) => {
    if (isCompact) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    
    const dotX = rect.left + (player.position_x / 100) * rect.width;
    const dotY = rect.top + (player.position_y / 100) * rect.height;
    
    setDragOffset({
      x: e.clientX - dotX,
      y: e.clientY - dotY
    });
    setDraggingId(player.id);
    setTempPos({ x: player.position_x, y: player.position_y });
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isCompact) return;
    if (draggingId === null || !pitchRef.current) return;
    
    const rect = pitchRef.current.getBoundingClientRect();
    
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;
    
    let pctX = (newX / rect.width) * 100;
    let pctY = (newY / rect.height) * 100;
    
    pctX = Math.max(0, Math.min(100, pctX));
    pctY = Math.max(0, Math.min(100, pctY));
    
    setTempPos({ x: pctX, y: pctY });

    // Find nearest slot or player for swapping
    let nearestSlot = null;
    let minDistance = Infinity;

    // Check slots
    if (formationKey !== 'Custom') {
      currentFormation.forEach(slot => {
        const dist = Math.sqrt(Math.pow(slot.x - pctX, 2) + Math.pow(slot.y - pctY, 2));
        if (dist < 10 && dist < minDistance) {
          minDistance = dist;
          nearestSlot = slot;
        }
      });
    }

    setHoveredSlot(nearestSlot);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isCompact) return;
    if (draggingId !== null && tempPos) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      
      let finalX = tempPos.x;
      let finalY = tempPos.y;

      const isFreeMove = e.shiftKey || e.ctrlKey || e.metaKey;

      if (!isFreeMove && hoveredSlot) {
        // Check if slot is occupied by another player
        const occupant = players.find(p => p.id !== draggingId && Math.abs(p.position_x - hoveredSlot.x) < 2 && Math.abs(p.position_y - hoveredSlot.y) < 2);
        
        if (occupant) {
          // Swap
          const draggedPlayer = players.find(p => p.id === draggingId);
          if (draggedPlayer) {
            updatePlayer(occupant.id, { position_x: draggedPlayer.position_x, position_y: draggedPlayer.position_y });
          }
        }
        
        finalX = hoveredSlot.x;
        finalY = hoveredSlot.y;
      } else if (isLocked && formationKey !== 'Custom') {
        // Revert to original if locked and no slot found
        const original = players.find(p => p.id === draggingId);
        if (original) {
          finalX = original.position_x;
          finalY = original.position_y;
        }
      }

      updatePlayer(draggingId, { position_x: finalX, position_y: finalY });
      
      setDraggingId(null);
      setTempPos(null);
      setHoveredSlot(null);
    }
  };

  const applyFormation = (preset: string) => {
    updateReportField(activeSide === 'home' ? 'formation_home' : 'formation_away', preset);
    setSelectedSlotId(null);
    
    if (preset !== 'Custom') {
      const slots = FORMATIONS[preset];
      // Apply to first 11 players
      players.slice(0, 11).forEach((p, i) => {
        if (slots[i]) {
          updatePlayer(p.id, { position_x: slots[i].x, position_y: slots[i].y });
        }
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex p-1 bg-[var(--color-mid)]/20 rounded-xl w-full max-w-md mx-auto">
        <button
          onClick={() => setActiveSide('home')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
            activeSide === 'home' 
              ? 'bg-white text-[var(--color-primary)] shadow-sm' 
              : 'text-[var(--color-dark)]/60 hover:text-[var(--color-dark)]'
          }`}
        >
          {currentReport.home_team || 'Home'} Formation
        </button>
        <button
          onClick={() => setActiveSide('away')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
            activeSide === 'away' 
              ? 'bg-white text-[var(--color-accent)] shadow-sm' 
              : 'text-[var(--color-dark)]/60 hover:text-[var(--color-dark)]'
          }`}
        >
          {currentReport.away_team || 'Away'} Formation
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Pitch Area */}
        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-mid)]/20 flex flex-col items-center">
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-black text-[var(--color-dark)] uppercase tracking-tighter">Tactical Board</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-[var(--color-light)] rounded-md mr-2">
                <button 
                  onClick={undo}
                  disabled={historyIndex < 0}
                  className="p-1.5 text-[var(--color-dark)] hover:bg-[var(--color-mid)]/20 rounded-l-md disabled:opacity-30 transition-colors"
                  title="Undo"
                >
                  <Undo2 size={16} />
                </button>
                <div className="w-px bg-[var(--color-mid)]/20"></div>
                <button 
                  onClick={redo}
                  disabled={historyIndex >= history.length - 2}
                  className="p-1.5 text-[var(--color-dark)] hover:bg-[var(--color-mid)]/20 rounded-r-md disabled:opacity-30 transition-colors"
                  title="Redo"
                >
                  <Redo2 size={16} />
                </button>
              </div>

              <select 
                value={formationKey} 
                onChange={(e) => applyFormation(e.target.value)}
                className="px-3 py-1.5 bg-[var(--color-light)] text-[var(--color-dark)] text-xs font-bold rounded-md outline-none border border-[var(--color-mid)]/30 focus:border-[var(--color-primary)]"
              >
                {Object.keys(FORMATIONS).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              
              <button 
                onClick={() => setIsLocked(!isLocked)}
                className={`px-3 py-1.5 flex items-center gap-1 text-xs font-bold rounded-md transition-colors ${
                  isLocked ? 'bg-red-100 text-red-700' : 'bg-[var(--color-light)] text-[var(--color-dark)] hover:bg-[var(--color-mid)]/20'
                }`}
                title={isLocked ? "Unlock free movement" : "Lock to formation slots"}
              >
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Unlocked'}</span>
              </button>
            </div>
          </div>

          <div 
            ref={pitchRef}
            className={`relative w-full ${isCompact ? 'max-w-[360px]' : 'max-w-[500px]'} aspect-[2/3] bg-[#4CAF50] rounded-lg border-4 border-white shadow-inner overflow-hidden select-none ${isCompact ? '' : 'touch-none'}`}
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10%, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.1) 20%)'
            }}
          >
            {/* Pitch Markings */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[15%] border-b-2 border-l-2 border-r-2 border-white/60"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[6%] border-b-2 border-l-2 border-r-2 border-white/60"></div>
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-1/4 h-[10%] border-b-2 border-white/60 rounded-b-full"></div>
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[15%] border-t-2 border-l-2 border-r-2 border-white/60"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[6%] border-t-2 border-l-2 border-r-2 border-white/60"></div>
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-1/4 h-[10%] border-t-2 border-white/60 rounded-t-full"></div>
            
            <div className="absolute top-1/2 left-0 w-full border-t-2 border-white/60"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square border-2 border-white/60 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full"></div>

            {/* Lanes Overlay (Optional visual aid) */}
            <div className="absolute inset-0 flex pointer-events-none opacity-20">
              <div className="flex-1 border-r border-dashed border-white"></div>
              <div className="flex-1 border-r border-dashed border-white"></div>
              <div className="flex-1"></div>
            </div>

            {/* Ghost Slots */}
            {formationKey !== 'Custom' && currentFormation.map(slot => (
              <div 
                key={slot.id}
                className={`absolute ${isCompact ? 'w-14 h-14 -ml-7 -mt-7' : 'w-10 h-10 -ml-5 -mt-5'} rounded-full border-2 border-dashed transition-colors ${
                  (hoveredSlot?.id === slot.id || selectedSlotId === slot.id) ? 'border-white bg-white/30' : 'border-white/30'
                }`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              />
            ))}

            {isCompact ? (
              formationKey === 'Custom' ? (
                <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/88 px-4 py-3 text-center text-xs font-bold text-[var(--color-dark)] shadow-lg">
                  Choose a preset formation on mobile, then tap a slot to assign players.
                </div>
              ) : (
                currentFormation.map((slot) => {
                  const occupant = getSlotOccupant(slot);
                  const initials = occupant?.name
                    ? occupant.name
                        .split(' ')
                        .map((name) => name[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : SLOT_LABELS[slot.id] || slot.id.toUpperCase();

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`absolute z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-white shadow-lg transition-transform ${
                        selectedSlotId === slot.id ? 'scale-110 border-white' : 'border-white/90'
                      }`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        backgroundColor: occupant
                          ? activeSide === 'home'
                            ? 'var(--color-primary)'
                            : 'var(--color-accent)'
                          : 'rgba(15, 23, 42, 0.38)',
                      }}
                    >
                      <span className="text-[10px] font-black leading-none">{occupant?.shirt_number || SLOT_LABELS[slot.id] || '?'}</span>
                      <span className="mt-1 text-[9px] font-bold leading-none uppercase">{initials}</span>
                    </button>
                  );
                })
              )
            ) : (
              players.map(player => {
                const isDragging = draggingId === player.id;
                const initials = player.name ? player.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                
                const posX = isDragging && tempPos ? tempPos.x : player.position_x;
                const posY = isDragging && tempPos ? tempPos.y : player.position_y;

                return (
                  <div
                    key={player.id}
                    onPointerDown={(e) => handlePointerDown(e, player)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                      isDragging ? 'scale-125 z-50 shadow-2xl' : 'scale-100 z-10 shadow-md hover:scale-110'
                    }`}
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                      backgroundColor: activeSide === 'home' ? 'var(--color-primary)' : 'var(--color-accent)',
                      color: 'white',
                      border: '2px solid white'
                    }}
                    title={player.name}
                  >
                    <span className="text-xs font-black leading-none">{player.shirt_number || '-'}</span>
                    <span className="text-[8px] font-bold leading-none opacity-80">{initials}</span>
                  </div>
                );
              })
            )}
          </div>
          <p className="mt-4 text-center text-xs font-semibold text-[var(--color-mid)]">
            {isCompact
              ? formationKey === 'Custom'
                ? 'Mobile mode works with preset shapes. Pick a formation to place players by tapping slots.'
                : 'Tap a position on the pitch, then tap a player below to assign them there.'
              : (
                <>
                  Drag and drop players. Hold <kbd className="rounded bg-gray-100 px-1">Shift</kbd> for free movement.
                </>
              )}
          </p>
        </div>

        {/* Player List Sidebar */}
        <div className={`w-full ${isCompact ? '' : 'lg:w-64'} bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-mid)]/20 flex flex-col ${isCompact ? '' : 'h-[600px]'}`}>
          <div className="mb-4 border-b border-[var(--color-mid)]/20 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--color-dark)]">
              {isCompact ? 'Tap-to-Assign Squad List' : 'Squad List'}
            </h3>
            {isCompact ? (
              <p className="mt-2 text-xs font-semibold text-[var(--color-mid)]">
                {formationKey === 'Custom'
                  ? 'Pick a preset formation first to enable touch assignment.'
                  : selectedSlot
                    ? `Assign a player to ${SLOT_LABELS[selectedSlot.id] || selectedSlot.id.toUpperCase()}.`
                    : 'Choose a pitch slot above, then tap a player.'}
              </p>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {players.map(player => (
              <button
                key={player.id}
                type="button"
                onClick={() => {
                  if (isCompact && selectedSlot) {
                    assignPlayerToSlot(player.id, selectedSlot);
                  }
                }}
                disabled={isCompact && (!selectedSlot || formationKey === 'Custom')}
                className={`flex w-full items-center justify-between rounded-lg bg-[var(--color-light)] p-3 text-left text-sm transition-colors ${
                  isCompact && selectedSlot && formationKey !== 'Custom'
                    ? 'hover:bg-[var(--color-mid)]/15'
                    : 'cursor-default'
                }`}
              >
                <div className="flex items-center">
                  <span className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white ${activeSide === 'home' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-accent)]'}`}>
                    {player.shirt_number || '-'}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate font-bold text-[var(--color-dark)]">{player.name || 'Unnamed'}</span>
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-mid)]">
                      {getPlayerSlotLabel(player)}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  {player.rating && (
                    <span className="rounded bg-white px-1.5 py-0.5 text-xs font-black text-[var(--color-primary)] shadow-sm">
                      {player.rating}
                    </span>
                  )}
                  {isCompact && selectedSlot && formationKey !== 'Custom' ? (
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--color-primary)]">
                      Assign
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
            {players.length === 0 && (
              <p className="text-xs text-[var(--color-mid)] text-center mt-4">No players added to {activeSide} team yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
