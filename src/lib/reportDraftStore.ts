import type { Report } from '../store/report';

const DB_NAME = 'mwos-scouting-offline';
const DB_VERSION = 1;
const DRAFT_STORE = 'report-drafts';

export type DraftRecord = {
  key: string;
  report: Report;
  savedAt: string;
};

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
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    throw new Error('IndexedDB is not available in this browser.');
  }

  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE, mode);
    const store = transaction.objectStore(DRAFT_STORE);

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Draft transaction failed.'));
    };

    action(store, resolve, reject);
  });
}

export async function readReportDraft(key: string): Promise<DraftRecord | null> {
  return runTransaction<DraftRecord | null>('readonly', (store, resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as DraftRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to read draft.'));
  });
}

export async function writeReportDraft(key: string, report: Report): Promise<void> {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.put({
      key,
      report,
      savedAt: new Date().toISOString(),
    } satisfies DraftRecord);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save draft.'));
  });
}

export async function deleteReportDraft(key: string): Promise<void> {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete draft.'));
  });
}
