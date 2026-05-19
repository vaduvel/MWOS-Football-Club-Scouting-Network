import { useEffect, useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import { addReportComment, deleteReportComment, fetchReportComments, userHasRole, type ReportComment } from '../../lib/data';
import { useAuthStore } from '../../store/auth';

function formatTimestamp(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export default function CommentsTab({ reportId }: { reportId?: string }) {
  const { user } = useAuthStore();
  const isAdmin = userHasRole(user, 'admin');

  const [comments, setComments] = useState<ReportComment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(Boolean(reportId));
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<ReportComment | null>(null);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setComments([]);
      return;
    }

    let isMounted = true;

    void (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchReportComments(reportId);
        if (!isMounted) return;
        setComments(result);
      } catch (loadError: any) {
        if (!isMounted) return;
        console.error('Failed to load report comments.', loadError);
        setError(loadError.message || 'Failed to load comments.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const handleSubmit = async () => {
    if (!reportId || !draft.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const nextComment = await addReportComment(reportId, draft);
      setComments((current) => [nextComment, ...current]);
      setDraft('');
    } catch (submitError: any) {
      console.error('Failed to add comment.', submitError);
      setError(submitError.message || 'Failed to add comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (comment: ReportComment) => {
    setError('');
    setCommentDeleteTarget(comment);
  };

  const handleConfirmDelete = async () => {
    if (!commentDeleteTarget) return;

    const comment = commentDeleteTarget;
    setDeletingId(comment.id);
    setError('');
    try {
      await deleteReportComment(comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setCommentDeleteTarget(null);
    } catch (deleteError: any) {
      console.error('Failed to delete comment.', deleteError);
      setError(deleteError.message || 'Failed to delete comment.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!reportId) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--color-mid)]/25 bg-white p-5 text-center shadow-sm md:rounded-[28px] md:p-8">
        <MessageSquare size={34} className="mx-auto text-[var(--color-mid)]/55 md:h-[42px] md:w-[42px]" />
        <h2 className="mt-3 text-xl font-black leading-tight text-[var(--color-dark)] md:mt-4 md:text-2xl">
          Save the report to unlock comments
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-mid)]">
          Save first, then add notes and follow-up comments.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-[24px] border border-[var(--color-mid)]/20 bg-white shadow-[0_16px_45px_rgba(49,39,131,0.06)] md:rounded-[28px]">
        <div className="border-b border-[var(--color-mid)]/12 bg-[var(--color-light)]/40 p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[var(--color-dark)] md:text-2xl">Report Comments</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-mid)]">
                Keep follow-up notes and match discussion in one place.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--color-primary)]/8 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
              {comments.length} comments
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-[22px] border border-[var(--color-primary)]/14 bg-[linear-gradient(180deg,rgba(49,39,131,0.05),rgba(255,255,255,1))] p-4 md:rounded-[24px] md:p-5">
            <label className="block text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-mid)]">
              Add note
            </label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              placeholder="Add a scouting follow-up, internal remark or action item..."
              className="mt-3 w-full rounded-2xl border border-[var(--color-mid)]/18 bg-white p-4 text-sm font-semibold text-[var(--color-dark)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none md:resize-y"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting || !draft.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(49,39,131,0.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send size={16} />
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="rounded-2xl border border-[var(--color-mid)]/16 bg-[var(--color-light)]/60 p-5 text-sm font-semibold text-[var(--color-mid)]">
                Loading comments...
              </div>
            )}

            {!loading &&
              comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-[22px] border border-[var(--color-mid)]/14 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.03)] md:rounded-[24px] md:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-[var(--color-dark)]">
                        {comment.authorName}
                        <span className="ml-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-mid)]">
                          {comment.authorEmail}
                        </span>
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-mid)]">
                        {formatTimestamp(comment.createdAt)}
                      </p>
                    </div>

                    {(comment.isAuthor || isAdmin) && (
                      <button
                        onClick={() => handleRequestDelete(comment)}
                        disabled={deletingId === comment.id}
                        className="rounded-full border border-[var(--color-mid)]/18 p-2 text-[var(--color-mid)] transition-colors hover:border-[var(--color-accent)]/25 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--color-dark)] md:leading-7">{comment.content}</p>
                </article>
              ))}

            {!loading && comments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--color-mid)]/25 bg-[var(--color-light)]/55 p-8 text-center">
                <MessageSquare size={40} className="mx-auto text-[var(--color-mid)]/55" />
                <p className="mt-4 text-lg font-black text-[var(--color-dark)]">No comments yet</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-mid)]">
                  Start the first follow-up note for this match report.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <ConfirmActionModal
        open={Boolean(commentDeleteTarget)}
        title="Delete comment?"
        description="This comment will be removed from the report discussion. This cannot be undone."
        confirmLabel="Delete comment"
        loading={Boolean(deletingId)}
        onCancel={() => setCommentDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
