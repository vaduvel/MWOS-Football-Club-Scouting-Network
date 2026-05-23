export interface ClubPlayerMatchCandidate {
  id: string;
  displayName: string;
  teamName: string;
  squadNumber: number | null;
}

export interface ClubPlayerMatchSuggestion extends ClubPlayerMatchCandidate {
  score: number;
  matchReason: string;
}

function normalizeIdentityToken(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildScoutingPlayerIdentityKey(input: {
  clubPlayerId: string | null | undefined;
  name: string | null | undefined;
  clubLabel: string | null | undefined;
}) {
  if (input.clubPlayerId) {
    return `club:${input.clubPlayerId}`;
  }

  return `${normalizeIdentityToken(input.name)}::${normalizeIdentityToken(input.clubLabel)}`;
}

export function suggestClubPlayerMatches<T extends ClubPlayerMatchCandidate>(
  input: {
    name: string | null | undefined;
    shirtNumber: number | null | undefined;
  },
  candidates: T[],
  limit = 3,
): Array<T & ClubPlayerMatchSuggestion> {
  const normalizedName = normalizeIdentityToken(input.name);
  if (normalizedName.length < 2) {
    return [] as Array<T & ClubPlayerMatchSuggestion>;
  }

  const scored = candidates
    .map<(T & ClubPlayerMatchSuggestion) | null>((candidate) => {
      const normalizedCandidateName = normalizeIdentityToken(candidate.displayName);
      let score = 0;
      const reasons: string[] = [];

      if (normalizedCandidateName === normalizedName) {
        score += 100;
        reasons.push('Exact name match');
      } else if (
        normalizedCandidateName.startsWith(normalizedName) ||
        normalizedName.startsWith(normalizedCandidateName)
      ) {
        score += 82;
        reasons.push('Strong partial name match');
      } else if (
        normalizedCandidateName.includes(normalizedName) ||
        normalizedName.includes(normalizedCandidateName)
      ) {
        score += 72;
        reasons.push('Partial name match');
      } else {
        const sourceTokens = new Set(normalizedName.split(' ').filter(Boolean));
        const candidateTokens = normalizedCandidateName.split(' ').filter(Boolean);
        const overlap = candidateTokens.filter((token) => sourceTokens.has(token)).length;

        if (overlap > 0) {
          score += overlap * 18;
          reasons.push(`Shared name tokens (${overlap})`);
        }
      }

      if (
        typeof input.shirtNumber === 'number' &&
        Number.isFinite(input.shirtNumber) &&
        candidate.squadNumber === input.shirtNumber
      ) {
        score += 24;
        reasons.push(`Shirt number match (#${input.shirtNumber})`);
      }

      if (score < 40) {
        return null;
      }

      return {
        ...candidate,
        score,
        matchReason: reasons.join(' · '),
      };
    })
    .filter((value): value is T & ClubPlayerMatchSuggestion => Boolean(value))
    .sort((left, right) => right.score - left.score || left.displayName.localeCompare(right.displayName));

  return scored.slice(0, limit);
}
