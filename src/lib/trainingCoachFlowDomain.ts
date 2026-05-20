import type { TrainingPlanDay } from './trainingData';
import type { TrainingPlanStatus } from './trainingDomain';

export type TrainingCoachFlowActionKind =
  | 'add_sessions'
  | 'review_missing_info'
  | 'publish_plan'
  | 'share_plan';

export type TrainingCoachFlowInput = {
  days: TrainingPlanDay[];
  status: TrainingPlanStatus;
  publishedAt: string | null;
  hasSource: boolean;
};

export type TrainingCoachFlowState = {
  primaryAction: {
    kind: TrainingCoachFlowActionKind;
    label: string;
    helper: string;
    targetDayIndex?: number;
  };
  progress: {
    sessionsStarted: boolean;
    reviewNeeded: boolean;
    readyToPublish: boolean;
    published: boolean;
  };
  counts: {
    trainingDays: number;
    recoveryDays: number;
    missingInfoDays: number;
    reviewDays: number;
    structuredDays: number;
  };
};

export function dayHasCoachContent(day: TrainingPlanDay) {
  return Boolean(
    day.dayType !== 'rest' ||
      day.sessionTitle.trim() ||
      day.startTime.trim() ||
      day.endTime.trim() ||
      day.location.trim() ||
      day.objectives.trim() ||
      day.exercises.trim() ||
      day.notes.trim() ||
      day.importedExcerpt?.trim() ||
      day.importReviewState === 'missing_info' ||
      day.importReviewState === 'needs_review',
  );
}

export function getTrainingCoachFlowState(input: TrainingCoachFlowInput): TrainingCoachFlowState {
  const trainingDays = input.days.filter((day) => day.dayType === 'training').length;
  const recoveryDays = input.days.filter((day) => day.dayType === 'active_recovery').length;
  const missingInfoDays = input.days.filter((day) => day.importReviewState === 'missing_info').length;
  const reviewDays = input.days.filter((day) => day.importReviewState === 'needs_review').length;
  const structuredDays = input.days.filter(dayHasCoachContent).length;
  const firstIssueDay = input.days.find(
    (day) => day.importReviewState === 'missing_info' || day.importReviewState === 'needs_review',
  );

  const sessionsStarted = structuredDays > 0 || input.hasSource;
  const reviewNeeded = missingInfoDays > 0 || reviewDays > 0;
  const published = input.status === 'published' || Boolean(input.publishedAt);
  const readyToPublish = sessionsStarted && !reviewNeeded && !published;

  if (!sessionsStarted) {
    return {
      primaryAction: {
        kind: 'add_sessions',
        label: 'Add sessions',
        helper: 'Start from a WhatsApp screenshot, photo, PDF or manual entry.',
      },
      progress: {
        sessionsStarted,
        reviewNeeded,
        readyToPublish,
        published,
      },
      counts: {
        trainingDays,
        recoveryDays,
        missingInfoDays,
        reviewDays,
        structuredDays,
      },
    };
  }

  if (reviewNeeded) {
    return {
      primaryAction: {
        kind: 'review_missing_info',
        label: 'Review missing info',
        helper: 'Open the first highlighted day and complete the missing training details.',
        targetDayIndex: firstIssueDay?.dayIndex,
      },
      progress: {
        sessionsStarted,
        reviewNeeded,
        readyToPublish,
        published,
      },
      counts: {
        trainingDays,
        recoveryDays,
        missingInfoDays,
        reviewDays,
        structuredDays,
      },
    };
  }

  if (published) {
    return {
      primaryAction: {
        kind: 'share_plan',
        label: 'Share on WhatsApp',
        helper: 'The plan is live. Share the clean staff message when needed.',
      },
      progress: {
        sessionsStarted,
        reviewNeeded,
        readyToPublish,
        published,
      },
      counts: {
        trainingDays,
        recoveryDays,
        missingInfoDays,
        reviewDays,
        structuredDays,
      },
    };
  }

  return {
    primaryAction: {
      kind: 'publish_plan',
      label: 'Publish plan',
      helper: 'The week has structured content and is ready for staff visibility.',
    },
    progress: {
      sessionsStarted,
      reviewNeeded,
      readyToPublish,
      published,
    },
    counts: {
      trainingDays,
      recoveryDays,
      missingInfoDays,
      reviewDays,
      structuredDays,
    },
  };
}
