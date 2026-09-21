import { describe, expect, it, vi } from 'vitest';
import { createReportSaveCoordinator } from './reportSaveCoordinator';
import { createIndividualReport } from './individualReportDomain';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup() {
  let latest = { ...createIndividualReport('QA'), report_type: 'match' as const, general_notes: 'A' };
  let active = true;
  const firstSave = deferred<string>();
  const secondSave = deferred<string>();
  const persist = vi.fn().mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise);
  const backup = vi.fn().mockResolvedValue(undefined);
  const clearBackup = vi.fn().mockResolvedValue(undefined);
  const onSaved = vi.fn();
  const saver = createReportSaveCoordinator({
    getLatest: () => latest, isActive: () => active, persist, backup, clearBackup, onSaved,
  });
  return { saver, persist, backup, clearBackup, onSaved, firstSave, secondSave,
    edit: (notes: string) => { latest = { ...latest, general_notes: notes }; },
    deactivate: () => { active = false; },
  };
}

describe('match report save coordination', () => {
  it('saves edits made during an in-flight request before reporting success', async () => {
    const t = setup();
    const done = t.saver.save();
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(1));
    t.edit('B typed while A is saving');
    t.firstSave.resolve('report-1');
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(2));
    expect(t.onSaved).not.toHaveBeenCalled();
    expect(t.clearBackup).not.toHaveBeenCalled();
    expect(t.persist.mock.calls[1][0].general_notes).toBe('B typed while A is saving');
    t.secondSave.resolve('report-1');
    await done;
    expect(t.onSaved).toHaveBeenCalledWith('report-1', expect.objectContaining({ general_notes: 'B typed while A is saving' }));
  });

  it('deduplicates manual and automatic save attempts', async () => {
    const t = setup();
    const first = t.saver.save();
    const second = t.saver.save();
    expect(second).toBe(first);
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(1));
    t.firstSave.resolve('report-1');
    await Promise.all([first, second]);
    expect(t.persist).toHaveBeenCalledTimes(1);
  });

  it('also saves edits made while draft cleanup is committing', async () => {
    const t = setup();
    const cleanup = deferred<void>();
    t.clearBackup.mockReturnValueOnce(cleanup.promise);
    const done = t.saver.save();
    t.firstSave.resolve('report-1');
    await vi.waitFor(() => expect(t.clearBackup).toHaveBeenCalledTimes(1));
    t.edit('B during cleanup');
    cleanup.resolve();
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(2));
    expect(t.backup.mock.calls[1][0].general_notes).toBe('B during cleanup');
    t.secondSave.resolve('report-1');
    await done;
    expect(t.onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not clear a backup or update another session after account/route change', async () => {
    const t = setup();
    const done = t.saver.save();
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(1));
    t.deactivate();
    t.firstSave.resolve('report-1');
    await done;
    expect(t.clearBackup).not.toHaveBeenCalled();
    expect(t.onSaved).not.toHaveBeenCalled();
  });

  it('keeps failed saves dirty and backed up, and permits retry', async () => {
    const t = setup();
    const done = t.saver.save();
    const failure = expect(done).rejects.toThrow('Network error');
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(1));
    t.firstSave.reject(new Error('Network error'));
    await failure;
    expect(t.backup).toHaveBeenCalled();
    expect(t.clearBackup).not.toHaveBeenCalled();
    expect(t.onSaved).not.toHaveBeenCalled();
    const retry = t.saver.save();
    t.secondSave.resolve('report-1');
    await retry;
    expect(t.onSaved).toHaveBeenCalledTimes(1);
  });

  it('backs up the latest edit when the older in-flight request fails', async () => {
    const t = setup();
    const done = t.saver.save();
    const failure = expect(done).rejects.toThrow('Network error');
    await vi.waitFor(() => expect(t.persist).toHaveBeenCalledTimes(1));
    t.edit('B typed just before network failure');
    t.firstSave.reject(new Error('Network error'));
    await failure;
    expect(t.backup).toHaveBeenLastCalledWith(expect.objectContaining({ general_notes: 'B typed just before network failure' }));
    expect(t.onSaved).not.toHaveBeenCalled();
    expect(t.clearBackup).not.toHaveBeenCalled();
  });
});
