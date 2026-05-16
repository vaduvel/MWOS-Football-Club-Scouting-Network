export type ClubHomeViewMode = 'leadership' | 'coach' | 'driver' | 'scout' | 'pending';

export interface ClubHomeHero {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryPath: string;
  secondaryLabel: string | null;
  secondaryPath: string | null;
}

export interface ClubHomeMetricCard {
  label: string;
  value: string;
  detail: string;
}

export interface ClubHomeMetricInput {
  assignedTeams: number;
  unreadNotifications: number;
  trainingPlansCurrentWeek: number;
  publishedTrainingPlansCurrentWeek: number;
  upcomingTransportPlans: number;
  recentReports: number;
  pendingInvitations: number;
}

const LEADERSHIP_ROLES = new Set(['admin', 'technical_director', 'board_observer']);

export function getClubHomeViewMode(roleSlugs: string[]): ClubHomeViewMode {
  const roles = new Set(roleSlugs.map((item) => item.trim().toLowerCase()).filter(Boolean));

  if ([...roles].some((item) => LEADERSHIP_ROLES.has(item))) {
    return 'leadership';
  }

  if (roles.has('coach')) return 'coach';
  if (roles.has('driver')) return 'driver';
  if (roles.has('scout')) return 'scout';
  return 'pending';
}

export function buildClubHomeHero(view: ClubHomeViewMode, assignedTeams: number): ClubHomeHero {
  switch (view) {
    case 'leadership':
      return {
        eyebrow: 'Leadership Workspace',
        title: 'Keep the whole club aligned from one surface.',
        description:
          'See weekly training coverage, transport readiness, scouting pulse, and staff access without jumping between modules.',
        primaryLabel: 'Open oversight',
        primaryPath: '/oversight',
        secondaryLabel: 'Manage staff access',
        secondaryPath: '/settings',
      };
    case 'coach':
      return {
        eyebrow: 'Coach Workspace',
        title: `Run the week across ${assignedTeams} assigned team${assignedTeams === 1 ? '' : 's'}.`,
        description:
          'Stay on top of microcycles, transport coordination, and Technical Director feedback from one coaching workspace.',
        primaryLabel: 'Open training plans',
        primaryPath: '/training',
        secondaryLabel: 'Review transport',
        secondaryPath: '/transport',
      };
    case 'driver':
      return {
        eyebrow: 'Driver Workspace',
        title: 'Track departures, meeting points, and travel changes.',
        description:
          'Use the club workspace to stay ahead of upcoming trips and last-minute changes without chasing coaches manually.',
        primaryLabel: 'Open transport plans',
        primaryPath: '/transport',
        secondaryLabel: 'Open notifications',
        secondaryPath: '/settings',
      };
    case 'scout':
      return {
        eyebrow: 'Scouting Workspace',
        title: 'Keep reports, player notes, and follow-up in motion.',
        description:
          'Move quickly from recent reports into scouting, player tracking, and club-wide updates that affect the football operation.',
        primaryLabel: 'Open scouting reports',
        primaryPath: '/scouting',
        secondaryLabel: 'Open player hub',
        secondaryPath: '/players',
      };
    case 'pending':
    default:
      return {
        eyebrow: 'Club Workspace',
        title: 'Your access is being prepared.',
        description:
          'As soon as roles and team assignments are in place, this workspace will show the right modules and next actions automatically.',
        primaryLabel: 'Open settings',
        primaryPath: '/settings',
        secondaryLabel: null,
        secondaryPath: null,
      };
  }
}

export function buildClubHomeMetricCards(
  view: ClubHomeViewMode,
  input: ClubHomeMetricInput,
): ClubHomeMetricCard[] {
  switch (view) {
    case 'leadership':
      return [
        {
          label: 'Active Teams',
          value: String(input.assignedTeams),
          detail: 'Teams currently inside the club workspace.',
        },
        {
          label: 'Training Published',
          value: `${input.publishedTrainingPlansCurrentWeek} / ${input.trainingPlansCurrentWeek}`,
          detail: 'Current-week plans that are already published.',
        },
        {
          label: 'Upcoming Transport',
          value: String(input.upcomingTransportPlans),
          detail: 'Trips still active in the transport module.',
        },
        {
          label: 'Pending Invites',
          value: String(input.pendingInvitations),
          detail: 'Staff invitations still waiting for activation.',
        },
      ];
    case 'coach':
      return [
        {
          label: 'Assigned Teams',
          value: String(input.assignedTeams),
          detail: 'Teams linked to your coaching access.',
        },
        {
          label: 'Plans This Week',
          value: String(input.trainingPlansCurrentWeek),
          detail: 'Current-week training plans you can act on.',
        },
        {
          label: 'Published',
          value: String(input.publishedTrainingPlansCurrentWeek),
          detail: 'Plans already visible to the wider staff.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Notifications needing attention in the workspace.',
        },
      ];
    case 'driver':
      return [
        {
          label: 'Assigned Teams',
          value: String(input.assignedTeams),
          detail: 'Teams whose transport you can currently see.',
        },
        {
          label: 'Upcoming Trips',
          value: String(input.upcomingTransportPlans),
          detail: 'Active transport plans scheduled ahead.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Recent transport or club updates waiting for you.',
        },
        {
          label: 'Reports This Week',
          value: String(input.recentReports),
          detail: 'Club reporting pulse visible from your access.',
        },
      ];
    case 'scout':
      return [
        {
          label: 'Recent Reports',
          value: String(input.recentReports),
          detail: 'Scouting reports created in the last 7 days.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Operational notifications affecting your scouting work.',
        },
        {
          label: 'Assigned Teams',
          value: String(input.assignedTeams),
          detail: 'Teams connected to your current staff access.',
        },
        {
          label: 'Upcoming Transport',
          value: String(input.upcomingTransportPlans),
          detail: 'Travel plans that may affect match-day scouting.',
        },
      ];
    case 'pending':
    default:
      return [
        {
          label: 'Assigned Teams',
          value: String(input.assignedTeams),
          detail: 'This will increase once access is assigned.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Notifications will appear here after onboarding.',
        },
        {
          label: 'Plans This Week',
          value: String(input.trainingPlansCurrentWeek),
          detail: 'Visible once your role permissions are active.',
        },
        {
          label: 'Upcoming Transport',
          value: String(input.upcomingTransportPlans),
          detail: 'Visible when your transport or team access is active.',
        },
      ];
  }
}
