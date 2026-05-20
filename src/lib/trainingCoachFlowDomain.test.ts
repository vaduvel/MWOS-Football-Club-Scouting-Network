import { describe, expect, it } from 'vitest';

import { buildTrainingWeek, type TrainingPlanStatus } from './trainingDomain';
import {
  getTrainingCoachFlowState,
  type TrainingCoachFlowInput,
} from './trainingCoachFlowDomain';
import type { TrainingPlanDay } from './trainingData';

function makeWeekDays(): TrainingPlanDay[] {
  return buildTrainingWeek('2026-05-18').map((day) => ({ ...day }));
}

function makeFlowInput(overrides: Partial<TrainingCoachFlowInput> = {}): TrainingCoachFlowInput {
  return {
    days: makeWeekDays(),
    status: 'draft' satisfies TrainingPlanStatus,
    publishedAt: null,
    hasSource: false,
    ...overrides,
  };
}

describe('training coach flow domain', () => {
  it('starts empty weeks with one clear add-sessions action', () => {
    const state = getTrainingCoachFlowState(makeFlowInput());

    expect(state.primaryAction.kind).toBe('add_sessions');
    expect(state.primaryAction.label).toBe('Add sessions');
    expect(state.progress.sessionsStarted).toBe(false);
    expect(state.counts.trainingDays).toBe(0);
  });

  it('sends imported drafts with missing fields back to the first problem day', () => {
    const days = makeWeekDays();
    days[3] = {
      ...days[3],
      dayType: 'training',
      sessionTitle: 'Imported Thursday session',
      importReviewState: 'missing_info',
      importedExcerpt: 'Thursday training starts 08:00hrs',
    };

    const state = getTrainingCoachFlowState(makeFlowInput({ days, hasSource: true }));

    expect(state.primaryAction.kind).toBe('review_missing_info');
    expect(state.primaryAction.label).toBe('Review missing info');
    expect(state.primaryAction.targetDayIndex).toBe(3);
    expect(state.counts.missingInfoDays).toBe(1);
  });

  it('promotes complete draft plans to publish before sharing', () => {
    const days = makeWeekDays();
    days[0] = {
      ...days[0],
      dayType: 'training',
      sessionTitle: 'Speed and finishing',
      startTime: '08:00',
      location: 'Ngoni Stadium',
      objectives: 'Improve final-third speed decisions.',
      exercises: 'Warm-up, flying sprints, finishing waves.',
    };

    const state = getTrainingCoachFlowState(makeFlowInput({ days }));

    expect(state.primaryAction.kind).toBe('publish_plan');
    expect(state.primaryAction.label).toBe('Publish plan');
    expect(state.progress.readyToPublish).toBe(true);
    expect(state.counts.trainingDays).toBe(1);
  });

  it('makes sharing the primary action after a plan is already published', () => {
    const days = makeWeekDays();
    days[0] = {
      ...days[0],
      dayType: 'training',
      sessionTitle: 'Speed and finishing',
      startTime: '08:00',
      location: 'Ngoni Stadium',
    };

    const state = getTrainingCoachFlowState(
      makeFlowInput({
        days,
        status: 'published',
        publishedAt: '2026-05-18T08:00:00.000Z',
      }),
    );

    expect(state.primaryAction.kind).toBe('share_plan');
    expect(state.primaryAction.label).toBe('Share on WhatsApp');
    expect(state.progress.published).toBe(true);
  });
});
