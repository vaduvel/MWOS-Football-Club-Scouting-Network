import { formatISO, startOfWeek, subDays } from 'date-fns';

import {
  canAccessOversightModule,
  canAccessScoutingModule,
  canAccessTrainingModule,
  canAccessTransportModule,
  fetchStaffInvitations,
  getCurrentAppUser,
  userHasAnyRole,
  type StaffInvitationRecord,
} from './data';
import {
  buildClubHomeHero,
  buildClubHomeMetricCards,
  getClubHomeViewMode,
  type ClubHomeHero,
  type ClubHomeMetricCard,
  type ClubHomeViewMode,
} from './clubHomeDomain';
import {
  fetchOversightWorkspace,
  type OversightWorkspace,
} from './oversightData';
import type { OversightAttentionItem } from './oversightDomain';
import { assertSupabaseConfigured, supabase } from './supabase';
import {
  fetchTrainingNotificationCenter,
  fetchTrainingPlanSummaries,
  type TrainingNotificationItem,
  type TrainingPlanSummary,
} from './trainingData';
import {
  fetchTransportPlanSummaries,
  type TransportPlanSummary,
} from './transportData';

type ReportLiteRow = {
  id: string;
  competition: string | null;
  date: string | null;
  home_team: string | null;
  away_team: string | null;
  created_at: string;
};

export interface ClubHomeRecentReport {
  id: string;
  fixture: string;
  competition: string;
  date: string;
  createdAt: string;
}

export interface ClubHomeTransportItem {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  eventDate: string;
  departureTime: string;
  destination: string;
  driverName: string;
  status: string;
}

export interface ClubHomeWorkspace {
  view: ClubHomeViewMode;
  hero: ClubHomeHero;
  metrics: ClubHomeMetricCard[];
  assignedTeamsCount: number;
  notifications: TrainingNotificationItem[];
  unreadNotificationCount: number;
  trainingPlans: TrainingPlanSummary[];
  upcomingTransport: ClubHomeTransportItem[];
  recentReports: ClubHomeRecentReport[];
  recentReportsCount: number;
  attentionItems: OversightAttentionItem[];
  pendingInvitations: StaffInvitationRecord[];
  leadership: OversightWorkspace | null;
}

function getFixtureLabel(report: ReportLiteRow) {
  const home = (report.home_team || '').trim() || 'Home';
  const away = (report.away_team || '').trim() || 'Away';
  return `${home} vs ${away}`;
}

function isUpcomingTransport(plan: TransportPlanSummary) {
  return ['draft', 'published', 'updated'].includes(plan.status);
}

