export type ScoutingWorkspaceMetric = {
  label: string;
  value: number;
  detail: string;
  tone: 'primary' | 'accent' | 'gold' | 'success';
};

export type ScoutingWorkspaceAction = {
  label: string;
  helper: string;
  path: string;
  tone: 'solid' | 'soft';
};

export type ScoutingWorkspaceHero = {
  eyebrow: string;
  title: string;
  description: string;
  searchPlaceholder: string;
};

export type ScoutingWorkspaceMode = 'operator' | 'admin' | 'executive_director' | 'technical_director' | 'leadership';

function normalizeScoutingWorkspaceMode(mode: boolean | ScoutingWorkspaceMode): ScoutingWorkspaceMode {
  if (typeof mode === 'boolean') {
    return mode ? 'leadership' : 'operator';
  }

  return mode;
}

export function buildScoutingWorkspaceHero(mode: boolean | ScoutingWorkspaceMode): ScoutingWorkspaceHero {
  const normalizedMode = normalizeScoutingWorkspaceMode(mode);

  if (normalizedMode === 'executive_director') {
    return {
      eyebrow: 'Global Scouting Pipeline',
      title: 'Talent Intelligence',
      description:
        'Review club-wide scouting signals, tracked players and pathway opportunities before they become strategic decisions.',
      searchPlaceholder: 'Search reports, players, competitions…',
    };
  }

  if (normalizedMode === 'technical_director') {
    return {
      eyebrow: 'Technical Scouting Review',
      title: 'Scouting Oversight',
      description:
        'Review reports, player evaluations and local talent signals before they move into the wider development pathway.',
      searchPlaceholder: 'Search reports, competitions, creators…',
    };
  }

  if (normalizedMode === 'admin' || normalizedMode === 'leadership') {
    return {
        eyebrow: 'MWOS Scouting Workspace',
        title: 'Scouting Oversight',
        description:
          'Track club-wide reports, player signals and scouting activity from one workspace that stays connected to leadership operations.',
        searchPlaceholder: 'Search reports, competitions, creators…',
    };
  }

  return {
    eyebrow: 'MWOS Scouting Workspace',
    title: 'Scouting Reports',
    description:
      'Create, review and follow up on reports from the same scouting workspace that feeds player decisions across the club.',
    searchPlaceholder: 'Search tracked reports and notes…',
  };
}

export function buildScoutingWorkspaceMetrics(input: {
  isLeadership: boolean;
  totalReports: number;
  reportsThisWeek: number;
  filteredReports: number;
  trackedPlayers: number;
  shortlistCount: number;
  competitionsTracked: number;
}): ScoutingWorkspaceMetric[] {
  if (input.isLeadership) {
    return [
      {
        label: 'Reports',
        value: input.totalReports,
        detail: 'Total reports in workspace',
        tone: 'primary',
      },
      {
        label: 'This Week',
        value: input.reportsThisWeek,
        detail: 'Reports filed in the last 7 days',
        tone: 'accent',
      },
      {
        label: 'Tracked Players',
        value: input.trackedPlayers,
        detail: 'Unique players inside player hub',
        tone: 'gold',
      },
      {
        label: 'Competitions',
        value: input.competitionsTracked,
        detail: 'Competitions seen in reports',
        tone: 'success',
      },
    ];
  }

  return [
    {
      label: 'Reports',
      value: input.totalReports,
      detail: 'Available reports',
      tone: 'primary',
    },
    {
      label: 'This Week',
      value: input.reportsThisWeek,
      detail: 'Fresh report activity',
      tone: 'accent',
    },
    {
      label: 'Shown',
      value: input.filteredReports,
      detail: 'Matching the active search',
      tone: 'gold',
    },
    {
      label: 'Shortlist',
      value: input.shortlistCount,
      detail: 'Players flagged for follow-up',
      tone: 'success',
    },
  ];
}

export function buildScoutingWorkspaceActions(input: {
  isLeadership: boolean;
  hasTrackedPlayers: boolean;
  canCreateReports: boolean;
}): ScoutingWorkspaceAction[] {
  const actions: ScoutingWorkspaceAction[] = [];

  if (input.canCreateReports) {
    actions.push({
      label: 'New Report',
      helper: 'Start a fresh scouting report.',
      path: '/scouting/report/new',
      tone: 'solid',
    });
  }

  actions.push({
    label: 'Player Hub',
    helper: input.hasTrackedPlayers ? 'Compare and shortlist players.' : 'Open tracked player intelligence.',
    path: '/players',
    tone: input.canCreateReports ? 'soft' : 'solid',
  });

  if (input.isLeadership) {
    actions.push({
      label: 'Oversight',
      helper: 'Review the wider club operation.',
      path: '/oversight',
      tone: 'soft',
    });
  } else {
    actions.push({
      label: 'Club Home',
      helper: 'Return to your role-aware club workspace.',
      path: '/',
      tone: 'soft',
    });
  }

  return actions;
}
