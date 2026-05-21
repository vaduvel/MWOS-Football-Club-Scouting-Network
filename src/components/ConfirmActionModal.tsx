import { useEffect, useRef } from 'react';

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'danger' | 'warning';
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [loading, onCancel, open]);

  if (!open) return null;

  const confirmClass =
    tone === 'warning'
      ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)]'
      : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-deep)]';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.52)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-description"
        className="w-full max-w-md rounded-[28px] border border-[var(--color-mid)]/16 bg-white p-5 text-[var(--color-dark)] shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:rounded-[30px] sm:p-6"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--color-mid)]">
          Confirm action
        </p>
        <h2 id="confirm-action-title" className="mt-3 text-2xl font-black leading-tight text-[var(--color-dark)]">
          {title}
        </h2>
        <p id="confirm-action-description" className="mt-3 text-sm font-semibold leading-6 text-[var(--color-mid)]">
          {description}
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-12 rounded-2xl border border-[var(--color-mid)]/18 bg-white px-4 py-3 text-sm font-black text-[var(--color-dark)] transition-colors hover:bg-[var(--color-light)] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-black shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
