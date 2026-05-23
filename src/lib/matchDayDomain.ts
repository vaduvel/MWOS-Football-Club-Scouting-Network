export type MatchDayWorkflowStatus = 'draft' | 'published' | 'completed' | 'cancelled';
export type MatchDayAvailabilityStatus = 'available' | 'doubtful' | 'unavailable';
export type MatchDaySelectionStatus = 'starter' | 'bench' | 'out';
export type MatchDayLinkedTransportStatus = 'draft' | 'published' | 'updated' | 'completed' | 'cancelled';

export type MatchDayLinkedTransportDraft = {
  title: string;
  contextType: 'match';
  eventDate: string;
  departureTime: string;
  arrivalTargetTime: string;
  meetingPoint: string;
  destination: string;
  driverUserId: string;
  notes: string;
  contactNotes: string;
  status: 'draft';
};

export type MatchDayStatusRow = {
  availabilityStatus: MatchDayAvailabilityStatus;
  selectionStatus: MatchDaySelectionStatus;
};

export type PlayerMatchDayCandidate = MatchDayStatusRow & {
  matchDayId: string;
  teamId: string;
  teamName: string;
  opponent: string;
  competition: string;
  matchDate: string;
  kickoffTime: string;
  venue: string;
  workflowStatus: MatchDayWorkflowStatus;
  notes: string;
};

export function buildLinkedTransportDraft(input: {
  opponent: string;
  matchDate: string;
  venue: string;
}): MatchDayLinkedTransportDraft {
  const opponent = String(input.opponent || '').trim();
  const venue = String(input.venue || '').trim();

  return {
    title: `Match transport · ${opponent}`,
    contextType: 'match',
    eventDate: String(input.matchDate || '').trim(),
    departureTime: '',
    arrivalTargetTime: '',
    meetingPoint: '',
    destination: venue || opponent,
    driverUserId: '',
    notes: '',
    contactNotes: '',
    status: 'draft',
  };
}

export function linkedTransportBelongsToTeam(matchDayTeamId: string, transportTeamId: string) {
  return String(matchDayTeamId || '').trim() !== '' && String(matchDayTeamId || '') === String(transportTeamId || '');
}

export function buildMatchDayStatusTotals(rows: MatchDayStatusRow[]) {
  return rows.reduce(
    (totals, row) => {
      totals.totalPlayers += 1;
      if (row.availabilityStatus === 'available') totals.availableCount += 1;
      if (row.availabilityStatus === 'doubtful') totals.doubtfulCount += 1;
      if (row.availabilityStatus === 'unavailable') totals.unavailableCount += 1;

      if (row.selectionStatus === 'starter') totals.starterCount += 1;
      if (row.selectionStatus === 'bench') totals.benchCount += 1;
      if (row.selectionStatus === 'out') totals.outCount += 1;

      return totals;
    },
    {
      totalPlayers: 0,
      availableCount: 0,
      doubtfulCount: 0,
      unavailableCount: 0,
      starterCount: 0,
      benchCount: 0,
      outCount: 0,
    },
  );
}

export function groupMatchDaySelections<T extends MatchDayStatusRow>(rows: T[]) {
  const starters: T[] = [];
  const bench: T[] = [];
  const out: T[] = [];
  const unavailable: T[] = [];

  rows.forEach((row) => {
    if (row.availabilityStatus === 'unavailable') {
      unavailable.push(row);
    }

    if (row.selectionStatus === 'starter') {
      starters.push(row);
      return;
    }

    if (row.selectionStatus === 'bench') {
      bench.push(row);
      return;
    }

    out.push(row);
  });

  return {
    starters,
    bench,
    out,
    unavailable,
  };
}

function toFixtureTimestamp(matchDate: string, kickoffTime: string) {
  const safeDate = String(matchDate || '').trim();
  if (!safeDate) return Number.NaN;

  const safeTime = String(kickoffTime || '').trim() || '12:00';
  return new Date(`${safeDate}T${safeTime}:00`).getTime();
}

function compareFixtureAsc(
  left: Pick<PlayerMatchDayCandidate, 'matchDate' | 'kickoffTime'>,
  right: Pick<PlayerMatchDayCandidate, 'matchDate' | 'kickoffTime'>,
) {
  return toFixtureTimestamp(left.matchDate, left.kickoffTime) - toFixtureTimestamp(right.matchDate, right.kickoffTime);
}

function compareFixtureDesc(
  left: Pick<PlayerMatchDayCandidate, 'matchDate' | 'kickoffTime'>,
  right: Pick<PlayerMatchDayCandidate, 'matchDate' | 'kickoffTime'>,
) {
  return compareFixtureAsc(right, left);
}

export function pickNextRelevantFixture<T extends PlayerMatchDayCandidate>(
  fixtures: T[],
  referenceDate = new Date(),
) {
  const activeFixtures = fixtures.filter((fixture) => fixture.workflowStatus !== 'cancelled');
  if (activeFixtures.length === 0) {
    return null;
  }

  const now = referenceDate.getTime();
  const upcoming = activeFixtures
    .filter((fixture) => {
      const timestamp = toFixtureTimestamp(fixture.matchDate, fixture.kickoffTime);
      return Number.isFinite(timestamp) && timestamp >= now && fixture.workflowStatus !== 'completed';
    })
    .sort(compareFixtureAsc);

  if (upcoming.length > 0) {
    return upcoming[0];
  }

  const futureFallback = activeFixtures
    .filter((fixture) => {
      const timestamp = toFixtureTimestamp(fixture.matchDate, fixture.kickoffTime);
      return Number.isFinite(timestamp) && timestamp >= now;
    })
    .sort(compareFixtureAsc);

  if (futureFallback.length > 0) {
    return futureFallback[0];
  }

  return [...activeFixtures].sort(compareFixtureDesc)[0] || null;
}
