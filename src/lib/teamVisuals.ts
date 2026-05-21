export interface TeamVisualTone {
  accentClass: string;
  badgeClass: string;
  cardClass: string;
}

const TEAM_TONES: Array<{ patterns: RegExp[]; tone: TeamVisualTone }> = [
  {
    patterns: [/\bqueens\b/i, /\bgirls\b/i, /\bwomen\b/i],
    tone: {
      accentClass: 'bg-fuchsia-600',
      badgeClass: 'bg-fuchsia-100 text-fuchsia-700',
      cardClass: 'border-fuchsia-200 bg-fuchsia-50/75',
    },
  },
  {
    patterns: [/\bfirst\b/i, /\bsenior/i],
    tone: {
      accentClass: 'bg-indigo-600',
      badgeClass: 'bg-indigo-100 text-indigo-700',
      cardClass: 'border-indigo-200 bg-indigo-50/75',
    },
  },
  {
    patterns: [/\bu19\b/i],
    tone: {
      accentClass: 'bg-violet-600',
      badgeClass: 'bg-violet-100 text-violet-700',
      cardClass: 'border-violet-200 bg-violet-50/75',
    },
  },
  {
    patterns: [/\bu17\b/i],
    tone: {
      accentClass: 'bg-blue-600',
      badgeClass: 'bg-blue-100 text-blue-700',
      cardClass: 'border-blue-200 bg-blue-50/75',
    },
  },
  {
    patterns: [/\bu15\b/i],
    tone: {
      accentClass: 'bg-teal-600',
      badgeClass: 'bg-teal-100 text-teal-700',
      cardClass: 'border-teal-200 bg-teal-50/75',
    },
  },
  {
    patterns: [/\bu13\b/i],
    tone: {
      accentClass: 'bg-amber-500',
      badgeClass: 'bg-amber-100 text-amber-700',
      cardClass: 'border-amber-200 bg-amber-50/75',
    },
  },
  {
    patterns: [/\bu11\b/i],
    tone: {
      accentClass: 'bg-lime-600',
      badgeClass: 'bg-lime-100 text-lime-700',
      cardClass: 'border-lime-200 bg-lime-50/75',
    },
  },
  {
    patterns: [/\bu9\b/i],
    tone: {
      accentClass: 'bg-rose-500',
      badgeClass: 'bg-rose-100 text-rose-700',
      cardClass: 'border-rose-200 bg-rose-50/75',
    },
  },
];

export function getTeamVisualTone(teamName: string): TeamVisualTone {
  const normalized = teamName.trim();
  const match = TEAM_TONES.find(({ patterns }) => patterns.some((pattern) => pattern.test(normalized)));

  return (
    match?.tone || {
      accentClass: 'bg-slate-500',
      badgeClass: 'bg-slate-100 text-slate-700',
      cardClass: 'border-slate-200 bg-slate-50/75',
    }
  );
}
