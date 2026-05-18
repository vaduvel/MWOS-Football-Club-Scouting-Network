import { AlertTriangle, ArrowRight, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react';

import type { TrainingPlanDay } from '../../lib/trainingData';
import { cn } from '../../lib/utils';

type ReviewSummaryCounts = {
  ready: number;
  needsReview: number;
  missingInfo: number;
};

function countReviewStates(days: TrainingPlanDay[]): ReviewSummaryCounts {
  return days.reduce(
    (acc, day) => {
      if (!day.importedExcerpt && day.importReviewState !== 'missing_info' && day.importReviewState !== 'needs_review') {
        return acc;
      }

      if (day.importReviewState === 'missing_info') {
        acc.missingInfo += 1;
        return acc;
      }

      if (day.importReviewState === 'needs_review') {
        acc.needsReview += 1;
        return acc;
      }

      acc.ready += 1;
      return acc;
    },
    { ready: 0, needsReview: 0, missingInfo: 0 } satisfies ReviewSummaryCounts,
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ready' | 'review' | 'missing';
}) {
  const shellClass =
    tone === 'ready'
      ? 'mwos-card-tone-training'
      : tone === 'review'
        ? 'mwos-card-tone-alert'
        : 'border-rose-200 bg-rose-50/85';

  const valueClass =
    tone === 'ready'
      ? 'text-emerald-700'
      : tone === 'review'
        ? 'text-amber-700'
        : 'text-rose-700';

  return (
    <div className={cn('rounded-[20px] border px-3 py-3', shellClass)}>
      <p className="text-[10px] font-black uppercase text-[var(--color-mid)]">{label}</p>
      <p className={cn('mt-2 text-2xl font-black tabular-nums', valueClass)}>{value}</p>
    </div>
  );
}

export default function TrainingReviewSummaryCard({
  days,
  nextReviewDayLabel,
  canManage,
  onJumpToNextIssue,
}: {
  days: TrainingPlanDay[];
  nextReviewDayLabel: string | null;
  canManage: boolean;
  onJumpToNextIssue: () => void;
}) {
  const counts = countReviewStates(days);
  const hasImportedDraft = counts.ready + counts.needsReview + counts.missingInfo > 0;

  if (!hasImportedDraft) {
    return null;
  }

  const statusCopy =
    counts.missingInfo > 0
      ? `${counts.missingInfo} day${counts.missingInfo === 1 ? '' : 's'} still need manual completion before publish.`
      : counts.needsReview > 0
        ? `${counts.needsReview} imported day${counts.needsReview === 1 ? '' : 's'} should be checked before publish.`
        : 'All imported days look ready. You can still fine-tune details before publishing.';

  const statusTone =
    counts.missingInfo > 0
      ? {
          shell: 'mwos-card-tone-alert',
          icon: 'mwos-icon-tone-alert',
          title: 'Imported draft needs attention',
          iconNode: <AlertTriangle size={18} />,
        }
      : counts.needsReview > 0
        ? {
            shell: 'mwos-card-tone-alert',
            icon: 'mwos-icon-tone-alert',
            title: 'Imported draft is ready for review',
            iconNode: <FileSearch size={18} />,
          }
        : {
            shell: 'mwos-card-tone-training',
            icon: 'mwos-icon-tone-training',
            title: 'Imported draft looks publishable',
            iconNode: <CheckCircle2 size={18} />,
          };

  return (
    <section className={cn('rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-5', statusTone.shell)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex size-11 items-center justify-center rounded-2xl shadow-[0_8px_20px_rgba(15,23,42,0.08)]', statusTone.icon)}>
          {statusTone.iconNode}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase text-[var(--color-mid)]">Imported review</p>
          <h2 className="mt-2 text-balance text-lg font-black text-[var(--color-dark)]">{statusTone.title}</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">{statusCopy}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatusPill label="Ready" value={counts.ready} tone="ready" />
        <StatusPill label="Review" value={counts.needsReview} tone="review" />
        <StatusPill label="Missing" value={counts.missingInfo} tone="missing" />
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="rounded-[20px] border border-white/70 bg-white/80 px-4 py-3">
          <p className="text-[10px] font-black uppercase text-[var(--color-mid)]">Next action</p>
          <p className="mt-2 text-sm font-black text-[var(--color-dark)]">
            {nextReviewDayLabel
              ? `Continue with ${nextReviewDayLabel}`
              : 'Draft review is complete'}
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={onJumpToNextIssue}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-black text-white"
          >
            {nextReviewDayLabel ? 'Jump to next issue' : 'Open first day'}
            <ArrowRight size={16} />
          </button>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-black text-[var(--color-dark)]">
            <ShieldCheck size={16} />
            Read-only review
          </div>
        )}
      </div>
    </section>
  );
}
