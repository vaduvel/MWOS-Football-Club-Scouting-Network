export type TrainingNotificationType =
  | 'training_plan_published'
  | 'training_td_comment'
  | 'training_session_reminder'
  | 'training_schedule_changed'
  | 'transport_plan_updated';

export type TrainingNotificationRecipient = {
  userId: string;
  email: string;
  name: string;
};

export type TrainingNotificationDraft = {
  recipientId: string;
  recipientEmail: string;
  type: TrainingNotificationType;
  title: string;
  message: string;
  linkPath: string;
  teamName: string;
  planId: string | null;
  dayId: string | null;
  actorName: string;
  emailEnabled: boolean;
};

type BuildNotificationInput = {
  recipient: TrainingNotificationRecipient;
  actorName: string;
  teamName: string;
  planId: string | null;
  dayId: string | null;
  linkPath: string;
  detail: string;
};

function buildMessage(type: TrainingNotificationType, actorName: string, teamName: string, detail: string) {
  switch (type) {
    case 'training_plan_published':
      return `${actorName} published the ${teamName} training plan. ${detail}`.trim();
    case 'training_td_comment':
      return `${actorName} commented on the ${teamName} training plan. ${detail}`.trim();
    case 'training_session_reminder':
      return `${teamName} training starts soon. ${detail}`.trim();
    case 'training_schedule_changed':
      return `${actorName} updated the ${teamName} training schedule. ${detail}`.trim();
    case 'transport_plan_updated':
      return `${actorName} updated the ${teamName} transport plan. ${detail}`.trim();
  }
}

function buildTitle(type: TrainingNotificationType, actorName: string, teamName: string) {
  switch (type) {
    case 'training_plan_published':
      return `${teamName} training plan published`;
    case 'training_td_comment':
      return `Technical Director comment for ${teamName}`;
    case 'training_session_reminder':
      return `${teamName} training reminder`;
    case 'training_schedule_changed':
      return `${teamName} training schedule changed`;
    case 'transport_plan_updated':
      return `${teamName} transport updated`;
  }
}

export function buildTrainingNotificationDraft(
  type: TrainingNotificationType,
  input: BuildNotificationInput,
): TrainingNotificationDraft {
  return {
    recipientId: input.recipient.userId,
    recipientEmail: input.recipient.email,
    type,
    title: buildTitle(type, input.actorName, input.teamName),
    message: buildMessage(type, input.actorName, input.teamName, input.detail),
    linkPath: input.linkPath,
    teamName: input.teamName,
    planId: input.planId,
    dayId: input.dayId,
    actorName: input.actorName,
    emailEnabled: true,
  };
}
