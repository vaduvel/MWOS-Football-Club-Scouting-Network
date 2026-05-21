import { useState } from 'react';
import { Loader2, MessageSquareText, Send } from 'lucide-react';
import type { TrainingPlanComment } from '../../lib/trainingData';
import { cn } from '../../lib/utils';

export default function TrainingCommentsPanel({
  comments,
  canComment,
  isSubmitting,
  onSubmit,
  selectedDayLabel,
  dayLabelsById,
}: {
  comments: TrainingPlanComment[];
  canComment: boolean;
  isSubmitting: boolean;
  onSubmit: (value: string) => Promise<void>;
  selectedDayLabel?: string | null;
  dayLabelsById?: Record<string, string>;
}) {
  const [draft, setDraft] = useState('');

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setDraft('');
  };

  return (
    <article className="mwos-mobile-panel mwos-card-tone-staff md:p-6">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon mwos-icon-tone-staff flex h-11 w-11 items-center justify-center rounded-2xl">
          <MessageSquareText size={20} />
        </div>
        <div className="mwos-surface-intro-copy">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
            Training comments
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">Coach and TD discussion</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Technical Director feedback appears here, and important TD comments trigger in-app and email alerts.
          </p>
        </div>
      </div>

      {selectedDayLabel ? (
        <div className="mwos-pill mwos-pill-neutral mt-4 inline-flex items-center">
          Current day · {selectedDayLabel}
        </div>
      ) : null}

      {canComment ? (
        <div className="mwos-mobile-panel-soft mt-5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            placeholder={
              selectedDayLabel
                ? `Add a comment about ${selectedDayLabel.toLowerCase()}...`
                : 'Add a comment or question about this week’s plan…'
            }
            className="mwos-mobile-textarea"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || draft.trim().length === 0}
              className="mwos-btn mwos-btn-primary"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Post comment
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {comments.length ? (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'mwos-subcard',
                comment.isAuthor
                  ? 'mwos-card-tone-training'
                  : comment.authorRoleLabel.toLowerCase().includes('technical')
                    ? 'mwos-card-tone-alert'
                    : 'mwos-subcard-neutral',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-[var(--color-dark)]">{comment.authorName}</p>
                <span
                  className={cn(
                    'mwos-pill',
                    comment.authorRoleLabel.toLowerCase().includes('technical')
                      ? 'mwos-pill-alert'
                      : comment.isAuthor
                        ? 'mwos-pill-training'
                        : 'mwos-pill-neutral',
                  )}
                >
                  {comment.authorRoleLabel}
                </span>
                {comment.dayId ? (
                  <span className="mwos-pill mwos-pill-neutral">
                    {dayLabelsById?.[comment.dayId] || 'Specific day'}
                  </span>
                ) : (
                  <span className="mwos-pill mwos-pill-neutral">
                    Whole plan
                  </span>
                )}
                <span className="text-xs font-semibold text-[var(--color-mid)]">
                  {new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-dark)]">{comment.content}</p>
            </div>
          ))
        ) : (
          <div className="mwos-subcard mwos-subcard-neutral border-dashed p-5">
            <p className="mwos-subcard-copy mt-0">
              No comments yet. This is where the Technical Director can add questions, ideas or adjustments.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
