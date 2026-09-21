import type { Report } from '../store/report';
import { getReportDraftKey, parseReportDraft, shouldDeleteReportDraft, type DraftRecord } from './reportDraftDomain';

export type { DraftRecord } from './reportDraftDomain';

const DB_NAME = 'mwos-scouting-offline';
const DB_VERSION = 1;
const DRAFT_STORE = 'report-drafts';

const pendingOperations = new Map<string, Promise<unknown>>();

function inDraftOrder<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = pendingOperations.get(key) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(action);
  pendingOperations.set(key, operation);
  const release = () => {
    if (pendingOperations.get(key) === operation) pendingOperations.delete(key);
  };
  void operation.then(release, release);
  return operation;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open draft database.'));
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, setResult: (value: T) => void, fail: (reason?: unknown) => void) => void,
): Promise<T> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    throw new Error('IndexedDB is not available in this browser.');
  }

  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    let transaction: IDBTransaction;
    let result: T;
    let settled = false;
    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      try { transaction?.abort(); } catch { /* The transaction may already be finished. */ }
      database.close();
      reject(reason ?? new Error('Draft transaction failed.'));
    };

    try {
      transaction = database.transaction(DRAFT_STORE, mode);
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        database.close();
        resolve(result);
      };
      transaction.onerror = () => fail(transaction.error);
      transaction.onabort = () => fail(transaction.error ?? new Error('Draft transaction was aborted.'));
      action(transaction.objectStore(DRAFT_STORE), (value) => { result = value; }, fail);
    } catch (error) {
      fail(error);
    }
  });
}

export async function readReportDraft(userId: string, reportId?: string): Promise<DraftRecord | null> {
  const key = getReportDraftKey(userId, reportId);
  return inDraftOrder(key, () => runTransaction<DraftRecord | null>('readonly', (store, setResult, fail) => {
    const request = store.get(key);
    request.onsuccess = () => setResult(parseReportDraft(request.result, userId, reportId));
    request.onerror = () => fail(request.error ?? new Error('Failed to read draft.'));
  }));
}

export async function writeReportDraft(userId: string, report: Report, reportId?: string): Promise<void> {
  const key = getReportDraftKey(userId, reportId);
  const record: DraftRecord = {
    version: 2,
    userId,
    key,
    report: JSON.parse(JSON.stringify(report)) as Report,
    savedAt: new Date().toISOString(),
  };
  if (!parseReportDraft(record, userId, reportId)) {
    throw new Error('The report draft does not match its user or report scope.');
  }
  return inDraftOrder(key, () => runTransaction<void>('readwrite', (store, setResult, fail) => {
    const request = store.put(record);

    request.onsuccess = () => setResult(undefined);
    request.onerror = () => fail(request.error ?? new Error('Failed to save draft.'));
  }));
}

export async function deleteReportDraft(userId: string, reportId?: string, expectedReport?: Report): Promise<void> {
  const key = getReportDraftKey(userId, reportId);
  const expectedSnapshot = expectedReport === undefined ? undefined : JSON.stringify(expectedReport);
  return inDraftOrder(key, () => runTransaction<void>('readwrite', (store, setResult, fail) => {
    const request = store.get(key);
    request.onsuccess = () => {
      if (!shouldDeleteReportDraft(request.result, userId, reportId, expectedSnapshot)) {
        setResult(undefined);
        return;
      }
      // Read, comparison and deletion share one transaction, including across browser tabs.
      const deletion = store.delete(key);
      deletion.onsuccess = () => setResult(undefined);
      deletion.onerror = () => fail(deletion.error ?? new Error('Failed to delete draft.'));
    };
    request.onerror = () => fail(request.error ?? new Error('Failed to read draft before deletion.'));
  }));
}
