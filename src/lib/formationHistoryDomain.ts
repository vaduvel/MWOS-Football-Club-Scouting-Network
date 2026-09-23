import type { Player, Report } from '../store/report';

type PitchPosition = { x: number; y: number };

export function buildFormationPresetUpdate(
  report: Report,
  side: Player['team_side'],
  preset: string,
  slots: PitchPosition[],
): Partial<Report> {
  const formation = side === 'home' ? { formation_home: preset } : { formation_away: preset };
  if (preset === 'Custom') return formation;

  const placements = new Map(
    report.players
      .filter((player) => player.team_side === side)
      .slice(0, 11)
      .map((player, index) => [player.id, slots[index]] as const),
  );

  return {
    ...formation,
    players: report.players.map((player) => {
      const slot = placements.get(player.id);
      return slot ? { ...player, position_x: slot.x, position_y: slot.y } : player;
    }),
  };
}

export function buildPlayerPlacementUpdate(
  report: Report,
  playerId: Player['id'],
  destination: PitchPosition,
  swapWithId?: Player['id'],
): Partial<Report> {
  const selected = report.players.find((player) => player.id === playerId);
  if (!selected) return {};

  return {
    players: report.players.map((player) => {
      if (player.id === playerId) {
        return { ...player, position_x: destination.x, position_y: destination.y };
      }
      if (swapWithId !== undefined && player.id === swapWithId) {
        return { ...player, position_x: selected.position_x, position_y: selected.position_y };
      }
      return player;
    }),
  };
}
