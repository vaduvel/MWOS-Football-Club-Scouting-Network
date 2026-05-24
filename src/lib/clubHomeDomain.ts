export type ClubHomeViewMode =
  | 'admin'
  | 'executive_director'
  | 'technical_director'
  | 'board_observer'
  | 'coach'
  | 'driver'
  | 'scout'
  | 'pending';

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

export function getClubHomeViewMode(roleSlugs: string[]): ClubHomeViewMode {
  const roles = new Set(roleSlugs.map((item) => item.trim().toLowerCase()).filter(Boolean));

  if (roles.has('admin')) return 'admin';
  if (roles.has('executive_director')) return 'executive_director';
  if (roles.has('technical_director')) return 'technical_director';
  if (roles.has('board_observer')) return 'board_observer';

  if (roles.has('coach')) return 'coach';
  if (roles.has('driver')) return 'driver';
  if (roles.has('scout')) return 'scout';
  return 'pending';
}

export function buildClubHomeHero(view: ClubHomeViewMode, assignedTeams: number): ClubHomeHero {
  switch (view) {
    case 'admin':
      return {
        eyebrow: 'Admin Workspace',
        title: 'Run club operations from one surface.',
        description:
          'Keep training, transport, scouting pulse, and staff onboarding moving from one operational control point.',
        primaryLabel: 'Open oversight',
        primaryPath: '/oversight',
        secondaryLabel: 'Manage staff access',
        secondaryPath: '/settings',
      };
    case 'executive_director':
      return {
        eyebrow: 'Executive Development Workspace',
        title: 'Track talent, opportunity, and club progress from one strategic view.',
        description:
          'Follow validated scouting output, player development signals, match-day readiness, and club activity without entering day-to-day editing flows.',
        primaryLabel: 'Open player pipeline',
        primaryPath: '/players',
        secondaryLabel: 'Open oversight',
        secondaryPath: '/oversight',
      };
    case 'technical_director':
      return {
        eyebrow: 'Technical Director Workspace',
        title: 'Review the week across every team and guide the coaches.',
        description:
          'Stay close to training quality, transport readiness, and club activity, then step into the right workspace when comments or direction are needed.',
        primaryLabel: 'Review training plans',
        primaryPath: '/training',
        secondaryLabel: 'Open oversight',
        secondaryPath: '/oversight',
      };
    case 'board_observer':
      return {
        eyebrow: 'Board Briefing',
        title: 'Stay informed with a clean, read-only club summary.',
        description:
          'Review training publication, upcoming transport, scouting pulse, and key alerts without entering operational edit flows.',
        primaryLabel: 'Open oversight',
        primaryPath: '/oversight',
        secondaryLabel: 'Open alerts',
        secondaryPath: '/notifications',
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
        secondaryLabel: 'Open alerts',
        secondaryPath: '/notifications',
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
    case 'admin':
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
    case 'executive_director':
      return [
        {
          label: 'Reports This Week',
          value: String(input.recentReports),
          detail: 'Fresh scouting and player intelligence flowing into the strategic view.',
        },
        {
          label: 'Active Teams',
          value: String(input.assignedTeams),
          detail: 'Teams currently represented in the club development pathway.',
        },
        {
          label: 'Training Published',
          value: `${input.publishedTrainingPlansCurrentWeek} / ${input.trainingPlansCurrentWeek}`,
          detail: 'Current-week planning coverage across the academy and first team.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Leadership updates that may affect decisions or opportunities.',
        },
      ];
    case 'technical_director':
      return [
        {
          label: 'Active Teams',
          value: String(input.assignedTeams),
          detail: 'Teams currently visible from the technical view.',
        },
        {
          label: 'Plans This Week',
          value: String(input.trainingPlansCurrentWeek),
          detail: 'Training plans ready for review or follow-up.',
        },
        {
          label: 'Upcoming Transport',
          value: String(input.upcomingTransportPlans),
          detail: 'Trips still active across the club schedule.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Recent updates that may need technical attention.',
        },
      ];
    case 'board_observer':
      return [
        {
          label: 'Active Teams',
          value: String(input.assignedTeams),
          detail: 'Teams currently represented in the club workspace.',
        },
        {
          label: 'Training Published',
          value: `${input.publishedTrainingPlansCurrentWeek} / ${input.trainingPlansCurrentWeek}`,
          detail: 'Current-week plans already visible to the wider staff.',
        },
        {
          label: 'Reports This Week',
          value: String(input.recentReports),
          detail: 'Scouting reports created in the last 7 days.',
        },
        {
          label: 'Unread Alerts',
          value: String(input.unreadNotifications),
          detail: 'Fresh updates waiting in the read-only briefing flow.',
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
