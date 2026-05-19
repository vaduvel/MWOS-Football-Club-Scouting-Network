import { Loader2, UploadCloud, X } from 'lucide-react';
import { useMemo } from 'react';

import type { TrainingImportKind } from '../../lib/trainingImportDomain';

function modeLabel(mode: TrainingImportKind) {
  return mode === 'pdf_import' ? 'Import PDF' : mode === 'image_import' ? 'Scan WhatsApp / photo' : 'Create manually';
}

export default function TrainingImportSheet({
  open,
  mode,
  file,
  importing,
  error,
  onClose,
  onSelectFile,
  onImport,
}: {
  open: boolean;
  mode: TrainingImportKind;
  file: File | null;
  importing: boolean;
  error: string;
  onClose: () => void;
  onSelectFile: (file: File | null) => void;
  onImport: () => void;
}) {
  const accept = useMemo(
    () => (mode === 'pdf_import' ? 'application/pdf' : 'image/*'),
    [mode],
  );
  const shellTone =
    mode === 'pdf_import'
      ? 'mwos-card-tone-pdf'
      : mode === 'image_import'
        ? 'mwos-card-tone-scan'
        : 'mwos-card-tone-manual';
  const iconTone =
    mode === 'pdf_import'
      ? 'mwos-icon-tone-pdf'
      : mode === 'image_import'
        ? 'mwos-icon-tone-scan'
        : 'mwos-icon-tone-manual';

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/38 backdrop-blur-[1px]">
      <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="Close import sheet" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-import-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-1rem)] overflow-auto rounded-t-[32px] border border-white/10 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-18px_48px_rgba(15,23,42,0.24)] md:bottom-6 md:left-1/2 md:max-w-xl md:-translate-x-1/2 md:rounded-[32px] md:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Add training update</p>
            <h2 id="training-import-sheet-title" className="mt-2 text-balance text-xl font-black text-[var(--color-dark)] md:text-2xl">{modeLabel(mode)}</h2>
            <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
              {mode === 'pdf_import'
                ? 'Upload a training PDF. We will extract readable text first, then build a draft week for review.'
                : 'Upload a WhatsApp screenshot, whiteboard photo, or handwritten plan. We will OCR the notes and convert them into editable day cards.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close import sheet" className="rounded-2xl border border-[var(--color-mid)]/16 p-2 text-[var(--color-mid)]">
            <X size={18} />
          </button>
        </div>

        <label className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed px-4 py-8 text-center ${shellTone}`}>
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconTone}`}>
            <UploadCloud size={24} />
          </div>
          <p className="mt-4 text-base font-black text-[var(--color-dark)]">
            {file ? file.name : mode === 'pdf_import' ? 'Choose a PDF file' : 'Choose a WhatsApp screenshot or photo'}
          </p>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB ready for import` : 'Tap here to pick the source from your phone or laptop.'}
          </p>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            capture={mode === 'image_import' ? 'environment' : undefined}
            onChange={(event) => onSelectFile(event.target.files?.[0] || null)}
          />
        </label>

        {error ? (
          <div className="mt-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={!file || importing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Build draft
          </button>
        </div>
      </section>
    </div>
  );
}
