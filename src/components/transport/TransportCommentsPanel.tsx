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
    <article className="rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 shadow-[0_18px_45px_rgba(49,39,131,0.06)] md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <MessageSquareText size={20} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-mid)]">
            Transport comments
          </p>
          <h2 className="mt-1 text-xl font-black text-[var(--color-dark)]">Operations thread</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
            Keep departure updates, driver notes and technical feedback attached to the trip instead of in scattered chats.
          </p>
        </div>
      </div>

      {canComment ? (
        <div className="mt-5 rounded-[24px] border border-[var(--color-mid)]/14 bg-[var(--color-light)]/65 p-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            placeholder="Add a logistics note, driver update or coordination message…"
            className="w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[var(--color-primary)]"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || draft.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
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
              className={`rounded-[24px] border p-4 ${
                comment.isAuthor
                  ? 'border-[var(--color-primary)]/18 bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-mid)]/14 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-[var(--color-dark)]">{comment.authorName}</p>
                <span className="rounded-full bg-[var(--color-light)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-mid)]">
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
          <div className="rounded-[24px] border border-[var(--color-mid)]/14 bg-white p-5 text-sm font-semibold text-[var(--color-mid)]">
            No transport comments yet. This is where drivers, admin and technical staff can coordinate the trip.
          </div>
        )}
      </div>
    </article>
  );
}