async function fetchRecentReports(limit = 4) {
  const authUser = await getCurrentAppUser();
  if (!canAccessScoutingModule(authUser)) {
    return {
      items: [] as ClubHomeRecentReport[],
      recentCount: 0,
    };
  }

  const since = formatISO(subDays(new Date(), 7));
  const [recentResponse, recentCountResponse] = await Promise.all([
    supabase
      .from('reports')
      .select('id, competition, date, home_team, away_team, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('reports')
      .select('id', { head: true, count: 'exact' })
      .gte('created_at', since),
  ]);

  if (recentResponse.error) {
    throw recentResponse.error;
  }

  if (recentCountResponse.error) {
    throw recentCountResponse.error;
  }

  const items = ((recentResponse.data || []) as ReportLiteRow[]).map((report) => ({
    id: report.id,
    fixture: getFixtureLabel(report),
    competition: (report.competition || '').trim() || 'Friendly',
    date: (report.date || '').trim(),
    createdAt: report.created_at,
  }));

  return {
    items,
    recentCount: recentCountResponse.count || 0,
  };
}

export async function fetchClubHomeWorkspace(): Promise<ClubHomeWorkspace> {
  assertSupabaseConfigured();

  const authUser = await getCurrentAppUser();
  const view = getClubHomeViewMode(authUser.roles);
  const weekStart = formatISO(startOfWeek(new Date(), { weekStartsOn: 1 }), {
    representation: 'date',
  });

  const notificationsPromise = fetchTrainingNotificationCenter(6);
  const trainingPromise = canAccessTrainingModule(authUser)
    ? fetchTrainingPlanSummaries(weekStart)
    : Promise.resolve([] as TrainingPlanSummary[]);
  const transportPromise = canAccessTransportModule(authUser)
    ? fetchTransportPlanSummaries({ status: 'all' })
    : Promise.resolve([] as TransportPlanSummary[]);
  const reportsPromise = fetchRecentReports(4);
  const leadershipPromise = canAccessOversightModule(authUser)
    ? fetchOversightWorkspace()
    : Promise.resolve(null as OversightWorkspace | null);

  const [notifications, trainingPlans, transportPlans, reportsResult, leadership] = await Promise.all([
    notificationsPromise,
    trainingPromise,
    transportPromise,
    reportsPromise,
    leadershipPromise,
  ]);

  const upcomingTransport = transportPlans.filter(isUpcomingTransport).slice(0, 4);
  const pendingInvitations = leadership
    ? leadership.pendingInvitations
    : userHasAnyRole(authUser, ['admin', 'technical_director'])
      ? (await fetchStaffInvitations()).filter((item) => item.status === 'pending').slice(0, 4)
      : [];
  const attentionItems = leadership?.attentionItems.slice(0, 4) || [];

  const assignedTeamsCount = leadership ? leadership.metrics.activeTeams : authUser.teams.length;
  const publishedTrainingPlansCurrentWeek = leadership
    ? leadership.currentWeekTrainingPlans.filter((plan) => ['published', 'updated'].includes(plan.status)).length
    : trainingPlans.filter((plan) => ['published', 'updated'].includes(plan.status)).length;
  const trainingPlansCurrentWeek = leadership ? leadership.currentWeekTrainingPlans.length : trainingPlans.length;
  const upcomingTransportPlans = leadership ? leadership.upcomingTransport.length : upcomingTransport.length;
  const recentReportsCount = leadership ? leadership.metrics.reportsLast7Days : reportsResult.recentCount;

  return {
    view,
    hero: buildClubHomeHero(view, assignedTeamsCount),
    metrics: buildClubHomeMetricCards(view, {
      assignedTeams: assignedTeamsCount,
      unreadNotifications: notifications.unreadCount,
      trainingPlansCurrentWeek,
      publishedTrainingPlansCurrentWeek,
      upcomingTransportPlans,
      recentReports: recentReportsCount,
      pendingInvitations: pendingInvitations.length,
    }),
    assignedTeamsCount,
    notifications: notifications.items,
    unreadNotificationCount: notifications.unreadCount,
    trainingPlans: leadership?.currentWeekTrainingPlans.slice(0, 4) || trainingPlans.slice(0, 4),
    upcomingTransport: leadership
      ? leadership.upcomingTransport.map((item) => ({
          id: item.id,
          teamId: item.teamId,
          teamName: item.teamName,
          title: item.title,
          eventDate: item.eventDate,
          departureTime: item.departureTime,
          destination: item.destination,
          driverName: item.driverName,
          status: item.status,
        }))
      : upcomingTransport.map((item) => ({
          id: item.id,
          teamId: item.teamId,
          teamName: item.teamName,
          title: item.title,
          eventDate: item.eventDate,
          departureTime: item.departureTime,
          destination: item.destination,
          driverName: item.driverName,
          status: item.status,
        })),
    recentReports: leadership
      ? leadership.recentReports.slice(0, 4).map((report) => ({
          id: report.id,
          fixture: report.fixture,
          competition: report.competition,
          date: report.date,
          createdAt: report.createdAt,
        }))
      : reportsResult.items,
    recentReportsCount,
    attentionItems,
    pendingInvitations,
    leadership,
  };
}
