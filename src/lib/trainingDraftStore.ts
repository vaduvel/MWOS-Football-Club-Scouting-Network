import type { TrainingWorkspace } from './trainingData';

const STORAGE_PREFIX = 'mwos-training-draft:';

export type TrainingDraftRecord = {
  workspace: TrainingWorkspace;
  savedAt: string;
};

function getStorageKey(userId: string, teamId: string, weekStart: string) {
  return `${STORAGE_PREFIX}${userId}:${teamId}:${weekStart}`;
}

export function readTrainingDraft(userId: string, teamId: string, weekStart: string): TrainingDraftRecord | null {
  if (typeof window === 'undefined' || !userId || !teamId || !weekStart) return null;

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId, teamId, weekStart));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrainingDraftRecord;
    if (
      parsed?.workspace?.team?.id !== teamId ||
      parsed.workspace.weekStart !== weekStart ||
      !Array.isArray(parsed.workspace.days) ||
      typeof parsed.savedAt !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeTrainingDraft(
  userId: string,
  teamId: string,
  weekStart: string,
  workspace: TrainingWorkspace,
) {
  if (typeof window === 'undefined' || !userId || !teamId || !weekStart) return;

  try {
    window.localStorage.setItem(
      getStorageKey(userId, teamId, weekStart),
      JSON.stringify({ workspace, savedAt: new Date().toISOString() } satisfies TrainingDraftRecord),
    );
  } catch {
    // Draft recovery is best effort; the visible leave warning still protects the user.
  }
}

export function clearTrainingDraft(userId: string, teamId: string, weekStart: string) {
  if (typeof window === 'undefined' || !userId || !teamId || !weekStart) return;

  try {
    window.localStorage.removeItem(getStorageKey(userId, teamId, weekStart));
  } catch {
    // Ignore storage cleanup failures after a successful server save.
  }
}
