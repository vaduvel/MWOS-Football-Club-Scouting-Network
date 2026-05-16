export type OversightTrainingStatus = 'missing' | 'draft' | 'published' | 'updated';
export type OversightReadinessState = 'ready' | 'watch' | 'action';
export type OversightAttentionSeverity = 'high' | 'medium';

export interface OversightTrainingSignal {
  planId: string;
  status: 'draft' | 'published' | 'updated' | 'archived';
  headline: string;
  weekStart: string;
  updatedAt: string;
}

export interface OversightTransportSignal {
  planId: string;
  status: 'draft' | 'published' | 'updated' | 'completed' | 'cancelled';
  eventDate: string;
  destination: string;
  driverAssigned: boolean;
  driverName: string;
}

export interface OversightTeamSnapshotInput {
  teamId: string;
  teamSlug: string;
  teamName: string;
  coachCount: number | null;
  training: OversightTrainingSignal | null;
  transport: OversightTransportSignal | null;
}

export interface OversightTeamIssue {
  severity: OversightAttentionSeverity;
  title: string;
  detail: string;
  linkPath: string;
}

export interface OversightTeamSnapshot {
  teamId: string;
  teamSlug: string;
  teamName: string;
  coachCount: number | null;
  trainingStatus: OversightTrainingStatus;
  trainingHeadline: string;
  trainingWeekStart: string | null;
  nextTransportStatus: OversightTransportSignal['status'] | 'none';
  nextTransportLabel: string;
  nextTransportDate: string | null;
  readiness: OversightReadinessState;
  issues: OversightTeamIssue[];
}

export interface OversightAttentionItem {
  id: string;
  severity: OversightAttentionSeverity;
  title: string;
  detail: string;
  linkPath: string;
  teamName?: string;
}

function getTrainingStatus(training: OversightTrainingSignal | null): OversightTrainingStatus {
  if (!training) return 'missing';
  if (training.status === 'updated') return 'updated';
  if (training.status === 'published') return 'published';
  return 'draft';
}

function getTransportLabel(transport: OversightTransportSignal | null) {
  if (!transport) return 'No upcoming transport';
  return `${transport.eventDate} · ${transport.destination}`;
}

export function buildOversightTeamSnapshot(input: OversightTeamSnapshotInput): OversightTeamSnapshot {
  const issues: OversightTeamIssue[] = [];
  const trainingStatus = getTrainingStatus(input.training);

  if (input.coachCount !== null && input.coachCount === 0) {
    issues.push({
      severity: 'high',
      title: 'No coach assigned',
      detail: `${input.teamName} does not yet have a coach assigned in club access.`,
      linkPath: '/settings',
    });
  }

  if (!input.training) {
    issues.push({
      severity: 'high',
      title: 'Training plan missing',
      detail: `${input.teamName} has no current-week training plan yet.`,
      linkPath: `/training?team=${input.teamId}`,
    });
  } else if (input.training.status === 'draft') {
    issues.push({
      severity: 'medium',
      title: 'Training plan still draft',
      detail: `${input.teamName} has a current-week training plan that is still in draft.`,
      linkPath: `/training?team=${input.teamId}`,
    });
  }

  if (input.transport && !input.transport.driverAssigned && ['draft', 'published', 'updated'].includes(input.transport.status)) {
    issues.push({
      severity: 'high',
      title: 'Driver not assigned',
      detail: `${input.teamName} has an active transport plan without an assigned driver.`,
      linkPath: `/transport?team=${input.teamId}&plan=${input.transport.planId}`,
    });
  }

  const readiness: OversightReadinessState = issues.some((issue) => issue.severity === 'high')
    ? 'action'
    : issues.length > 0
      ? 'watch'
      : 'ready';

  return {
    teamId: input.teamId,
    teamSlug: input.teamSlug,
    teamName: input.teamName,
    coachCount: input.coachCount,
    trainingStatus,
    trainingHeadline: input.training?.headline || 'No plan published yet',
    trainingWeekStart: input.training?.weekStart || null,
    nextTransportStatus: input.transport?.status || 'none',
    nextTransportLabel: getTransportLabel(input.transport),
    nextTransportDate: input.transport?.eventDate || null,
    readiness,
    issues,
  };
}

export function buildOversightAttentionItems(args: {
  teams: OversightTeamSnapshot[];
  pendingInvitations: Array<{
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  }>;
}): OversightAttentionItem[] {
  const items: OversightAttentionItem[] = [];

  args.teams.forEach((team) => {
    team.issues.forEach((issue, index) => {
      items.push({
        id: `${team.teamId}:${issue.title}:${index}`,
        severity: issue.severity,
        title: issue.title,
        detail: issue.detail,
        linkPath: issue.linkPath,
        teamName: team.teamName,
      });
    });
  });

  args.pendingInvitations.forEach((invitation) => {
    items.push({
      id: `invite:${invitation.id}`,
      severity: 'medium',
      title: 'Pending staff invitation',
      detail: `${invitation.fullName || invitation.email} still has a pending invite from ${invitation.createdAt.slice(0, 10)}.`,
      linkPath: '/settings',
    });
  });

  return items.sort((left, right) => {
    const severityRank = left.severity === right.severity ? 0 : left.severity === 'high' ? -1 : 1;
    if (severityRank !== 0) return severityRank;
    return left.title.localeCompare(right.title);
  });
}
