import { useState } from 'react';
import { Loader2, MessageSquareText, Send } from 'lucide-react';
import type { TransportPlanComment } from '../../lib/transportData';

export default function TransportCommentsPanel({
  comments,
  canComment,
  isSubmitting,
  onSubmit,
}: {
  comments: TransportPlanComment[];
  canComment: boolean;
  isSubmitting: boolean;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setDraft('');
  };

  return (
    <article className="mwos-mobile-panel md:p-6">
      <div className="mwos-surface-intro">
        <div className="mwos-surface-intro-icon mwos-icon-tone-transport flex h-11 w-11 items-center justify-center rounded-2xl">
          <MessageSquareText size={20} />
        </div>
        <div className="mwos-surface-intro-copy">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]/72">
            Transport comments
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">Operations thread</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Keep departure updates, driver notes and technical feedback attached to the trip instead of in scattered chats.
          </p>
        </div>
      </div>

      {canComment ? (
        <div className="mwos-mobile-panel-soft mt-5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            placeholder="Add a logistics note, driver update or coordination message…"
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
              className={`mwos-subcard ${
                comment.isAuthor
                  ? 'mwos-subcard-transport'
                  : 'mwos-subcard-neutral'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-[var(--color-dark)]">{comment.authorName}</p>
                <span className="mwos-pill mwos-pill-neutral">
                  {comment.authorRoleLabel}
                </span>
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
              No transport comments yet. This is where drivers, admin and technical staff can coordinate the trip.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
