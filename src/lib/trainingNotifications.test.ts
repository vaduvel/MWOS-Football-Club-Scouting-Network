import { describe, expect, it } from 'vitest';

import {
  buildTrainingNotificationDraft,
  type TrainingNotificationRecipient,
} from './trainingNotifications';

const recipient: TrainingNotificationRecipient = {
  userId: 'user-1',
  email: 'coach@example.com',
  name: 'Coach One',
};

describe('buildTrainingNotificationDraft', () => {
  it('creates an email-enabled notification for a published training plan', () => {
    const draft = buildTrainingNotificationDraft('training_plan_published', {
      recipient,
      actorName: 'Coach One',
      teamName: 'U17',
      planId: 'plan-1',
      dayId: null,
      linkPath: '/training?team=u17&week=2026-05-18',
      detail: 'Week of 18 May 2026',
    });

    expect(draft.emailEnabled).toBe(true);
    expect(draft.title).toContain('U17');
    expect(draft.message).toContain('published');
  });

  it('creates an email-enabled notification for a Technical Director comment', () => {
    const draft = buildTrainingNotificationDraft('training_td_comment', {
      recipient,
      actorName: 'Technical Director',
      teamName: 'U17',
      planId: 'plan-1',
      dayId: null,
      linkPath: '/training?team=u17&week=2026-05-18',
      detail: 'Please reduce the second high day load.',
    });

    expect(draft.emailEnabled).toBe(true);
    expect(draft.title).toContain('Technical Director');
    expect(draft.message).toContain('U17');
  });

  it('creates a reminder notification for upcoming training', () => {
    const draft = buildTrainingNotificationDraft('training_session_reminder', {
      recipient,
      actorName: 'System',
      teamName: 'U17',
      planId: 'plan-1',
      dayId: 'day-1',
      linkPath: '/training?team=u17&week=2026-05-18',
      detail: 'Session starts at 17:00',
    });

    expect(draft.emailEnabled).toBe(true);
    expect(draft.type).toBe('training_session_reminder');
  });

  it('creates a high-priority schedule change notification', () => {
    const draft = buildTrainingNotificationDraft('training_schedule_changed', {
      recipient,
      actorName: 'Coach One',
      teamName: 'U17',
      planId: 'plan-1',
      dayId: 'day-1',
      linkPath: '/training?team=u17&week=2026-05-18',
      detail: 'Start time moved to 18:00 at Gym hall',
    });

    expect(draft.emailEnabled).toBe(true);
    expect(draft.message).toContain('Start time moved');
  });
});
