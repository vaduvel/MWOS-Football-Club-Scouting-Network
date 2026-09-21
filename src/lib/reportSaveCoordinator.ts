import type { Report } from '../store/report';

type ReportSaveOptions = {
  isActive: () => boolean;
  getLatest: () => Report;
  backup: (report: Report) => Promise<void>;
  persist: (report: Report) => Promise<string>;
  clearBackup: (savedId: string, snapshot: Report) => Promise<void>;
  onSaved: (savedId: string, snapshot: Report) => void;
};

/** One writer per editor session. Only the latest acknowledged snapshot is clean. */
export function createReportSaveCoordinator(options: ReportSaveOptions) {
  let inFlight: Promise<void> | null = null;

  async function flushLatest() {
    while (options.isActive()) {
      // Report store updates are immutable, including undo/redo.
      const snapshot = options.getLatest();
      await options.backup(snapshot);
      if (!options.isActive()) return;
      let savedId: string;
      try {
        savedId = await options.persist(snapshot);
      } catch (error) {
        // Preserve typing that happened after this request started, even if its
        // regular debounced browser backup has not run yet.
        if (options.isActive() && options.getLatest() !== snapshot) {
          await options.backup(options.getLatest());
        }
        throw error;
      }
      if (!options.isActive()) return;
      if (options.getLatest() !== snapshot) continue;

      await options.clearBackup(savedId, snapshot);
      if (!options.isActive()) return;
      // A user may also type while IndexedDB cleanup is committing.
      if (options.getLatest() !== snapshot) continue;
      options.onSaved(savedId, snapshot);
      return;
    }
  }

  return {
    save(): Promise<void> {
      if (!inFlight) {
        inFlight = flushLatest().finally(() => { inFlight = null; });
      }
      return inFlight;
    },
  };
}
