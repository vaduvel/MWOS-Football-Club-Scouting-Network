/** Completed years on a UTC calendar date; invalid/missing dates never count as zero. */
export function getPlayerAge(dateOfBirth: string | null | undefined, asOf = new Date()): number | null {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !Number.isFinite(asOf.getTime())) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth) return null;
  if (dateOfBirth > asOf.toISOString().slice(0, 10)) return null;
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  if (asOf.getUTCMonth() < birth.getUTCMonth() ||
    (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

export function buildSquadAgeSummary(
  players: Array<{ dateOfBirth?: string | null; isActive?: boolean }>,
  asOf = new Date(),
) {
  const activePlayers = players.filter(player => player.isActive !== false);
  const ages = activePlayers.map(player => getPlayerAge(player.dateOfBirth, asOf))
    .filter((age): age is number => age !== null);
  return {
    averageAge: ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null,
    knownAgeCount: ages.length,
    totalActivePlayers: activePlayers.length,
  };
}
