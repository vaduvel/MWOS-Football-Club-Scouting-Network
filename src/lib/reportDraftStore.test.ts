import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIndividualReport } from './individualReportDomain';
import { writeReportDraft } from './reportDraftStore';

// Requests succeed before the enclosing IndexedDB transaction commits. Keeping
// those events separate reproduces the previous premature-success regression.
function installControlledDatabase() {
  const transactions: Array<{
    oncomplete?: () => void;
    onabort?: () => void;
    onerror?: () => void;
    error?: Error;
    abort: () => void;
    objectStore: () => { put: (record: unknown) => object };
  }> = [];
  const records: unknown[] = [];
  const close = vi.fn();
  const database = {
    close,
    transaction: () => {
      const transaction = {
        oncomplete: undefined as undefined | (() => void),
        onabort: undefined as undefined | (() => void),
        onerror: undefined as undefined | (() => void),
        error: undefined as Error | undefined,
        abort: () => {},
        objectStore: () => ({
          put: (record: unknown) => {
            records.push(record);
            const request = { onsuccess: undefined as undefined | (() => void) };
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
        }),
      };
      transactions.push(transaction);
      return transaction;
    },
  };
  vi.stubGlobal('window', {
    indexedDB: {
      open: () => {
        const request = { result: database, onsuccess: undefined as undefined | (() => void) };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    },
  });
  return { transactions, records, close };
}

afterEach(() => vi.unstubAllGlobals());

describe('reportDraftStore transaction lifecycle', () => {
  it('waits for commit and serializes same-scope writes in invocation order', async () => {
    const { transactions, records, close } = installControlledDatabase();
    const report = createIndividualReport('QA');
    let firstResolved = false;
    const first = writeReportDraft('scout-commit', report).then(() => { firstResolved = true; });
    const newerReport = { ...report, general_notes: 'Newer draft' };
    const second = writeReportDraft('scout-commit', newerReport);
    // The queued operation must retain the snapshot passed to it.
    newerReport.general_notes = 'Mutated after write invocation';

    await vi.waitFor(() => expect(transactions).toHaveLength(1));
    expect(firstResolved).toBe(false);
    expect(close).not.toHaveBeenCalled();
    transactions[0].oncomplete?.();
    await first;
    expect(close).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => expect(transactions).toHaveLength(2));
    expect(records[1]).toMatchObject({ userId: 'scout-commit', version: 2, report: { general_notes: 'Newer draft' } });
    transactions[1].oncomplete?.();
    await second;
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('rejects an aborted transaction and closes the database after a successful request', async () => {
    const { transactions, close } = installControlledDatabase();
    const write = writeReportDraft('scout-abort', createIndividualReport('QA'));
    const rejected = expect(write).rejects.toThrow('Draft transaction was aborted');
    await vi.waitFor(() => expect(transactions).toHaveLength(1));
    transactions[0].onabort?.();
    await rejected;
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects a mismatched saved report before starting a database transaction', async () => {
    const { transactions } = installControlledDatabase();
    await expect(writeReportDraft('scout-a', { ...createIndividualReport('QA'), id: 'report-a' }, 'report-b'))
      .rejects.toThrow(/does not match/);
    expect(transactions).toHaveLength(0);
  });
});
