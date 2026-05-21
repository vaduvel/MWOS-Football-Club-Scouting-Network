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
        : 'mwos-card-tone-danger';

  const valueClass =
    tone === 'ready'
      ? 'text-[var(--color-primary)]'
      : tone === 'review'
        ? 'text-[var(--color-accent)]'
        : 'text-[var(--color-accent-deep)]';

  return (
    <div className={cn('rounded-[18px] border px-3 py-2.5 md:rounded-[20px] md:py-3', shellClass)}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)] md:text-[10px] md:tracking-normal">{label}</p>
      <p className={cn('mt-1.5 text-xl font-black tabular-nums md:mt-2 md:text-2xl', valueClass)}>{value}</p>
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
  const actionClass =
    counts.missingInfo > 0
      ? 'mwos-btn-warning'
      : counts.needsReview > 0
        ? 'mwos-btn-secondary'
        : 'mwos-btn-primary';

  return (
    <section className={cn('rounded-[24px] border p-3.5 shadow-[0_16px_36px_rgba(49,39,131,0.06)] md:rounded-[28px] md:p-5 md:shadow-[0_18px_45px_rgba(49,39,131,0.06)]', statusTone.shell)}>
      <div className="mwos-surface-intro">
        <div className={cn('mwos-surface-intro-icon flex size-10 items-center justify-center rounded-2xl shadow-[0_8px_20px_rgba(15,23,42,0.08)] md:size-11', statusTone.icon)}>
          {statusTone.iconNode}
        </div>
        <div className="mwos-surface-intro-copy">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-mid)] md:text-[11px] md:tracking-normal">Imported review</p>
          <h2 className="mt-1.5 text-balance text-base font-black text-[var(--color-dark)] md:mt-2 md:text-lg">{statusTone.title}</h2>
          <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-[var(--color-mid)]">{statusCopy}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 md:mt-4 md:gap-3">
        <StatusPill label="Ready" value={counts.ready} tone="ready" />
        <StatusPill label="Review" value={counts.needsReview} tone="review" />
        <StatusPill label="Missing" value={counts.missingInfo} tone="missing" />
      </div>

      <div className="mt-3 flex flex-col gap-2.5 md:mt-4 md:flex-row md:items-center md:justify-between md:gap-3">
        <div className="rounded-[18px] border border-white/70 bg-white/80 px-3.5 py-2.5 md:rounded-[20px] md:px-4 md:py-3">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--color-mid)] md:text-[10px] md:tracking-normal">Next action</p>
          <p className="mt-1.5 text-sm font-black text-[var(--color-dark)] md:mt-2">
            {nextReviewDayLabel
              ? `Continue with ${nextReviewDayLabel}`
              : 'Draft review is complete'}
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={onJumpToNextIssue}
            className={cn('mwos-btn', actionClass)}
          >
            {nextReviewDayLabel ? 'Jump to next issue' : 'Open first day'}
            <ArrowRight size={16} />
          </button>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-black text-[var(--color-dark)] md:py-3">
            <ShieldCheck size={16} />
            Read-only review
          </div>
        )}
      </div>
    </section>
  );
}
