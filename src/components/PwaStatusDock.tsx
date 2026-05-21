import { Download, RefreshCcw, WifiOff, Cloud, CloudCheck, CloudOff } from 'lucide-react';
import type { DraftSyncDetail } from '../lib/pwaEvents';

type PwaStatusDockProps = {
  online: boolean;
  syncDetail: DraftSyncDetail | null;
  installReady: boolean;
  updateReady: boolean;
  onInstall: () => void;
  onUpdate: () => void;
};

function SyncIcon({ state }: { state: DraftSyncDetail['state'] }) {
  if (state === 'offline') return <CloudOff size={16} />;
  if (state === 'syncing') return <Cloud size={16} className="animate-pulse" />;
  return <CloudCheck size={16} />;
}

export default function PwaStatusDock({
  online,
  syncDetail,
  installReady,
  updateReady,
  onInstall,
  onUpdate,
}: PwaStatusDockProps) {
  const showSyncCard =
    !online ||
    (syncDetail &&
      ['offline', 'local', 'syncing', 'synced', 'error'].includes(syncDetail.state));

  if (!showSyncCard && !installReady && !updateReady) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 px-3 md:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
        {updateReady ? (
          <div className="pointer-events-auto mwos-mobile-panel border-[var(--color-primary)]/18 bg-white/96 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="mwos-subcard-kicker text-[var(--color-primary)]">
                  App Update
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-dark)]">
                  A newer version is ready to install.
                </p>
              </div>
              <button
                type="button"
                onClick={onUpdate}
                className="mwos-btn mwos-btn-primary shrink-0 px-3 py-2 text-xs"
              >
                <RefreshCcw size={14} />
                Update
              </button>
            </div>
          </div>
        ) : null}

        {installReady ? (
          <div className="pointer-events-auto mwos-mobile-panel border-white/10 bg-[rgba(21,18,83,0.92)] text-white backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="mwos-subcard-kicker text-white/68">Install App</p>
                <p className="mt-1 text-sm font-semibold text-white/92">
                  Add MWOS to the home screen for a cleaner phone workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={onInstall}
                className="mwos-btn mwos-btn-secondary shrink-0 px-3 py-2 text-xs"
              >
                <Download size={14} />
                Install
              </button>
            </div>
          </div>
        ) : null}

        {showSyncCard && syncDetail ? (
          <div className="pointer-events-auto mwos-mobile-panel border-[var(--color-mid)]/16 bg-white/96 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-xl p-2 ${
                  syncDetail.state === 'error'
                    ? 'mwos-icon-tone-danger'
                    : syncDetail.state === 'offline'
                      ? 'mwos-icon-tone-alert'
                      : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                }`}
              >
                {syncDetail.state === 'offline' && !online ? <WifiOff size={16} /> : <SyncIcon state={syncDetail.state} />}
              </div>
              <div className="min-w-0">
                <p className="mwos-subcard-kicker">
                  {syncDetail.state === 'syncing'
                    ? 'Syncing'
                    : syncDetail.state === 'synced'
                      ? 'Synced'
                      : syncDetail.state === 'error'
                        ? 'Sync Error'
                        : 'Offline Draft'}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-dark)]">{syncDetail.message}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
