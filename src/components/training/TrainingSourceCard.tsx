import { Eye, FilePenLine, FileSearch, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../../lib/utils';

export default function TrainingSourceCard({
  source,
  canManage,
  onViewSource,
  onReplaceSource,
  onClearSource,
}: {
  source: {
    sourceKind: string;
    fileName: string;
    previewText: string;
    extractionStatus: string;
  } | null;
  canManage: boolean;
  onViewSource: () => void;
  onReplaceSource: () => void;
  onClearSource: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!source) {
    return null;
  }

  const isImageImport = source.sourceKind === 'image_import';
  const toneClasses = isImageImport
    ? {
        shell: 'mwos-card-tone-scan',
        chip: 'mwos-chip-tone-transport',
      }
    : {
        shell: 'mwos-card-tone-pdf',
        chip: 'mwos-chip-tone-training',
      };
  const extractionLabel = source.extractionStatus.replaceAll('_', ' ');

  return (
    <article className={cn('rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5', toneClasses.shell)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-mid)]">Imported source</p>
          <h2 className="mt-2 text-balance text-lg font-black text-[var(--color-dark)] md:text-xl">{source.fileName || 'Training source'}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
            <span className={cn('rounded-full px-3 py-1', toneClasses.chip)}>
              {isImageImport ? 'WhatsApp / photo scan' : 'PDF import'}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[var(--color-mid)]">
              {extractionLabel}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[var(--color-mid)]">
              Original kept attached
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
          <FileSearch size={14} />
          Review before publish
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/80 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)]">Extracted preview</p>
        <p className={cn('mt-3 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]', !expanded && 'line-clamp-4')}>
          {source.previewText || 'No extracted preview yet.'}
        </p>
        {source.previewText ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-3 text-sm font-black text-[var(--color-primary)]"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={onViewSource}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] sm:w-auto"
          aria-label="View original training source"
        >
          <Eye size={16} />
          View source
        </button>
        {canManage ? (
          <>
            <button
              type="button"
              onClick={onReplaceSource}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-mid)]/16 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] sm:w-auto"
              aria-label="Replace imported training source"
            >
              <FilePenLine size={16} />
              Replace / re-scan
            </button>
            <button
              type="button"
              onClick={onClearSource}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 sm:w-auto"
              aria-label="Clear imported training source"
            >
              <Trash2 size={16} />
              Clear import
            </button>
          </>
        ) : null}
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-mid)]">
        The original file stays attached for review until you clear the import.
      </p>
    </article>
  );
}
