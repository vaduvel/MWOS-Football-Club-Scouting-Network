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

export function buildScoutingWorkspaceHero(isLeadership: boolean): ScoutingWorkspaceHero {
  return isLeadership
    ? {
        eyebrow: 'MWOS Scouting Workspace',
        title: 'Scouting Oversight',
        description:
          'Track club-wide reports, player signals and scouting activity from one workspace that stays connected to leadership operations.',
        searchPlaceholder: 'Search reports, competitions, creators…',
      }
    : {
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
}): ScoutingWorkspaceAction[] {
  const actions: ScoutingWorkspaceAction[] = [
    {
      label: 'New Report',
      helper: 'Start a fresh scouting report.',
      path: '/scouting/report/new',
      tone: 'solid',
    },
    {
      label: 'Player Hub',
      helper: input.hasTrackedPlayers ? 'Compare and shortlist players.' : 'Open tracked player intelligence.',
      path: '/players',
      tone: 'soft',
    },
  ];

  if (input.isLeadership) {
    actions.push({
      label: 'Oversight',
      helper: 'Review the wider club operation.',
      path: '/oversight',
      tone: 'soft',
    });
  } else {
    actions.push({
      label: 'Training',
      helper: 'Jump from scouting into team planning.',
      path: '/training',
      tone: 'soft',
    });
  }

  return actions;
}
