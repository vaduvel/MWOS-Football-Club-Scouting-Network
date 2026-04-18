export type DraftSyncState = 'offline' | 'local' | 'syncing' | 'synced' | 'error';

export type DraftSyncDetail = {
  state: DraftSyncState;
  message: string;
  timestamp: number;
};

export const DRAFT_SYNC_EVENT = 'mwos:draft-sync';
export const SERVICE_WORKER_UPDATE_EVENT = 'mwos:sw-update-ready';

export function emitDraftSync(detail: Omit<DraftSyncDetail, 'timestamp'>) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<DraftSyncDetail>(DRAFT_SYNC_EVENT, {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
}

export function emitServiceWorkerUpdateReady(registration: ServiceWorkerRegistration) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(SERVICE_WORKER_UPDATE_EVENT, {
      detail: {
        registration,
      },
    }),
  );
}
