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
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[90] px-3 md:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
        {updateReady ? (
          <div className="pointer-events-auto rounded-2xl border border-[var(--color-primary)]/18 bg-white/96 px-4 py-3 shadow-[0_20px_55px_rgba(49,39,131,0.18)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  App Update
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-dark)]">
                  A newer version is ready to install.
                </p>
              </div>
              <button
                type="button"
                onClick={onUpdate}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white"
              >
                <RefreshCcw size={14} />
                Update
              </button>
            </div>
          </div>
        ) : null}

        {installReady ? (
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[rgba(21,18,83,0.92)] px-4 py-3 text-white shadow-[0_20px_55px_rgba(12,16,53,0.24)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/68">Install App</p>
                <p className="mt-1 text-sm font-semibold text-white/92">
                  Add MWOS to the home screen for a cleaner phone workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={onInstall}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-primary)]"
              >
                <Download size={14} />
                Install
              </button>
            </div>
          </div>
        ) : null}

        {showSyncCard && syncDetail ? (
          <div className="pointer-events-auto rounded-2xl border border-[var(--color-mid)]/16 bg-white/96 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-xl p-2 ${
                  syncDetail.state === 'error'
                    ? 'bg-red-100 text-red-700'
                    : syncDetail.state === 'offline'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                }`}
              >
                {syncDetail.state === 'offline' && !online ? <WifiOff size={16} /> : <SyncIcon state={syncDetail.state} />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-mid)]">
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
