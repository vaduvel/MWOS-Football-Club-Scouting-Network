export type TransportNotificationType = 'transport_plan_updated';

export type TransportNotificationRecipient = {
  userId: string;
  email: string;
  name: string;
};

export type TransportNotificationDraft = {
  recipientId: string;
  recipientEmail: string;
  type: TransportNotificationType;
  title: string;
  message: string;
  linkPath: string;
  teamName: string;
  transportPlanId: string | null;
  actorName: string;
  emailEnabled: boolean;
};

type BuildTransportNotificationInput = {
  recipient: TransportNotificationRecipient;
  actorName: string;
  teamName: string;
  transportPlanId: string | null;
  linkPath: string;
  detail: string;
};

export function buildTransportNotificationDraft(
  input: BuildTransportNotificationInput,
): TransportNotificationDraft {
  return {
    recipientId: input.recipient.userId,
    recipientEmail: input.recipient.email,
    type: 'transport_plan_updated',
    title: `${input.teamName} transport updated`,
    message: `${input.actorName} updated the ${input.teamName} transport plan. ${input.detail}`.trim(),
    linkPath: input.linkPath,
    teamName: input.teamName,
    transportPlanId: input.transportPlanId,
    actorName: input.actorName,
    emailEnabled: true,
  };
}
