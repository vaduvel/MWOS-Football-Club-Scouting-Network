import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTrainingWeek } from './trainingDomain';
import type { TrainingWorkspace } from './trainingData';
import { clearTrainingDraft, readTrainingDraft, writeTrainingDraft } from './trainingDraftStore';

function buildWorkspace(teamId = 'team-1', weekStart = '2026-09-14'): TrainingWorkspace {
  return {
    team: {
      id: teamId,
      slug: teamId,
      name: 'QA Team',
      is_active: true,
    },
    weekStart,
    headline: 'Unsaved QA plan',
    objective: 'Protect the draft',
    status: 'draft',
    source: null,
    days: buildTrainingWeek(weekStart),
    comments: [],
    publishedAt: null,
    updatedAt: null,
    archivedAt: null,
    canManage: true,
    canComment: true,
    matchContext: null,
  };
}

describe('trainingDraftStore', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores an unsaved plan for the same user, team, and week', () => {
    const workspace = buildWorkspace();

    writeTrainingDraft('user-1', 'team-1', '2026-09-14', workspace);

    expect(readTrainingDraft('user-1', 'team-1', '2026-09-14')?.workspace.headline).toBe(
      'Unsaved QA plan',
    );
  });

  it('rejects corrupted or mismatched draft payloads', () => {
    const workspace = buildWorkspace('another-team');

    writeTrainingDraft('user-1', 'team-1', '2026-09-14', workspace);

    expect(readTrainingDraft('user-1', 'team-1', '2026-09-14')).toBeNull();
    values.set('mwos-training-draft:user-1:team-1:2026-09-14', '{not-json');
    expect(readTrainingDraft('user-1', 'team-1', '2026-09-14')).toBeNull();
  });

  it('clears the saved browser draft after a successful server save', () => {
    const workspace = buildWorkspace();

    writeTrainingDraft('user-1', 'team-1', '2026-09-14', workspace);
    clearTrainingDraft('user-1', 'team-1', '2026-09-14');

    expect(readTrainingDraft('user-1', 'team-1', '2026-09-14')).toBeNull();
  });
});
